import { describe, expect, it } from 'vitest';
import { Course } from '../entities/course.js';
import { LearningPath } from '../entities/learning-path.js';
import { Lesson } from '../entities/lesson.js';
import { Module } from '../entities/module.js';
import {
  createConceptId,
  createCourseId,
  createLessonId,
  createModuleId,
  createPathId,
} from '../value-objects/identifiers.js';
import { LearningEvent } from '../value-objects/learning-event.js';
import { VideoSegment } from '../value-objects/video-segment.js';
import { calculatePathProgress } from './path-progress.js';

const lesson = (id: string) =>
  new Lesson({
    id: createLessonId(id),
    title: id,
    segment: new VideoSegment({ videoId: 'abcdefghijk', startSeconds: 0, endSeconds: 60 }),
    sourceUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
    channelName: 'قناة',
  });

function buildPath(): LearningPath {
  const path = new LearningPath({
    id: createPathId('p'),
    title: 'مسار',
    description: '',
    targetGoal: 'هدف',
    subject: 'عام',
  });
  const m1 = new Module({ id: createModuleId('m1'), title: 'م1', description: '', orderIndex: 1 });
  m1.addLesson(lesson('a'));
  m1.addLesson(lesson('b'));
  const m2 = new Module({ id: createModuleId('m2'), title: 'م2', description: '', orderIndex: 2 });
  m2.addLesson(lesson('c'));
  m2.addLesson(lesson('d'));
  const course = new Course({ id: createCourseId('co'), conceptId: createConceptId('c'), title: 'ك', description: '', orderIndex: 1 });
  course.addModule(m1);
  course.addModule(m2);
  path.addCourse(course);
  return path;
}

const event = (type: 'lesson_completed' | 'lesson_opened', lessonId: unknown) =>
  new LearningEvent({ userId: 'u', type, payload: { lessonId }, occurredAt: new Date() });

describe('calculatePathProgress (تقدم المتعلم)', () => {
  it('بلا أحداث: صفر وأول درس هو التالي', () => {
    const progress = calculatePathProgress(buildPath(), []);
    expect(progress).toMatchObject({ completedCount: 0, totalCount: 4, percent: 0 });
    expect(progress.nextLesson?.id).toBe('a');
  });

  it('يحتسب الإكمال فقط، لا الفتح', () => {
    const progress = calculatePathProgress(buildPath(), [event('lesson_opened', 'a')]);
    expect(progress.completedCount).toBe(0);
  });

  it('لا يعدّ الإكمال المكرر ولا دروس مسارات أخرى', () => {
    const progress = calculatePathProgress(buildPath(), [
      event('lesson_completed', 'a'),
      event('lesson_completed', 'a'),
      event('lesson_completed', 'من-مسار-آخر'),
      event('lesson_completed', 42),
    ]);
    expect(progress.completedCount).toBe(1);
    expect(progress.percent).toBe(25);
  });

  it('التالي هو أول غير مكتمل بترتيب المسار حتى لو أُكمل ما بعده', () => {
    const progress = calculatePathProgress(buildPath(), [
      event('lesson_completed', 'a'),
      event('lesson_completed', 'c'),
    ]);
    expect(progress.nextLesson?.id).toBe('b');
  });

  it('الدروس المتخطاة بقرار خطة تُحتسب في التقدم لا في الإكمال، ويتخطاها «التالي»', () => {
    const skip = (lessonId: string) =>
      new LearningEvent({
        userId: 'u',
        type: 'plan_decision',
        payload: { decision: 'skip_lesson', lessonId, reason: 'أتقن المفهوم' },
        occurredAt: new Date(),
      });
    const progress = calculatePathProgress(buildPath(), [skip('a'), skip('b'), event('lesson_completed', 'b'), skip('خارج')]);
    expect(progress).toMatchObject({ completedCount: 1, skippedCount: 1, percent: 50 });
    expect([...progress.skippedLessonIds]).toEqual(['a']); // b أُكمل فعلًا فلا يُعدّ متخطى
    expect(progress.nextLesson?.id).toBe('c');
  });

  it('عند اكتمال المسار: 100% ولا درس تالٍ', () => {
    const all = ['a', 'b', 'c', 'd'].map((id) => event('lesson_completed', id));
    const progress = calculatePathProgress(buildPath(), all);
    expect(progress.percent).toBe(100);
    expect(progress.nextLesson).toBeNull();
  });
});

describe('نتائج الاختبارات في التقدم', () => {
  it('يعرض آخر نسبة لكل درس ويتجاهل غير الاختبارات', () => {
    const path = buildPath();
    const mk = (payload: Record<string, unknown>, s: number) =>
      new LearningEvent({ userId: 'u', type: 'attempt_submitted', payload, occurredAt: new Date(2026, 0, 1, 0, 0, s) });
    const progress = calculatePathProgress(path, [
      mk({ kind: 'quiz', lessonId: 'a', percent: 40 }, 1),
      mk({ kind: 'quiz', lessonId: 'a', percent: 80 }, 2),
      mk({ kind: 'exercise', lessonId: 'a', percent: 5 }, 3),
    ]);
    expect(progress.quizPercentByLesson.get('a')).toBe(80);
  });
});
