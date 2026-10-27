import { describe, expect, it } from 'vitest';
import {
  AdminPolicy,
  Concept,
  QuizQuestion,
  createConceptId,
  type ConceptId,
  type LearningEvent,
  type LearningPath,
  type LessonId,
  type PathId,
  type QuestionId,
} from '@qalam/domain';
import { ForbiddenError } from '../../errors.js';
import type { ConceptRepositoryPort } from '../../ports/concept-repository.port.js';
import type { LlmClient, LlmJsonRequest } from '../../ports/llm-client.port.js';
import type { QuestionRepositoryPort } from '../../ports/question-repository.port.js';
import { AddLessonUseCase, UpdateLessonUseCase } from './admin-lessons.usecases.js';
import { AddModuleUseCase, CreatePathUseCase } from './admin-paths.usecases.js';
import {
  AddQuestionUseCase,
  ApproveQuestionUseCase,
  DeleteQuestionUseCase,
  GenerateQuestionsUseCase,
  ListLessonQuestionsUseCase,
  UpdateQuestionUseCase,
  type QuizAdminDeps,
} from './admin-quiz.usecases.js';
import { GetLessonQuizUseCase, GetQuizResultUseCase, SubmitQuizUseCase } from '../learner-quiz.usecases.js';
import { parseGeneratedQuestions } from './generated-questions.js';

class Paths {
  store = new Map<string, LearningPath>();
  save = async (p: LearningPath) => void this.store.set(p.id, p);
  delete = async (id: PathId) => void this.store.delete(id);
  findById = async (id: PathId) => this.store.get(id) ?? null;
  findBySubject = async () => [...this.store.values()];
  findAll = async () => [...this.store.values()];
}

class Questions implements QuestionRepositoryPort {
  store = new Map<string, QuizQuestion>();
  async save(q: QuizQuestion) {
    this.store.set(q.id, q);
  }
  async findById(id: QuestionId) {
    return this.store.get(id) ?? null;
  }
  async findByLesson(lessonId: LessonId) {
    return [...this.store.values()].filter((q) => q.lessonId === lessonId);
  }
  async delete(id: QuestionId) {
    this.store.delete(id);
  }
}

class Concepts implements ConceptRepositoryPort {
  store = new Map<string, Concept>();
  async save(c: Concept) {
    this.store.set(c.id, c);
  }
  async findById(id: ConceptId) {
    return this.store.get(id) ?? null;
  }
  async findAll() {
    return [...this.store.values()];
  }
  async delete(id: ConceptId) {
    this.store.delete(id);
  }
}

const validAnswer = {
  questions: [
    { prompt: 'ما النظام الثنائي؟', choices: ['أساس 2', 'أساس 8', 'أساس 10', 'أساس 16'], correctIndex: 0, explanation: 'لأنه يستعمل رقمين.' },
    { prompt: 'كم بتًا في البايت؟', choices: ['4', '8', '16'], correctIndex: 1, explanation: 'البايت ثمانية بتات.' },
  ],
};

function fakeLlm(answer: unknown) {
  const calls: LlmJsonRequest[] = [];
  const llm: LlmClient = {
    generateJson: async (request) => {
      calls.push(request);
      if (answer instanceof Error) throw answer;
      return answer;
    },
  };
  return { llm, calls };
}

const admin = { id: 'u1', email: 'owner@qalam.dev' };
const stranger = { id: 'u2', email: 'x@x.com' };

async function setup(answer: unknown = validAnswer) {
  let n = 0;
  const { llm, calls } = fakeLlm(answer);
  const deps: QuizAdminDeps = {
    paths: new Paths(),
    concepts: new Concepts(),
    ids: { next: (prefix) => `${prefix}-${++n}` },
    policy: AdminPolicy.fromList('owner@qalam.dev'),
    questions: new Questions(),
    llm,
  };
  await deps.concepts.save(new Concept({ id: createConceptId('c1'), name: 'النظام الثنائي', description: '', level: 1 }));
  const { pathId } = await new CreatePathUseCase(deps).execute({ actor: admin, title: 'م', description: '', targetGoal: 'هدف', subject: 'ع' });
  const { moduleId } = await new AddModuleUseCase(deps).execute({ actor: admin, pathId, title: 'و', description: '' });
  const fields = {
    title: 'درس', conceptId: 'c1', videoUrl: 'qTVRs1wTwho', start: '0:00', end: '5:00',
    channelName: 'قناة', language: 'ar', summary: '', notes: 'النظام الثنائي يستعمل الرقمين 0 و1. البايت ثمانية بتات.',
  };
  const { lessonId } = await new AddLessonUseCase(deps).execute({ actor: admin, pathId, moduleId, ...fields });
  return { deps, calls, pathId, lessonId, fields };
}

