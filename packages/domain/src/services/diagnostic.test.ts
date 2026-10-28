import { describe, expect, it } from 'vitest';
import { LearningPath } from '../entities/learning-path.js';
import { Lesson } from '../entities/lesson.js';
import { Module } from '../entities/module.js';
import { QuizQuestion } from '../entities/quiz-question.js';
import {
  createConceptId,
  createLessonId,
  createModuleId,
  createPathId,
  createQuestionId,
} from '../value-objects/identifiers.js';
import { VideoSegment } from '../value-objects/video-segment.js';
import { planDiagnosticSkips, selectDiagnosticQuestions } from './diagnostic.js';
import { gradeQuiz } from './quiz-grading.js';

const lesson = (id: string, concept: string) =>
  new Lesson({
    id: createLessonId(id),
    title: id,
    conceptId: createConceptId(concept),
    segment: new VideoSegment({ videoId: 'abcdefghijk', startSeconds: 0, endSeconds: 60 }),
    sourceUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
    channelName: 'قناة',
  });

function buildPath() {
  const path = new LearningPath({ id: createPathId('p'), title: 'م', description: '', targetGoal: 'هدف', subject: 'ع' });
  const module = new Module({ id: createModuleId('m'), title: 'و', description: '', orderIndex: 1 });
  // مفهوم a في درسين، ثم b، ثم c
  for (const [id, c] of [['l1', 'a'], ['l2', 'a'], ['l3', 'b'], ['l4', 'c']] as const) module.addLesson(lesson(id, c));
  path.addModule(module);
  return path;
}

const q = (id: string, lessonId: string, concept: string, status: 'approved' | 'draft' = 'approved') =>
  new QuizQuestion({
    id: createQuestionId(id),
    lessonId: createLessonId(lessonId),
    conceptId: createConceptId(concept),
    prompt: id,
    choices: ['أ', 'ب', 'ج'],
    correctIndex: 0,
    explanation: '',
    status,
  });

describe('selectDiagnosticQuestions', () => {
  it('يختار المعتمد فقط، حتى سؤالين لكل مفهوم، بترتيب المفاهيم في المسار', () => {
    const all = [
      q('c1', 'l4', 'c'), q('a1', 'l1', 'a'), q('a2', 'l2', 'a'), q('a3', 'l1', 'a'),
      q('b1', 'l3', 'b', 'draft'), q('x1', 'خارج-المسار', 'a'),
    ];
    expect(selectDiagnosticQuestions(buildPath(), all).map((x) => x.id)).toEqual(['a1', 'a2', 'c1']);
  });
});

describe('planDiagnosticSkips (قاعدة التخطي)', () => {
  const path = buildPath();
  const questions = [q('a1', 'l1', 'a'), q('a2', 'l2', 'a'), q('b1', 'l3', 'b'), q('b2', 'l3', 'b'), q('c1', 'l4', 'c')];
  const names = new Map([['a', 'الأول'], ['b', 'الثاني']]);
  const grade = (answers: Record<string, number>) => gradeQuiz(questions, new Map(Object.entries(answers)));

  it('يتخطى كل دروس المفهوم الذي أُجيب كل أسئلته صحيحًا (سؤالان فأكثر)', () => {
    const result = grade({ a1: 0, a2: 0, b1: 0, b2: 1, c1: 0 });
    const plan = planDiagnosticSkips(path, questions, result, names);
    expect(plan.masteredConceptIds).toEqual(['a']);
    expect(plan.skips.map((s) => s.lesson.id)).toEqual(['l1', 'l2']);
    expect(plan.skips[0]?.reason).toBe('أجبتَ صحيحًا على سؤالين عن «الأول» في الاختبار التشخيصي');
  });

  it('لا يتخطى مفهومًا بسؤال واحد فقط (دليل غير كافٍ) ولا عند أي خطأ', () => {
    const result = grade({ a1: 0, a2: 1, b1: 0, b2: 0, c1: 0 });
    const plan = planDiagnosticSkips(path, questions, result, names);
    expect(plan.masteredConceptIds).toEqual(['b']); // c بسؤال واحد، و a أخطأ فيه
    expect(plan.skips.map((s) => s.lesson.id)).toEqual(['l3']);
  });

  it('بلا إجابات: لا تخطي', () => {
    expect(planDiagnosticSkips(path, questions, grade({}), names).skips).toEqual([]);
  });
});
