import { describe, expect, it } from 'vitest';
import {
  Concept,
  LearningPath,
  Lesson,
  Module,
  QuizQuestion,
  VideoSegment,
  createConceptId,
  createLessonId,
  createModuleId,
  createPathId,
  createQuestionId,
  type LearningEvent,
  type LessonId,
} from '@qalam/domain';
import type { ConceptRepositoryPort } from '../ports/concept-repository.port.js';
import type { PathRepositoryPort } from '../ports/path-repository.port.js';
import type { QuestionRepositoryPort } from '../ports/question-repository.port.js';
import {
  GetDiagnosticResultUseCase,
  GetDiagnosticUseCase,
  SubmitDiagnosticUseCase,
  type DiagnosticDeps,
} from './diagnostic.usecases.js';
import { addCourseWithModule } from '../test-support/path-builder.js';

function build() {
  const path = new LearningPath({ id: createPathId('p'), title: 'م', description: '', targetGoal: 'هدف', subject: 'ع' });
  const modules = new Map<string, Module>();
  for (const [id, concept] of [['l1', 'a'], ['l2', 'a'], ['l3', 'b']] as const) {
    const module = modules.get(concept) ?? new Module({ id: createModuleId(`m-${concept}`), title: 'و', description: '', orderIndex: 1 });
    modules.set(concept, module);
    module.addLesson(
      new Lesson({
        id: createLessonId(id),
        title: `درس ${id}`,
        segment: new VideoSegment({ videoId: 'abcdefghijk', startSeconds: 0, endSeconds: 60 }),
        sourceUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
        channelName: 'قناة',
      }),
    );
  }
  for (const [concept, module] of modules) addCourseWithModule(path, module, concept);

  const q = (id: string, lessonId: string, concept: string, status: 'approved' | 'draft' = 'approved') =>
    new QuizQuestion({
      id: createQuestionId(id), lessonId: createLessonId(lessonId), conceptId: createConceptId(concept),
      prompt: id, choices: ['أ', 'ب', 'ج'], correctIndex: 0, explanation: '', status,
    });
  const all = [q('a1', 'l1', 'a'), q('a2', 'l2', 'a'), q('b1', 'l3', 'b'), q('b2', 'l3', 'b', 'draft')];

  const deps: DiagnosticDeps = {
    paths: { findById: async (id) => (id === 'p' ? path : null) } as PathRepositoryPort,
    questions: { findByLesson: async (id: LessonId) => all.filter((x) => x.lessonId === id) } as unknown as QuestionRepositoryPort,
    concepts: {
      findAll: async () => [
        new Concept({ id: createConceptId('a'), pathId: createPathId('p'), name: 'المفهوم أ', description: '', level: 1 }),
        new Concept({ id: createConceptId('b'), pathId: createPathId('p'), name: 'المفهوم ب', description: '', level: 1 }),
      ],
    } as unknown as ConceptRepositoryPort,
  };
  return deps;
}

describe('الاختبار التشخيصي', () => {
  it('يعرض المعتمد فقط وبلا إجابات', async () => {
    const shown = await new GetDiagnosticUseCase(build()).execute({ pathId: 'p' });
    expect(shown.map((s) => s.id)).toEqual(['a1', 'a2', 'b1']);
    expect(Object.keys(shown[0]!)).toEqual(['id', 'prompt', 'choices']);
  });

  it('التسليم: يتخطى مفهوم «أ» (سؤالان صحيحان) ولا يتخطى «ب» (سؤال واحد = دليل غير كافٍ)، ويسجّل الأحداث بأسبابها', async () => {
    const events: LearningEvent[] = [];
    const submit = new SubmitDiagnosticUseCase(build(), { record: async (e) => void events.push(e) }, { now: () => new Date('2026-01-01') });

    const outcome = await submit.execute({ userId: 'u', pathId: 'p', answers: { a1: 0, a2: 0, b1: 0 } });

    expect(outcome.result).toMatchObject({ correct: 3, total: 3, percent: 100 });
    expect(outcome.skippedLessons.map((s) => s.lessonId)).toEqual(['l1', 'l2']);
    expect(outcome.skippedLessons[0]?.reason).toContain('«المفهوم أ»');

    expect(events.map((e) => e.type)).toEqual(['diagnostic_completed', 'plan_decision', 'plan_decision']);
    expect(events[0]?.payload).toMatchObject({ pathId: 'p', masteredConceptIds: ['a'] });
    expect(events[1]?.payload).toMatchObject({ decision: 'skip_lesson', lessonId: 'l1' });
    expect(typeof events[1]?.payload['reason']).toBe('string');
  });

  it('خطأ في أحد أسئلة المفهوم يلغي تخطيه، وصفحة النتيجة لا تسجّل شيئًا', async () => {
    const events: LearningEvent[] = [];
    const deps = build();
    const result = await new GetDiagnosticResultUseCase(deps).execute({ pathId: 'p', answers: { a1: 0, a2: 2, b1: 0 } });
    expect(result.skippedLessons).toEqual([]);
    expect(events).toHaveLength(0);

    const submit = new SubmitDiagnosticUseCase(deps, { record: async (e) => void events.push(e) }, { now: () => new Date() });
    await submit.execute({ userId: 'u', pathId: 'p', answers: { a1: 0, a2: 2, b1: 0 } });
    expect(events.map((e) => e.type)).toEqual(['diagnostic_completed']);
  });

  it('يرفض مسارًا غير موجود أو بلا أسئلة معتمدة', async () => {
    await expect(new GetDiagnosticUseCase(build()).execute({ pathId: 'zzz' })).rejects.toThrow('غير موجود');
    const empty = { ...build(), questions: { findByLesson: async () => [] } as unknown as QuestionRepositoryPort };
    await expect(new GetDiagnosticResultUseCase(empty).execute({ pathId: 'p', answers: {} })).rejects.toThrow('لا يوجد اختبار تشخيصي');
  });
});
