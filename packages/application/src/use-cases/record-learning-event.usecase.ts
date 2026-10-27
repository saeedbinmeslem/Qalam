/**
 * @file record-learning-event.usecase.ts
 * @description حالة الاستخدام الوحيدة لتسجيل أحداث قياس الأثر، فلا تتبعثر في الواجهة.
 */

import { LearningEvent, type LearningEventType } from '@qalam/domain';
import type { ClockPort, EventRecorderPort } from '../ports/event-recorder.port.js';

export interface RecordLearningEventRequest {
  userId: string;
  type: LearningEventType;
  payload?: Record<string, unknown>;
}

export class RecordLearningEventUseCase {
  constructor(
    private readonly recorder: EventRecorderPort,
    private readonly clock: ClockPort,
  ) {}

  async execute(request: RecordLearningEventRequest): Promise<void> {
    const event = new LearningEvent({
      userId: request.userId,
      type: request.type,
      ...(request.payload ? { payload: request.payload } : {}),
      occurredAt: this.clock.now(),
    });
    await this.recorder.record(event);
  }
}
