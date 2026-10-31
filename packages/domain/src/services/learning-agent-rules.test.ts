import { describe, expect, it } from 'vitest';
import { Course } from '../entities/course.js';
import { LearningPath } from '../entities/learning-path.js';
import { Lesson } from '../entities/lesson.js';
import { Module } from '../entities/module.js';
import { LearningEvent } from '../value-objects/learning-event.js';
import { createConceptId, createCourseId, createLessonId, createModuleId, createPathId } from '../value-objects/identifiers.js';
import { VideoSegment } from '../value-objects/video-segment.js';
import { decideNextStep } from './learning-agent-rules.js';

// l1,l2 على المفهوم a في كورسين مختلفين (l2 بديل l1)، وl3 على المفهوم b
function buildPath(lessonConcepts: Array<[string, string]> = [['l1', 'a'], ['l2', 'a'], ['l3', 'b']]) {
  const path = new LearningPath({ id: createPathId('p'), title: 'م', description: '', targetGoal: 'هدف', subject: 'ع' });
  lessonConcepts.forEach(([id, concept], i) => {
    const course = new Course({ id: createCourseId(`co-${id}`), conceptId: createConceptId(concept), title: `كورس ${id}`, description: '', orderIndex: i + 1 });
    const module = new Module({ id: createModuleId(`m-${id}`), title: 'و', description: '', orderIndex: 1 });
    module.addLesson(
      new Lesson({
        id: createLessonId(id),
        title: `درس ${id}`,
        segment: new VideoSegment({ videoId: 'abcdefghijk', startSeconds: 0, endSeconds: 60 }),
        sourceUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
        channelName: 'قناة',
      }),
    );
    course.addModule(module);
    path.addCourse(course);
  });
  return path;
}

let clock = 0;
const at = () => new Date(2026, 0, 1, 0, 0, clock++);
const quiz = (lessonId: string, percent: number) =>
  new LearningEvent({ userId: 'u', type: 'attempt_submitted', payload: { kind: 'quiz', lessonId, percent }, occurredAt: at() });
const completed = (lessonId: string) =>
  new LearningEvent({ userId: 'u', type: 'lesson_completed', payload: { lessonId }, occurredAt: at() });

describe('decideNextStep', () => {
  it('متعلم جديد بلا أدلة ← تقدّم إلى أول درس', () => {
    const d = decideNextStep(buildPath(), [])!;
    expect(d.action).toBe('proceed');
    expect(d.lessonId).toBe('l1');
    expect(d.reason).toContain('لا توجد لدينا أدلة');
  });

  it('أكمل درسًا واجتاز اختباره ← تقدّم إلى التالي مع ذكر النسبة', () => {
    const d = decideNextStep(buildPath(), [completed('l1'), quiz('l1', 90)])!;
    expect(d.action).toBe('proceed');
    expect(d.lessonId).toBe('l2');
    expect(d.reason).toContain('90%');
  });

  it('فشل واحد ← إعادة الاختبار', () => {
    const d = decideNextStep(buildPath(), [completed('l1'), quiz('l1', 40)])!;
    expect(d.action).toBe('retake_quiz');
    expect(d.lessonId).toBe('l1');
    expect(d.consecutiveFailures).toBe(1);
  });

  it('فشلان متتاليان ← مراجعة الدرس ثم إعادة الاختبار قبل المتابعة (مثال SPEC)', () => {
    const d = decideNextStep(buildPath(), [quiz('l1', 40), quiz('l1', 50)])!;
    expect(d.action).toBe('review_lesson');
    expect(d.lessonId).toBe('l1');
    expect(d.consecutiveFailures).toBe(2);
    expect(d.reason).toContain('أعد الاختبار');
  });

  it('ثلاثة فشل ← درس بديل على نفس المفهوم', () => {
    const d = decideNextStep(buildPath(), [quiz('l1', 10), quiz('l1', 20), quiz('l1', 30)])!;
    expect(d.action).toBe('alternative_lesson');
    expect(d.lessonId).toBe('l1');
    expect(d.alternativeLessonId).toBe('l2');
  });

  it('ثلاثة فشل ولا بديل على المفهوم ← مراجعة الدرس', () => {
    const path = buildPath([['l1', 'a'], ['l3', 'b']]);
    const d = decideNextStep(path, [quiz('l1', 10), quiz('l1', 20), quiz('l1', 30)])!;
    expect(d.action).toBe('review_lesson');
    expect(d.alternativeLessonId).toBeUndefined();
    expect(d.reason).toContain('لا يوجد درس بديل');
  });

  it('النجاح يمسح سلسلة الفشل', () => {
    const d = decideNextStep(buildPath(), [quiz('l1', 10), quiz('l1', 20), quiz('l1', 80), completed('l1')])!;
    expect(d.action).toBe('proceed');
    expect(d.lessonId).toBe('l2');
  });

  it('فشل غير متتالٍ لا يُحسب: فشل ثم نجاح ثم فشل = فشل واحد', () => {
    const d = decideNextStep(buildPath(), [quiz('l1', 10), quiz('l1', 90), quiz('l1', 20)])!;
    expect(d.action).toBe('retake_quiz');
    expect(d.consecutiveFailures).toBe(1);
  });

  it('يتعامل مع الدرس المحجوب الأحدث عند تعدد الدروس', () => {
    const d = decideNextStep(buildPath(), [quiz('l1', 10), quiz('l3', 20)])!;
    expect(d.lessonId).toBe('l3');
  });

  it('درس متخطى بالتشخيصي لا يكون الدرس التالي', () => {
    const skip = new LearningEvent({
      userId: 'u', type: 'plan_decision', payload: { decision: 'skip_lesson', lessonId: 'l1', reason: 'س' }, occurredAt: at(),
    });
    const d = decideNextStep(buildPath(), [skip])!;
    expect(d.lessonId).toBe('l2');
    expect(d.reason).toContain('تخطّيتَ 1');
  });

  it('انتهى المسار ← لا قرار', () => {
    expect(decideNextStep(buildPath(), [completed('l1'), completed('l2'), completed('l3')])).toBeNull();
  });

  it('بصمة الأدلة تتغير بتغير الأدلة وتثبت بثباتها', () => {
    const first = [quiz('l1', 40)];
    const same = decideNextStep(buildPath(), first)!.evidenceKey;
    expect(decideNextStep(buildPath(), first)!.evidenceKey).toBe(same);
    expect(decideNextStep(buildPath(), [...first, quiz('l1', 45)])!.evidenceKey).not.toBe(same);
  });

  it('يتجاهل محاولات دروس ليست من المسار أو بلا نسبة', () => {
    const odd = new LearningEvent({ userId: 'u', type: 'attempt_submitted', payload: { kind: 'quiz', lessonId: 'x', percent: 0 }, occurredAt: at() });
    const noPercent = new LearningEvent({ userId: 'u', type: 'attempt_submitted', payload: { kind: 'quiz', lessonId: 'l1' }, occurredAt: at() });
    expect(decideNextStep(buildPath(), [odd, noPercent])!.action).toBe('proceed');
  });
});

