import { describe, expect, it } from 'vitest';
import { createConceptId, createCourseId, createLessonId, createModuleId, createPathId } from '../value-objects/identifiers.js';
import { VideoSegment } from '../value-objects/video-segment.js';
import { Course } from './course.js';
import { Lesson } from './lesson.js';
import { Module } from './module.js';
import { LearningPath } from './learning-path.js';

function lesson(id: string, start: number, end: number): Lesson {
  return new Lesson({
    id: createLessonId(id),
    title: id,
    segment: new VideoSegment({ videoId: 'abc', startSeconds: start, endSeconds: end }),
    sourceUrl: 'https://www.youtube.com/watch?v=abc',
    channelName: 'قناة',
  });
}

describe('LearningPath.totalDurationSeconds (مدة المسار)', () => {
  it('يجمع مدد مقاطع كل الدروس في كل الوحدات', () => {
    const m1 = new Module({ id: createModuleId('m1'), title: 'أ', description: '', orderIndex: 1 });
    m1.addLesson(lesson('l1', 0, 300));
    m1.addLesson(lesson('l2', 100, 160));
    const m2 = new Module({ id: createModuleId('m2'), title: 'ب', description: '', orderIndex: 2 });
    m2.addLesson(lesson('l3', 10, 130));
    const path = new LearningPath({ id: createPathId('p'), title: 'مسار', description: '', targetGoal: 'هدف', subject: 'عام' });
    const course = new Course({ id: createCourseId('co1'), conceptId: createConceptId('c'), title: 'ك', description: '', orderIndex: 1 });
    course.addModule(m1);
    course.addModule(m2);
    path.addCourse(course);

    expect(m1.totalDurationSeconds).toBe(360);
    expect(path.totalDurationSeconds).toBe(480);
  });

  it('مسار بلا وحدات مدته صفر', () => {
    const path = new LearningPath({ id: createPathId('p'), title: 'مسار', description: '', targetGoal: 'هدف', subject: 'عام' });
    expect(path.totalDurationSeconds).toBe(0);
  });
});

describe('LearningPath: مسار ← كورس ← وحدة ← درس', () => {
  function build() {
    const path = new LearningPath({ id: createPathId('p'), title: 'مسار', description: '', targetGoal: 'هدف', subject: 'عام' });
    const course = (id: string, concept: string, order: number, lessonIds: string[]) => {
      const c = new Course({ id: createCourseId(id), conceptId: createConceptId(concept), title: id, description: '', orderIndex: order });
      const m = new Module({ id: createModuleId(`m-${id}`), title: 'و', description: '', orderIndex: 1 });
      for (const l of lessonIds) m.addLesson(lesson(l, 0, 60));
      c.addModule(m);
      return c;
    };
    path.addCourse(course('c2', 'b', 2, ['l3']));
    path.addCourse(course('c1', 'a', 1, ['l1', 'l2']));
    return path;
  }

  it('الكورسات والوحدات المسطّحة بترتيب الكورسات', () => {
    const path = build();
    expect(path.courses.map((c) => c.id)).toEqual(['c1', 'c2']);
    expect(path.modules.map((m) => m.id)).toEqual(['m-c1', 'm-c2']);
    expect(path.totalLessonsCount).toBe(3);
    expect(path.conceptIds).toEqual(['a', 'b']);
  });

  it('مفهوم الدرس هو مفهوم كورسه', () => {
    const path = build();
    expect(path.conceptIdOfLesson(createLessonId('l2'))).toBe('a');
    expect(path.conceptIdOfLesson(createLessonId('l3'))).toBe('b');
    expect(path.conceptIdOfLesson(createLessonId('zzz'))).toBeUndefined();
    expect(path.findLesson(createLessonId('l3'))?.course.id).toBe('c2');
    expect(Object.fromEntries(path.lessonConceptMap())).toEqual({ l1: 'a', l2: 'a', l3: 'b' });
  });

  it('حذف كورس يعيد ترقيم الباقي، ويرفض كورسًا مكررًا أو مجهولًا', () => {
    const path = build();
    expect(() => path.addCourse(path.courses[0]!)).toThrow();
    path.removeCourse(createCourseId('c1'));
    expect(path.courses.map((c) => [c.id, c.orderIndex])).toEqual([['c2', 1]]);
    expect(path.nextCourseOrderIndex).toBe(2);
    expect(() => path.removeCourse(createCourseId('zzz'))).toThrow();
  });

  it('تحريك كورس يبدّل الترتيب ولا يتجاوز الحافة', () => {
    const path = build();
    path.moveCourse(createCourseId('c2'), 'up');
    expect(path.courses.map((c) => c.id)).toEqual(['c2', 'c1']);
    path.moveCourse(createCourseId('c2'), 'up');
    expect(path.courses.map((c) => c.id)).toEqual(['c2', 'c1']);
  });

  it('الوحدة تُحلّ عبر كورسها: استبدال وتحريك وحذف', () => {
    const path = build();
    const module = path.findModule(createModuleId('m-c1'))!;
    expect(path.courseOfModule(module.id)?.id).toBe('c1');
    path.replaceModule(module.updateDetails({ title: 'جديد', description: '' }));
    expect(path.findModule(module.id)?.title).toBe('جديد');
    path.removeModule(module.id);
    expect(path.totalLessonsCount).toBe(1);
    expect(() => path.removeModule(module.id)).toThrow();
  });
});