describe('GenerateQuestionsUseCase (توليد الأسئلة)', () => {
  it('يحفظ أسئلة الذكاء الاصطناعي مسودات مبنية على ملاحظات الدرس', async () => {
    const { deps, calls, pathId, lessonId } = await setup();
    const out = await new GenerateQuestionsUseCase(deps).execute({ actor: admin, pathId, lessonId, count: 2 });
    expect(out.created).toBe(2);

    const saved = await new ListLessonQuestionsUseCase(deps).execute({ actor: admin, lessonId });
    expect(saved.map((q) => [q.status, q.origin, q.conceptId])).toEqual([
      ['draft', 'ai', 'c1'],
      ['draft', 'ai', 'c1'],
    ]);
    expect(calls[0]?.user).toContain('النظام الثنائي يستعمل الرقمين');
    expect(calls[0]?.system).toContain('ملاحظات المصدر');
  });

  it('يرفض التوليد بلا ملاحظات، ولا يستدعي النموذج', async () => {
    const { deps, calls, pathId, lessonId, fields } = await setup();
    await new UpdateLessonUseCase(deps).execute({ actor: admin, pathId, lessonId, ...fields, notes: '' });
    await expect(new GenerateQuestionsUseCase(deps).execute({ actor: admin, pathId, lessonId, count: 3 })).rejects.toThrow('ملاحظات');
    expect(calls).toHaveLength(0);
  });

  it('يرفض الدفعة كلها عند ردّ غير صالح ولا يحفظ شيئًا', async () => {
    const bad = { questions: [validAnswer.questions[0], { prompt: 'س', choices: ['أ', 'ب'], correctIndex: 0, explanation: '' }] };
    const { deps, pathId, lessonId } = await setup(bad);
    await expect(new GenerateQuestionsUseCase(deps).execute({ actor: admin, pathId, lessonId, count: 5 })).rejects.toThrow('عدد الخيارات');
    expect((deps.questions as Questions).store.size).toBe(0);
  });

  it('يقصّ الزيادة عن العدد المطلوب، ويمرّر فشل النموذج، ويمنع غير المدير', async () => {
    const { deps, pathId, lessonId } = await setup();
    expect((await new GenerateQuestionsUseCase(deps).execute({ actor: admin, pathId, lessonId, count: 1 })).created).toBe(1);

    const failing = await setup(new Error('تعذّر الاتصال بالنموذج'));
    await expect(new GenerateQuestionsUseCase(failing.deps).execute({ actor: admin, pathId: failing.pathId, lessonId: failing.lessonId, count: 2 })).rejects.toThrow('تعذّر الاتصال');
    await expect(new GenerateQuestionsUseCase(deps).execute({ actor: stranger, pathId, lessonId, count: 2 })).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe('AddQuestionUseCase (سؤال يدوي)', () => {
  it('يحفظ سؤال المالك مسودة يدوية، ويرفض البيانات الخاطئة وغير المدير', async () => {
    const { deps, pathId, lessonId } = await setup();
    const add = (over: object = {}, actor = admin) =>
      new AddQuestionUseCase(deps).execute({
        actor, pathId, lessonId, prompt: 'س؟', choices: ['أ', 'ب', 'ج'], correctIndex: 1, explanation: 'ش', ...over,
      });

    const { questionId } = await add();
    const saved = (await new ListLessonQuestionsUseCase(deps).execute({ actor: admin, lessonId }))[0]!;
    expect(saved).toMatchObject({ id: questionId, status: 'draft', origin: 'manual', conceptId: 'c1', correctIndex: 1 });

    await expect(add({ correctIndex: 9 })).rejects.toThrow('خارج نطاق');
    await expect(add({}, stranger)).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe('parseGeneratedQuestions', () => {
  it('يرفض الأشكال الخاطئة', () => {
    expect(() => parseGeneratedQuestions(null)).toThrow('قائمة');
    expect(() => parseGeneratedQuestions({})).toThrow('قائمة');
    expect(() => parseGeneratedQuestions({ questions: [{ prompt: 1 }] })).toThrow('ناقص');
    expect(() => parseGeneratedQuestions({ questions: [{ prompt: 'س', explanation: '', choices: [1], correctIndex: 0 }] })).toThrow('خيارات');
    expect(() => parseGeneratedQuestions({ questions: [{ prompt: 'س', explanation: '', choices: ['أ'], correctIndex: '0' }] })).toThrow('الإجابة');
  });
});

describe('اعتماد الأسئلة وتجربة المتعلم', () => {
  it('المتعلم لا يرى إلا المعتمد وبلا الإجابة الصحيحة، وتعديل السؤال يسحب اعتماده', async () => {
    const { deps, pathId, lessonId } = await setup();
    await new GenerateQuestionsUseCase(deps).execute({ actor: admin, pathId, lessonId, count: 2 });
    const [first, second] = await new ListLessonQuestionsUseCase(deps).execute({ actor: admin, lessonId });
    const view = new GetLessonQuizUseCase(deps.questions);

    expect(await view.execute({ lessonId })).toEqual([]);

    await new ApproveQuestionUseCase(deps).execute({ actor: admin, questionId: first!.id });
    const shown = await view.execute({ lessonId });
    expect(shown).toHaveLength(1);
    expect(Object.keys(shown[0]!)).toEqual(['id', 'prompt', 'choices']);

    await new UpdateQuestionUseCase(deps).execute({
      actor: admin, questionId: first!.id, prompt: 'معدّل', choices: ['أ', 'ب', 'ج'], correctIndex: 2, explanation: '',
    });
    expect(await view.execute({ lessonId })).toEqual([]);

    await new DeleteQuestionUseCase(deps).execute({ actor: admin, questionId: second!.id });
    expect((deps.questions as Questions).store.size).toBe(1);
    await expect(new ApproveQuestionUseCase(deps).execute({ actor: stranger, questionId: first!.id })).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('التسليم يصحّح ويسجّل محاولة بالمفاهيم الضعيفة، ويرفض عند غياب اختبار معتمد', async () => {
    const { deps, pathId, lessonId } = await setup();
    const events: LearningEvent[] = [];
    const submit = new SubmitQuizUseCase(deps.questions, { record: async (e) => void events.push(e) }, { now: () => new Date('2026-01-01') });

    await expect(submit.execute({ userId: 'u', pathId, lessonId, answers: {} })).rejects.toThrow('لا يوجد اختبار');

    await new GenerateQuestionsUseCase(deps).execute({ actor: admin, pathId, lessonId, count: 2 });
    for (const q of await new ListLessonQuestionsUseCase(deps).execute({ actor: admin, lessonId })) {
      await new ApproveQuestionUseCase(deps).execute({ actor: admin, questionId: q.id });
    }
    const [q1, q2] = await new ListLessonQuestionsUseCase(deps).execute({ actor: admin, lessonId });

    const result = await submit.execute({ userId: 'u', pathId, lessonId, answers: { [q1!.id]: q1!.correctIndex, [q2!.id]: (q2!.correctIndex + 1) % 3 } });
    expect(result).toMatchObject({ correct: 1, total: 2, percent: 50, weakConceptIds: ['c1'] });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: 'attempt_submitted', userId: 'u' });
    expect(events[0]?.payload).toMatchObject({ kind: 'quiz', lessonId, correct: 1, total: 2, percent: 50 });

    // صفحة النتيجة تصحّح بلا تسجيل
    const again = await new GetQuizResultUseCase(deps.questions).execute({ lessonId, answers: { [q1!.id]: q1!.correctIndex } });
    expect(again.correct).toBe(1);
    expect(events).toHaveLength(1);
  });
});