describe('المراجعة المتباعدة', () => {
  const DAY = 86_400_000;
  const base = new Date(2026, 5, 1, 12).getTime();
  const pass = (lessonId: string, offsetDays: number) =>
    new LearningEvent({ userId: 'u', type: 'attempt_submitted', payload: { kind: 'quiz', lessonId, percent: 90 }, occurredAt: new Date(base + offsetDays * DAY) });
  const day = (n: number) => new Date(base + n * DAY);

  it('لا مراجعة قبل حلول الفاصل (يوم واحد بعد أول نجاح)', () => {
    expect(decideNextStep(buildPath(), [pass('l1', 0)], day(0.5))!.action).toBe('proceed');
  });

  it('بعد يوم من أول نجاح ← مراجعة متباعدة للدرس', () => {
    const d = decideNextStep(buildPath(), [pass('l1', 0)], day(1.2))!;
    expect(d.action).toBe('spaced_review');
    expect(d.lessonId).toBe('l1');
    expect(d.reason).toContain('منذ يوم');
  });

  it('نجاح المراجعة يطيل الفاصل إلى 3 أيام', () => {
    const events = [pass('l1', 0), pass('l1', 1.2)];
    expect(decideNextStep(buildPath(), events, day(3))!.action).toBe('proceed');
    expect(decideNextStep(buildPath(), events, day(1.2 + 3.1))!.action).toBe('spaced_review');
  });

  it('الأكثر تأخرًا أولًا', () => {
    const d = decideNextStep(buildPath(), [pass('l2', 0), pass('l1', 2)], day(20))!;
    expect(d.lessonId).toBe('l2');
  });

  it('فشل المراجعة يسبق المراجعة المتباعدة (إعادة اختبار)', () => {
    const fail = new LearningEvent({ userId: 'u', type: 'attempt_submitted', payload: { kind: 'quiz', lessonId: 'l1', percent: 20 }, occurredAt: day(2) });
    expect(decideNextStep(buildPath(), [pass('l1', 0), fail], day(30))!.action).toBe('retake_quiz');
  });

  it('بلا now لا تُطبَّق المراجعة', () => {
    expect(decideNextStep(buildPath(), [pass('l1', 0)])!.action).toBe('proceed');
  });
});
