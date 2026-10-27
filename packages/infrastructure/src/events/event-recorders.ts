/**
 * @file event-recorders.ts
 * @description محوّلات تسجيل الأحداث: في الذاكرة (تطوير واختبار) وSupabase (جدول learning_events).
 */

import type { ClockPort, EventRecorderPort } from '@qalam/application';
import type { LearningEvent } from '@qalam/domain';

export class InMemoryEventRecorder implements EventRecorderPort {
  readonly events: LearningEvent[] = [];

  async record(event: LearningEvent): Promise<void> {
    this.events.push(event);
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
