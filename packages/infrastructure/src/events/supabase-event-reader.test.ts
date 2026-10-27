import { describe, expect, it } from 'vitest';
import { InMemoryEventRecorder, SupabaseEventReader } from './event-recorders.js';
import type { SupabaseDataClient, SupabaseQuery } from '../persistence/supabase-path.repository.js';
import { LearningEvent } from '@qalam/domain';

function clientReturning(rows: unknown[], error: { message: string } | null = null) {
  const calls: Array<{ table: string; column: string; value: string }> = [];
  const client = {
    from: (table: string) => ({
      select: () => {
        let column = '';
        let value = '';
        const query: SupabaseQuery = {
          eq: (c, v) => {
            column = c;
            value = v;
            calls.push({ table, column, value });
            return query;
          },
          then: (ok, fail) => Promise.resolve({ data: error ? null : rows, error }).then(ok, fail),
        };
        return query;
      },
    }),
  } as unknown as SupabaseDataClient;
  return { client, calls };
}

describe('SupabaseEventReader', () => {
  const rows = [
    { user_id: 'u1', type: 'lesson_completed', payload: { lessonId: 'a' }, occurred_at: '2026-01-01T00:00:00Z' },
    { user_id: 'u1', type: 'lesson_opened', payload: null, occurred_at: '2026-01-01T00:00:01Z' },
  ];

  it('يقرأ أحداث المستخدم ويصفّي بالنوع ويحوّلها إلى كيانات', async () => {
    const { client, calls } = clientReturning(rows);
    const events = await new SupabaseEventReader(client).listByUser('u1', ['lesson_completed']);
    expect(calls).toEqual([{ table: 'learning_events', column: 'user_id', value: 'u1' }]);
    expect(events).toHaveLength(1);
    expect(events[0]?.payload['lessonId']).toBe('a');
    expect(events[0]?.occurredAt.toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });

  it('بلا أنواع يعيد الكل، ويحوّل payload الفارغ إلى كائن', async () => {
    const events = await new SupabaseEventReader(clientReturning(rows).client).listByUser('u1');
    expect(events.map((e) => e.type)).toEqual(['lesson_completed', 'lesson_opened']);
    expect(events[1]?.payload).toEqual({});
  });

  it('يرمي خطأ عربيًا عند فشل القراءة', async () => {
    const { client } = clientReturning([], { message: 'boom' });
    await expect(new SupabaseEventReader(client).listByUser('u1')).rejects.toThrow('تعذّرت قراءة الأحداث');
  });
});

describe('InMemoryEventRecorder.listByUser', () => {
  it('يصفّي بالمستخدم والنوع', async () => {
    const recorder = new InMemoryEventRecorder();
    const at = new Date();
    await recorder.record(new LearningEvent({ userId: 'u1', type: 'lesson_completed', occurredAt: at }));
    await recorder.record(new LearningEvent({ userId: 'u1', type: 'lesson_opened', occurredAt: at }));
    await recorder.record(new LearningEvent({ userId: 'u2', type: 'lesson_completed', occurredAt: at }));
    expect(await recorder.listByUser('u1')).toHaveLength(2);
    expect(await recorder.listByUser('u1', ['lesson_completed'])).toHaveLength(1);
  });
});
