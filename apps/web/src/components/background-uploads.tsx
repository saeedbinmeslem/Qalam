'use client';

/**
 * @file background-uploads.tsx
 * @description رفع صور الغلاف في الخلفية مع نسبة التقدم، دون ربطه بالصفحة المفتوحة:
 * - المخزن (`startCoverUpload`) على مستوى الوحدة، فيبقى الرفع جاريًا إن تنقّل المدير بين صفحات اللوحة.
 * - عند انتهاء الرفع يُحفظ الغلاف تلقائيًا في المسار/الكورس (`saveUploadedCoverAction`) ثم تُحدَّث الصفحة.
 * - `BackgroundUploads` (في هيكل اللوحة): شريط يعرض كل رفع جارٍ أو منتهٍ مع نسبته.
 * - `useCoverUpload(key)`: لحقل الغلاف ليرى حالة رفعه ويتسلّم الرابط عند الانتهاء.
 */
import { useRouter } from 'next/navigation';
import { useEffect, useSyncExternalStore } from 'react';
import { saveUploadedCoverAction } from '../app/admin/actions';
import { uploadImage } from './cloudinary-upload';

export interface CoverTarget {
  pathId: string;
  /** غائب = غلاف المسار نفسه */
  courseId?: string | undefined;
}

export interface UploadView {
  key: string;
  label: string;
  phase: 'uploading' | 'saving' | 'done' | 'failed';
  percent: number;
  message: string;
  /** الرابط المحفوظ عند النجاح */
  url: string;
}

const uploads = new Map<string, UploadView>();
const listeners = new Set<() => void>();
let snapshot: UploadView[] = [];

function publish(): void {
  snapshot = [...uploads.values()];
  listeners.forEach((notify) => notify());
}

function patch(key: string, change: Partial<UploadView>): void {
  const current = uploads.get(key);
  if (current) uploads.set(key, { ...current, ...change });
  publish();
}

export const coverKey = (target: CoverTarget): string => `cover:${target.pathId}:${target.courseId ?? ''}`;

/** يبدأ رفع الصورة في الخلفية ويعود فورًا؛ رفع ثانٍ لنفس الغلاف أثناء الجاري يُتجاهل */
export function startCoverUpload(target: CoverTarget, label: string, file: File): void {
  const key = coverKey(target);
  if (uploads.get(key)?.phase === 'uploading' || uploads.get(key)?.phase === 'saving') return;
  uploads.set(key, { key, label, phase: 'uploading', percent: 0, message: '', url: '' });
  publish();
  void (async () => {
    try {
      const url = await uploadImage(file, (percent) => patch(key, { percent }));
      patch(key, { phase: 'saving', percent: 100 });
      const saved = await saveUploadedCoverAction(target.pathId, target.courseId ?? null, url);
      if (saved.error) patch(key, { phase: 'failed', message: saved.error });
      else patch(key, { phase: 'done', url });
    } catch (error) {
      patch(key, { phase: 'failed', message: error instanceof Error ? error.message : 'فشل الرفع' });
    }
  })();
}

function dismiss(key: string): void {
  uploads.delete(key);
  publish();
}

function subscribe(notify: () => void): () => void {
  listeners.add(notify);
  return () => listeners.delete(notify);
}

const useUploads = (): UploadView[] =>
  useSyncExternalStore(subscribe, () => snapshot, () => []);

/** حالة رفع غلاف معيّن (undefined إن لم يبدأ) */
export function useCoverUpload(key: string): UploadView | undefined {
  return useUploads().find((u) => u.key === key);
}

const PHASE_TEXT: Record<UploadView['phase'], string> = {
  uploading: 'جارٍ الرفع',
  saving: 'جارٍ حفظ الغلاف',
  done: 'تم الرفع والحفظ',
  failed: 'فشل الرفع',
};

export function BackgroundUploads() {
  const router = useRouter();
  const items = useUploads();
  const doneCount = items.filter((u) => u.phase === 'done').length;

  // انتهاء رفع يحفظ الغلاف على الخادم؛ نحدّث الصفحة الحالية لتعرضه
  useEffect(() => {
    if (doneCount > 0) router.refresh();
  }, [doneCount, router]);

  if (items.length === 0) return null;
  return (
    <div className="mb-6 space-y-2" aria-live="polite">
      {items.map((u) => {
        const active = u.phase === 'uploading' || u.phase === 'saving';
        return (
          <div
            key={u.key}
            className={`rounded-md p-3 text-sm ${u.phase === 'failed' ? 'bg-error-container text-on-error-container' : 'bg-surface-container text-on-surface'}`}
          >
            <div className="flex items-start justify-between gap-3">
              <p>
                <span className="font-medium">غلاف «{u.label}»</span> — {PHASE_TEXT[u.phase]}
                {u.phase === 'uploading' ? ` ${u.percent}%` : ''}
                {u.phase === 'failed' && u.message ? `: ${u.message}` : ''}
                {active ? ' — يعمل في الخلفية، يمكنك التنقل والتعديل بحرية.' : ''}
              </p>
              {!active ? (
                <button type="button" className="shrink-0 text-xs underline" onClick={() => dismiss(u.key)}>
                  إخفاء
                </button>
              ) : null}
            </div>
            {active ? (
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={u.percent}
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-outline-variant"
              >
                <div className="h-full bg-primary transition-[width]" style={{ width: `${u.percent}%` }} />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
