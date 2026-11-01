'use client';

/**
 * @file background-jobs.tsx
 * @description العمليات الخلفية في لوحة التحكم دون حجب التصفح:
 * - `BackgroundJobs` (في هيكل اللوحة): شريط يعرض الجاري والمنتهي حديثًا (نجاحًا أو فشلًا) ومعه مؤشر القلم ما دامت جارية.
 * - `JobLoader` (داخل النموذج): يُبقي مؤشر القلم تحت الزر طوال عمل العملية، بدل أن يختفي لحظة عودة الإجراء
 *   (الإجراء يعود فورًا والعمل يكمل في الخلفية).
 * يستعلم الشريط دوريًا (أسرع أثناء العمل)، ويبثّ النتيجة لـJobLoader، وعند انتهاء عملية يحدّث الصفحة.
 */
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { QalamLoader } from './brand';

interface JobView {
  id: string;
  key: string;
  label: string;
  status: 'running' | 'done' | 'failed';
  message: string;
  startedAt: string;
  finishedAt: string | null;
}

const JOBS_EVENT = 'qalam:jobs';
const FAST_MS = 3000;
const IDLE_MS = 20000;
/** المنتهية تبقى ظاهرة هذه المدة بعد انتهائها */
const KEEP_FINISHED_MS = 10 * 60_000;
/** بعد إرسال نموذج: استعلامات سريعة تلتقط العملية التي بدأت للتو */
const AFTER_SUBMIT_POLLS_MS = [1200, 3000, 6000];
/** أطول انتظار لظهور العملية في السجل بعد الإرسال قبل أن نعدّ أنها لم تبدأ */
const EXPECT_JOB_MS = 8000;

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
      window.dispatchEvent(new CustomEvent<JobView[]>(JOBS_EVENT, { detail: next }));
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
    const onSubmit = () => AFTER_SUBMIT_POLLS_MS.forEach((ms) => setTimeout(() => void poll(), ms));
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
            job.status === 'failed' ? 'bg-error-container text-on-error-container' : 'bg-surface-container text-on-surface'
          }`}
        >
          <div className="flex items-start gap-3">
            {job.status === 'running' ? (
              <div className="shrink-0" aria-hidden="true">
                <QalamLoader scale={0.4} label="" />
              </div>
            ) : null}
            <p>
              {job.status === 'done' ? '✓ ' : job.status === 'failed' ? '⚠ ' : ''}
              <span className="font-medium">{job.label}</span>
              {job.status === 'running' ? ' — تعمل في الخلفية، يمكنك التنقل والتعديل بحرية.' : job.message ? ` — ${job.message}` : ''}
            </p>
          </div>
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

/**
 * مؤشر القلم داخل النموذج يبقى حتى تنتهي العملية الخلفية ذات المفتاح `matchKey`.
 * أثناء إرسال النموذج يعرض InlinePending مؤشره، وبعد عودة الإجراء (فورًا) يتسلّم هذا المكوّن فلا يختفي المؤشر.
 */
export function JobLoader({ matchKey, label }: { matchKey: string; label: string }) {
  const { pending } = useFormStatus();
  const anchor = useRef<HTMLDivElement>(null);
  const submittedAt = useRef(0);
  const [active, setActive] = useState(false);
  const [expecting, setExpecting] = useState(false);

  useEffect(() => {
    const onSubmit = (event: Event) => {
      const form = anchor.current?.closest('form');
      if (form && event.target === form) {
        submittedAt.current = Date.now();
        setExpecting(true);
      }
    };
    const onJobs = (event: Event) => {
      const jobs = (event as CustomEvent<JobView[]>).detail;
      const match = jobs.some((j) => j.key === matchKey && j.status === 'running');
      setActive(match);
      if (match) setExpecting(false);
      else if (Date.now() - submittedAt.current > EXPECT_JOB_MS) setExpecting(false);
    };
    document.addEventListener('submit', onSubmit, true);
    window.addEventListener(JOBS_EVENT, onJobs);
    return () => {
      document.removeEventListener('submit', onSubmit, true);
      window.removeEventListener(JOBS_EVENT, onJobs);
    };
  }, [matchKey]);

  return (
    <div ref={anchor}>
      {!pending && (active || expecting) ? (
        <div className="mt-4">
          <QalamLoader scale={0.6} label={label} />
        </div>
      ) : null}
    </div>
  );
}
