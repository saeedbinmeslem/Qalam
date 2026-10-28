/**
 * @file event-recorders.ts
 * @description محوّلات تسجيل الأحداث: في الذاكرة (تطوير واختبار) وSupabase (جدول learning_events).
 */

import type { ClockPort, EventReaderPort, EventRecorderPort } from '@qalam/application';
import { LearningEvent, type LearningEventType } from '@qalam/domain';
import type { SupabaseDataClient } from '../persistence/supabase-path.repository.js';

export class InMemoryEventRecorder implements EventRecorderPort, EventReaderPort {
  readonly events: LearningEvent[] = [];

  constructor(private readonly onChange?: () => void) {}

  async record(event: LearningEvent): Promise<void> {
    this.events.push(event);
    this.onChange?.();
  }

  async listByUser(userId: string, types?: readonly LearningEventType[]): Promise<LearningEvent[]> {
    return this.events.filter((e) => e.userId === userId && (!types || types.includes(e.type)));
  }
}

interface EventRow {
  user_id: string;
  type: LearningEventType;
  payload: Record<string, unknown> | null;
  occurred_at: string;
}

/** قراءة أحداث المستخدم؛ سياسة RLS تحصر الصفوف بصاحبها، والتصفية بالمستخدم هنا للوضوح */
export class SupabaseEventReader implements EventReaderPort {
  constructor(private readonly client: SupabaseDataClient) {}

  async listByUser(userId: string, types?: readonly LearningEventType[]): Promise<LearningEvent[]> {
    const { data, error } = await this.client
      .from('learning_events')
      .select('user_id, type, payload, occurred_at')
      .eq('user_id', userId);
    if (error) throw new Error(`تعذّرت قراءة الأحداث: ${error.message}`);
    return ((data ?? []) as EventRow[])
      .filter((row) => !types || types.includes(row.type))
      .map(
        (row) =>
          new LearningEvent({
            userId: row.user_id,
            type: row.type,
            payload: row.payload ?? {},
            occurredAt: new Date(row.occurred_at),
          }),
      );
  }
}

export interface SupabaseInsertClient {
  from(table: string): {
    insert(row: Record<string, unknown>): PromiseLike<{ error: { message: string } | null }>;
  };
}

export class SupabaseEventRecorder implements EventRecorderPort {
  constructor(private readonly client: SupabaseInsertClient) {}

  async record(event: LearningEvent): Promise<void> {
    const { error } = await this.client.from('learning_events').insert({
      user_id: event.userId,
      type: event.type,
      payload: event.payload,
      occurred_at: event.occurredAt.toISOString(),
    });
    if (error) throw new Error(`تعذّر تسجيل الحدث: ${error.message}`);
  }
}

export const systemClock: ClockPort = { now: () => new Date() };
