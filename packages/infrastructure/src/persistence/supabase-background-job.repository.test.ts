import { describe, expect, it } from 'vitest';
import { SupabaseBackgroundJobRepository } from './supabase-background-job.repository.js';

/** عميل وهمي يحفظ الصفوف كما تُرسل، ويقرؤها كما هي */
function fakeClient() {
  const rows = new Map<string, Record<string, unknown>>();
  const client = {
    from: () => ({
      select: () => Promise.resolve({ data: [...rows.values()], error: null }),
      upsert: (batch: Record<string, unknown>[]) => {
        for (const r of batch) rows.set(r.id as string, r);
        return Promise.resolve({ error: null });
      },
    }),
  };
  return { rows, repo: new SupabaseBackgroundJobRepository(client as never) };
}

const base = { id: 'j1', key: 'k', label: 'ل', startedAt: new Date('2026-11-03T10:00:00Z') };

describe('SupabaseBackgroundJobRepository: التقدّم', () => {
  it('يحفظ التقدّم أثناء العمل ويقرؤه، دون أن يظهر في الرسالة', async () => {
    const { rows, repo } = fakeClient();
    await repo.save({ ...base, status: 'running', message: '', progress: { done: 12, total: 80 } });
    expect(rows.get('j1')?.message).toBe('@@progress:12/80');
    const job = await repo.findById('j1');
    expect(job?.progress).toEqual({ done: 12, total: 80 });
    expect(job?.message).toBe('');
  });

  it('عند الانتهاء تحل رسالة النتيجة محل التقدّم', async () => {
    const { repo } = fakeClient();
    await repo.save({ ...base, status: 'running', message: '', progress: { done: 80, total: 80 } });
    await repo.save({ ...base, status: 'done', message: 'اكتمل 80 درسًا', progress: { done: 80, total: 80 }, finishedAt: new Date() });
    const job = await repo.findById('j1');
    expect(job?.message).toBe('اكتمل 80 درسًا');
    expect(job?.progress).toBeUndefined();
  });

  it('عملية بلا تقدّم تبقى كما كانت', async () => {
    const { repo } = fakeClient();
    await repo.save({ ...base, status: 'running', message: '' });
    expect((await repo.findById('j1'))?.progress).toBeUndefined();
  });
});
