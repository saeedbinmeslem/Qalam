import { describe, expect, it } from 'vitest';
import type { LearningEvent } from '@qalam/domain';
import type { ClockPort, EventRecorderPort } from '../ports/event-recorder.port.js';
import { RecordLearningEventUseCase } from './record-learning-event.usecase.js';

class FakeRecorder implements EventRecorderPort {
  events: LearningEvent[] = [];
  async record(event: LearningEvent) {
    this.events.push(event);
  }
}

const clock: ClockPort = { now: () => new Date('2026-11-01T10:00:00Z') };

describe('RecordLearningEventUseCase', () => {
  it('يسجّل الحدث بزمن الساعة المحقونة', async () => {
    const recorder = new FakeRecorder();
    await new RecordLearningEventUseCase(recorder, clock).execute({
      userId: 'u1',
      type: 'lesson_completed',
      payload: { lessonId: 'l1' },
    });
    expect(recorder.events).toHaveLength(1);
    expect(recorder.events[0]?.occurredAt.toISOString()).toBe('2026-11-01T10:00:00.000Z');
    expect(recorder.events[0]?.payload).toEqual({ lessonId: 'l1' });
  });

  it('يرفض قرار خطة بلا سبب ولا يسجّل شيئًا', async () => {
    const recorder = new FakeRecorder();
    const useCase = new RecordLearningEventUseCase(recorder, clock);
    await expect(useCase.execute({ userId: 'u1', type: 'plan_decision' })).rejects.toThrow('سببه');
    expect(recorder.events).toHaveLength(0);
  });

  it('يرفض مستخدمًا فارغًا', async () => {
    const useCase = new RecordLearningEventUseCase(new FakeRecorder(), clock);
    await expect(useCase.execute({ userId: ' ', type: 'lesson_opened' })).rejects.toThrow();
  });
});
