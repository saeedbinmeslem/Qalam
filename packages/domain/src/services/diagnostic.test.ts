import { describe, expect, it } from 'vitest';
import { Course } from '../entities/course.js';
import { LearningPath } from '../entities/learning-path.js';
import { Lesson } from '../entities/lesson.js';
import { Module } from '../entities/module.js';
import { QuizQuestion } from '../entities/quiz-question.js';
import {
  createConceptId,
  createCourseId,
  createLessonId,
  createModuleId,
  createPathId,
  createQuestionId,
} from '../value-objects/identifiers.js';
import { VideoSegment } from '../value-objects/video-segment.js';
import { planDiagnosticSkips, selectDiagnosticQuestions } from './diagnostic.js';
import { gradeQuiz } from './quiz-grading.js';

const lesson = (id: string) =>
  new Lesson({
    id: createLessonId(id),
    title: id,
    segment: new VideoSegment({ videoId: 'abcdefghijk', startSeconds: 0, endSeconds: 60 }),
    sourceUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
    channelName: 'قناة',
  });

function buildPath() {
  const path = new LearningPath({ id: createPathId('p'), title: 'م', description: '', targetGoal: 'هدف', subject: 'ع' });
  // مفهوم a كورسه بدرسين، ثم b، ثم c (كورس لكل مفهوم)
  const groups = [['a', ['l1', 'l2']], ['b', ['l3']], ['c', ['l4']]] as const;
  groups.forEach(([concept, ids], i) => {
    const course = new Course({ id: createCourseId(`co-${concept}`), conceptId: createConceptId(concept), title: concept, description: '', orderIndex: i + 1 });
    const module = new Module({ id: createModuleId(`m-${concept}`), title: 'و', description: '', orderIndex: 1 });
    for (const id of ids) module.addLesson(lesson(id));
    course.addModule(module);
    path.addCourse(course);
  });
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
  it('يختار المعتمد من دروس المسار فقط، موزعًا على كل الكورسات، بترتيب الكورسات', () => {
    const all = [
      q('c1', 'l4', 'c'), q('a1', 'l1', 'a'), q('a2', 'l2', 'a'), q('a3', 'l1', 'a'),
      q('b1', 'l3', 'b', 'draft'), q('x1', 'خارج-المسار', 'a'),
    ];
    // هدف صغير: حصة كل كورس سؤالان على الأقل
    expect(selectDiagnosticQuestions(buildPath(), all, 3).map((x) => x.id)).toEqual(['a1', 'a2', 'c1']);
  });

  it('يبلغ 15 سؤالًا موزعة على كل الكورسات حين تتوفر', () => {
    const lessonOf: Record<string, string> = { a: 'l1', b: 'l3', c: 'l4' };
    const all = ['a', 'b', 'c'].flatMap((c) => Array.from({ length: 8 }, (_, i) => q(`${c}${i}`, lessonOf[c] as string, c)));
    const picked = selectDiagnosticQuestions(buildPath(), all);
    expect(picked).toHaveLength(15);
    for (const c of ['a', 'b', 'c']) expect(picked.filter((x) => x.conceptId === c)).toHaveLength(5);
  });

  it('كورس قليل الأسئلة لا يمنع بلوغ الهدف من غيره، ولا يتجاوز المتاح', () => {
    const all = [q('a1', 'l1', 'a'), ...Array.from({ length: 20 }, (_, i) => q(`c${i}`, 'l4', 'c'))];
    const picked = selectDiagnosticQuestions(buildPath(), all);
    expect(picked).toHaveLength(15);
    expect(picked.filter((x) => x.conceptId === 'a')).toHaveLength(1);
    expect(selectDiagnosticQuestions(buildPath(), [q('a1', 'l1', 'a')])).toHaveLength(1);
    expect(selectDiagnosticQuestions(buildPath(), [])).toEqual([]);
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
