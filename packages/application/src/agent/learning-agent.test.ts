import { describe, expect, it } from 'vitest';
import {
  LearningEvent,
  LearningPath,
  Lesson,
  Module,
  VideoSegment,
  createLessonId,
  createModuleId,
  createPathId,
  type LearningEventType,
} from '@qalam/domain';
import type { EventReaderPort } from '../ports/event-reader.port.js';
import type { EventRecorderPort } from '../ports/event-recorder.port.js';
import type { LlmClient } from '../ports/llm-client.port.js';
import type { PathRepositoryPort } from '../ports/path-repository.port.js';
import { LearningAgent } from './learning-agent.js';
import { addModule } from '../test-support/path-builder.js';

function setup(llm?: LlmClient) {
  const path = new LearningPath({ id: createPathId('p'), title: 'م', description: '', targetGoal: 'هدف', subject: 'ع' });
  const module = new Module({ id: createModuleId('m'), title: 'و', description: '', orderIndex: 1 });
  for (const id of ['l1', 'l2']) {
    module.addLesson(
      new Lesson({
        id: createLessonId(id), title: `درس ${id}`,
        segment: new VideoSegment({ videoId: 'abcdefghijk', startSeconds: 0, endSeconds: 60 }),
        sourceUrl: 'https://www.youtube.com/watch?v=abcdefghijk', channelName: 'قناة',
      }),
    );
  }
  addModule(path, module);

  const store: LearningEvent[] = [];
  let tick = 0;
  const events: EventReaderPort & EventRecorderPort = {
    record: async (e) => void store.push(e),
    listByUser: async (userId: string, types?: readonly LearningEventType[]) =>
      store.filter((e) => e.userId === userId && (!types || types.includes(e.type))),
  };
  const agent = new LearningAgent({
    paths: { findById: async (id) => (id === 'p' ? path : null) } as PathRepositoryPort,
    events,
    recorder: events,
    clock: { now: () => new Date(2026, 0, 1, 0, 0, tick++) },
    ...(llm ? { llm } : {}),
  });
  const quiz = (lessonId: string, percent: number) =>
    store.push(new LearningEvent({ userId: 'u', type: 'attempt_submitted', payload: { kind: 'quiz', lessonId, percent }, occurredAt: new Date(2026, 0, 1, 1, 0, tick++) }));
  return { agent, store, quiz };
}

const pathId = createPathId('p');
const planDecisions = (store: LearningEvent[]) => store.filter((e) => e.type === 'plan_decision');

describe('LearningAgent', () => {
  it('يعمل كاملًا بلا نموذج لغوي: يقرر ويسجّل plan_decision بسببه', async () => {
    const { agent, store, quiz } = setup();
    quiz('l1', 30);
    quiz('l1', 40);
    const advice = (await agent.run({ userId: 'u', pathId }))!;

    expect(advice.decision.action).toBe('review_lesson');
    expect(advice.explanation).toBeUndefined();
    const [event] = planDecisions(store);
    expect(event!.payload['source']).toBe('agent');
    expect(event!.payload['decision']).toBe('review_lesson');
    expect(event!.payload['reason']).toBe(advice.decision.reason);
  });

  it('لا يكرر تسجيل القرار لنفس الأدلة، ويسجّل قرارًا جديدًا عند تغيّرها', async () => {
    const { agent, store, quiz } = setup();
    quiz('l1', 30);
    expect((await agent.run({ userId: 'u', pathId }))!.isNew).toBe(true);
    expect((await agent.run({ userId: 'u', pathId }))!.isNew).toBe(false);
    expect(planDecisions(store)).toHaveLength(1);

    quiz('l1', 35);
    const next = (await agent.run({ userId: 'u', pathId }))!;
    expect(next.isNew).toBe(true);
    expect(next.decision.action).toBe('review_lesson');
    expect(planDecisions(store)).toHaveLength(2);
  });

  it('يصوغ الشرح عبر النموذج ويحفظه ويعيده عند التكرار بلا استدعاء جديد', async () => {
    let calls = 0;
    const llm: LlmClient = { generateJson: async () => (calls++, { explanation: 'راجع الدرس بهدوء ثم أعد المحاولة.' }) };
    const { agent, store, quiz } = setup(llm);
    quiz('l1', 30);

    const first = (await agent.run({ userId: 'u', pathId }))!;
    expect(first.explanation).toBe('راجع الدرس بهدوء ثم أعد المحاولة.');
    expect(planDecisions(store)[0]!.payload['explanation']).toBe(first.explanation);
    const again = (await agent.run({ userId: 'u', pathId }))!;
    expect(again.explanation).toBe(first.explanation);
    expect(calls).toBe(1);
  });

  it('طلبان متزامنان لنفس الأدلة يسجّلان قرارًا واحدًا', async () => {
    const { agent, store, quiz } = setup({ generateJson: async () => ({ explanation: 'شرح' }) });
    quiz('l1', 30);
    const [a, b] = await Promise.all([agent.run({ userId: 'u', pathId }), agent.run({ userId: 'u', pathId })]);
    expect([a!.isNew, b!.isNew].sort()).toEqual([false, true]);
    expect(planDecisions(store)).toHaveLength(1);
  });

  it('ردّ نموذج مخالف للمخطط أو خطؤه يُهمل ولا يمنع القرار', async () => {
    for (const generateJson of [
      async () => ({ wrong: 1 }),
      async () => ({ explanation: 5 }),
      async () => ({ explanation: 'س'.repeat(600) }),
      async () => { throw new Error('503'); },
    ]) {
      const { agent, store, quiz } = setup({ generateJson });
      quiz('l1', 30);
      const advice = (await agent.run({ userId: 'u', pathId }))!;
      expect(advice.decision.action).toBe('retake_quiz');
      expect(advice.explanation).toBeUndefined();
      expect(planDecisions(store)).toHaveLength(1);
    }
  });

  it('لا يستدعي النموذج عند قرار التقدّم', async () => {
    let calls = 0;
    const { agent } = setup({ generateJson: async () => (calls++, { explanation: 'x' }) });
    expect((await agent.run({ userId: 'u', pathId }))!.decision.action).toBe('proceed');
    expect(calls).toBe(0);
  });

  it('يعيد null عند انتهاء المسار، ويرمي إن لم يوجد المسار', async () => {
    const { agent, store } = setup();
    for (const id of ['l1', 'l2']) {
      store.push(new LearningEvent({ userId: 'u', type: 'lesson_completed', payload: { lessonId: id }, occurredAt: new Date() }));
    }
    expect(await agent.run({ userId: 'u', pathId })).toBeNull();
    await expect(agent.run({ userId: 'u', pathId: createPathId('nope') })).rejects.toThrow('غير موجود');
  });

  it('السجل: قرارات الوكيل لهذا المسار فقط، الأحدث أولًا، ولا يخلط قرارات التشخيصي', async () => {
    const { agent, store, quiz } = setup();
    store.push(new LearningEvent({ userId: 'u', type: 'plan_decision', payload: { decision: 'skip_lesson', lessonId: 'l1', reason: 'س' }, occurredAt: new Date() }));
    quiz('l2', 30);
    await agent.run({ userId: 'u', pathId });
    quiz('l2', 20);
    await agent.run({ userId: 'u', pathId });

    const history = await agent.history({ userId: 'u', pathId });
    expect(history).toHaveLength(2);
    expect(history[0]!.decidedAt.getTime()).toBeGreaterThan(history[1]!.decidedAt.getTime());
    expect(history[0]!.action).toBe('review_lesson');
    expect(await agent.history({ userId: 'other', pathId })).toEqual([]);
  });
});
