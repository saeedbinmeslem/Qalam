/**
 * @file admin-background-jobs.usecases.ts
 * @description دورة حياة العملية الخلفية: بدء (مع منع التكرار)، إنهاء بنجاح أو فشل، وعرض الأخيرة.
 * لا تعرف كيف يُشغَّل العمل نفسه (ذاك في الواجهة عبر `after`) بل تسجّل حالته فقط.
 * العملية «العالقة» (تجاوزت المهلة القصوى دون إنهاء، لأن الخادم أُوقف) تُعدّ فاشلة ولا تمنع غيرها.
 */

import { requireAdmin, type AdminDeps, type AdminRequest } from './admin-deps.js';
import type { BackgroundJob, BackgroundJobPort } from '../../ports/background-job.port.js';

/** أطول من مهلة الدالة (300ث) بهامش: بعدها تُعدّ العملية العالقة منتهية بفشل */
export const STALE_JOB_MS = 6 * 60_000;
/** كم من العمليات المنتهية تُعرض */
const RECENT_LIMIT = 8;

export interface BackgroundJobDeps extends AdminDeps {
  jobs: BackgroundJobPort;
}

const isStale = (job: BackgroundJob, now: number) => job.status === 'running' && now - job.startedAt.getTime() > STALE_JOB_MS;

export class StartBackgroundJobUseCase {
  constructor(
    private readonly deps: BackgroundJobDeps,
    private readonly now: () => number = () => Date.now(),
  ) {}

  async execute(request: AdminRequest & { key: string; label: string }): Promise<{ jobId: string }> {
    requireAdmin(this.deps.policy, request.actor);
    const now = this.now();
    const recent = await this.deps.jobs.findRecent(50);
    const running = recent.find((j) => j.key === request.key && j.status === 'running' && !isStale(j, now));
    if (running) throw new Error(`«${running.label}» تعمل الآن في الخلفية. انتظر انتهاءها`);

    const job: BackgroundJob = {
      id: this.deps.ids.next('job'),
      key: request.key,
      label: request.label,
      status: 'running',
      message: '',
      startedAt: new Date(now),
    };
    await this.deps.jobs.save(job);
    return { jobId: job.id };
  }
}

export class FinishBackgroundJobUseCase {
  constructor(
    private readonly deps: Pick<BackgroundJobDeps, 'jobs'>,
    private readonly now: () => number = () => Date.now(),
  ) {}

  /** تُستدعى من الخلفية بعد التحقق من الصلاحية عند البدء، فلا تحتاج مستخدمًا */
  async execute(request: { jobId: string; status: 'done' | 'failed'; message: string }): Promise<void> {
    const job = await this.deps.jobs.findById(request.jobId);
    if (!job) return;
    await this.deps.jobs.save({ ...job, status: request.status, message: request.message, finishedAt: new Date(this.now()) });
  }
}

export class ListBackgroundJobsUseCase {
  constructor(
    private readonly deps: BackgroundJobDeps,
    private readonly now: () => number = () => Date.now(),
  ) {}

  async execute(request: AdminRequest): Promise<BackgroundJob[]> {
    requireAdmin(this.deps.policy, request.actor);
    const now = this.now();
    return (await this.deps.jobs.findRecent(RECENT_LIMIT)).map((job) =>
      isStale(job, now)
        ? { ...job, status: 'failed' as const, message: 'توقفت العملية قبل أن تنتهي (انتهت مهلة الخادم). أعد تشغيلها لإكمال الباقي', finishedAt: new Date(job.startedAt.getTime() + STALE_JOB_MS) }
        : job,
    );
  }
}
