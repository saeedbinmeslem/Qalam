import { AdminPolicy } from '@qalam/domain';
import { describe, expect, it } from 'vitest';
import { ForbiddenError } from '../../errors.js';
import type { BackgroundJob, BackgroundJobPort } from '../../ports/background-job.port.js';
import {
  FinishBackgroundJobUseCase,
  ListBackgroundJobsUseCase,
  ReportJobProgressUseCase,
  STALE_JOB_MS,
  StartBackgroundJobUseCase,
  type BackgroundJobDeps,
} from './admin-background-jobs.usecases.js';

class Jobs implements BackgroundJobPort {
  store = new Map<string, BackgroundJob>();
  async save(job: BackgroundJob) {
    this.store.set(job.id, job);
  }
  async findById(id: string) {
    return this.store.get(id) ?? null;
  }
  async findRecent(limit: number) {
    return [...this.store.values()].sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime()).slice(0, limit);
  }
}

const admin = { id: 'u1', email: 'owner@qalam.dev' };

function setup() {
  let n = 0;
  const deps = {
    jobs: new Jobs(),
    ids: { next: (p: string) => `${p}-${++n}` },
    policy: AdminPolicy.fromList('owner@qalam.dev'),
  } as unknown as BackgroundJobDeps;
  return deps;
}

describe('العمليات الخلفية', () => {
  it('تبدأ جارية ثم تنتهي بنجاح أو فشل', async () => {
    const deps = setup();
    const { jobId } = await new StartBackgroundJobUseCase(deps).execute({ actor: admin, key: 'k', label: 'عمل' });
    expect((await deps.jobs.findById(jobId))?.status).toBe('running');

    await new FinishBackgroundJobUseCase(deps).execute({ jobId, status: 'failed', message: 'حصة منتهية' });
    expect(await deps.jobs.findById(jobId)).toMatchObject({ status: 'failed', message: 'حصة منتهية' });
  });

  it('يمنع تشغيل عمليتين بنفس المفتاح معًا، ويسمح بعد الانتهاء', async () => {
    const deps = setup();
    const start = new StartBackgroundJobUseCase(deps);
    const { jobId } = await start.execute({ actor: admin, key: 'k', label: 'عمل' });
    await expect(start.execute({ actor: admin, key: 'k', label: 'عمل' })).rejects.toThrow('تعمل الآن');
    await start.execute({ actor: admin, key: 'other', label: 'آخر' });

    await new FinishBackgroundJobUseCase(deps).execute({ jobId, status: 'done', message: '' });
    await expect(start.execute({ actor: admin, key: 'k', label: 'عمل' })).resolves.toBeDefined();
  });

  it('العملية العالقة (تجاوزت المهلة) تُعرض فاشلة ولا تمنع غيرها', async () => {
    const deps = setup();
    let clock = 0;
    const start = new StartBackgroundJobUseCase(deps, () => clock);
    await start.execute({ actor: admin, key: 'k', label: 'عمل' });
    clock = STALE_JOB_MS + 1;

    await expect(start.execute({ actor: admin, key: 'k', label: 'عمل' })).resolves.toBeDefined();
    const listed = await new ListBackgroundJobsUseCase(deps, () => clock).execute({ actor: admin });
    expect(listed.find((j) => j.status === 'failed')?.message).toContain('توقفت');
  });

  it('يسجّل التقدّم للجارية فقط، ولا يطغى تقدّم متأخر على عملية انتهت', async () => {
    const deps = setup();
    const { jobId } = await new StartBackgroundJobUseCase(deps).execute({ actor: admin, key: 'k', label: 'ع' });
    const report = new ReportJobProgressUseCase(deps);

    await report.execute({ jobId, done: 3, total: 10 });
    expect((await deps.jobs.findById(jobId))?.progress).toEqual({ done: 3, total: 10 });

    await new FinishBackgroundJobUseCase(deps).execute({ jobId, status: 'done', message: 'تم' });
    await report.execute({ jobId, done: 9, total: 10 });
    const job = await deps.jobs.findById(jobId);
    expect(job?.status).toBe('done');
    expect(job?.progress).toEqual({ done: 3, total: 10 });
  });

  it('للمدير فقط', async () => {
    const deps = setup();
    await expect(
      new StartBackgroundJobUseCase(deps).execute({ actor: { id: 'x', email: 'x@x.com' }, key: 'k', label: 'ع' }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(new ListBackgroundJobsUseCase(deps).execute({ actor: null })).rejects.toThrow();
  });
});
