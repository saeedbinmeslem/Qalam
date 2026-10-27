import { describe, expect, it } from 'vitest';
import { LearningEvent } from '@qalam/domain';
import { SupabaseEventRecorder } from './event-recorders.js';

describe('SupabaseEventRecorder', () => {
  const event = new LearningEvent({
    userId: 'u1',
    type: 'lesson_completed',
    payload: { lessonId: 'l1' },
    occurredAt: new Date('2026-11-01T10:00:00Z'),
  });

  it('يدرج صفًا بأسماء الأعمدة الصحيحة', async () => {
    let received: { table: string; row: Record<string, unknown> } | undefined;
    await new SupabaseEventRecorder({
      from: (table) => ({
        insert: async (row) => {
          received = { table, row };
          return { error: null };
        },
      }),
    }).record(event);
    expect(received).toEqual({
      table: 'learning_events',
      row: {
        user_id: 'u1',
        type: 'lesson_completed',
        payload: { lessonId: 'l1' },
        occurred_at: '2026-11-01T10:00:00.000Z',
      },
    });
  });

  it('يرمي خطأ عند فشل الإدراج', async () => {
    const recorder = new SupabaseEventRecorder({
      from: () => ({ insert: async () => ({ error: { message: 'denied' } }) }),
    });
    await expect(recorder.record(event)).rejects.toThrow('denied');
  });
});
