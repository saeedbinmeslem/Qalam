'use client';

/**
 * @file background-jobs.tsx
 * @description شريط العمليات الخلفية في لوحة التحكم: يعرض الجاري والمنتهي حديثًا (نجاحًا أو فشلًا) دون حجب التصفح.
 * يستعلم دوريًا (أسرع أثناء العمل)، وعند انتهاء عملية يحدّث الصفحة ليظهر المحتوى المولَّد.
 * يعيش في هيكل اللوحة فيبقى ظاهرًا وحيًّا أثناء الانتقال بين صفحاتها.
 */
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

interface JobView {
  id: string;
  label: string;
  status: 'running' | 'done' | 'failed';
  message: string;
  startedAt: string;
  finishedAt: string | null;
}

const FAST_MS = 3000;
const IDLE_MS = 20000;
/** المنتهية تبقى ظاهرة هذه المدة بعد انتهائها */
const KEEP_FINISHED_MS = 10 * 60_000;

export function BackgroundJobs() {
  const router = useRouter();
  const [jobs, setJobs] = useState<JobView[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const running = useRef<Set<string>>(new Set());

  const poll = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/admin/jobs', { cache: 'no-store' });
      if (!response.ok) return false;
      const { jobs: next } = (await response.json()) as { jobs: JobView[] };
      const nowRunning = new Set(next.filter((j) => j.status === 'running').map((j) => j.id));
      // انتهت عملية كانت جارية: نحدّث بيانات الصفحة الحالية
      if ([...running.current].some((id) => !nowRunning.has(id))) router.refresh();
      running.current = nowRunning;
      setJobs(next);
      return nowRunning.size > 0;
    } catch {
      return false;
    }
  }, [router]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    const tick = async () => {
      const busy = await poll();
      if (!stopped) timer = setTimeout(tick, busy ? FAST_MS : IDLE_MS);
    };
    void tick();
    // بعد إرسال أي نموذج نستعلم سريعًا لالتقاط العملية التي بدأت للتو
    const onSubmit = () => setTimeout(() => void poll(), 1200);
    document.addEventListener('submit', onSubmit, true);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener('submit', onSubmit, true);
    };
  }, [poll]);

  const now = Date.now();
  const visible = jobs.filter(
    (j) =>
      !dismissed.has(j.id) &&
      (j.status === 'running' || (j.finishedAt !== null && now - new Date(j.finishedAt).getTime() < KEEP_FINISHED_MS)),
  );
  if (visible.length === 0) return null;

  return (
    <div className="mb-6 space-y-2" aria-live="polite">
      {visible.map((job) => (
        <div
          key={job.id}
          className={`flex items-start justify-between gap-3 rounded-md p-3 text-sm ${
            job.status === 'failed' ? 'bg-error-container text-on-error-container' : 'bg-surface-container text-ink'
          }`}
        >
          <p>
            {job.status === 'running' ? '⏳ ' : job.status === 'done' ? '✓ ' : '⚠ '}
            <span className="font-medium">{job.label}</span>
            {job.status === 'running' ? ' — تعمل في الخلفية، يمكنك التنقل والتعديل بحرية.' : job.message ? ` — ${job.message}` : ''}
          </p>
          {job.status !== 'running' ? (
            <button
              type="button"
              className="shrink-0 text-xs underline"
              onClick={() => setDismissed((d) => new Set(d).add(job.id))}
            >
              إخفاء
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
