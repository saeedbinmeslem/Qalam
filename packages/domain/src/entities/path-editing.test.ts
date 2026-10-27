import { describe, expect, it } from 'vitest';
import {
  createConceptId,
  createLessonId,
  createModuleId,
  createPathId,
} from '../value-objects/identifiers.js';
import { VideoSegment } from '../value-objects/video-segment.js';
import { Lesson } from './lesson.js';
import { LearningPath } from './learning-path.js';
import { Module } from './module.js';

const lesson = (id: string) =>
  new Lesson({
    id: createLessonId(id),
    title: id,
    conceptId: createConceptId('c'),
    segment: new VideoSegment({ videoId: 'abcdefghijk', startSeconds: 0, endSeconds: 60 }),
    sourceUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
    channelName: 'قناة',
    reviewedByHuman: true,
  });

function buildPath() {
  const path = new LearningPath({
    id: createPathId('p'),
    title: 'مسار',
    description: '',
    targetGoal: 'هدف',
    subject: 'عام',
  });
  for (const [i, name] of ['m1', 'm2', 'm3'].entries()) {
    const module = new Module({ id: createModuleId(name), title: name, description: '', orderIndex: i + 1 });
    module.addLesson(lesson(`${name}-a`));
    module.addLesson(lesson(`${name}-b`));
    path.addModule(module);
  }
  return path;
}

describe('تعديل المسار والوحدات والدروس', () => {
  it('Lesson.update يعيد نسخة جديدة ويحافظ على بقية الحقول', () => {
    const original = lesson('x');
    const changed = original.update({ title: 'جديد', reviewedByHuman: false });
    expect(changed).not.toBe(original);
    expect(changed.title).toBe('جديد');
    expect(changed.reviewedByHuman).toBe(false);
    expect(changed.channelName).toBe('قناة');
    expect(original.reviewedByHuman).toBe(true);
  });

  it('moveLesson يبدّل الموضع ولا يتجاوز الحافة', () => {
    const module = buildPath().modules[0]!;
    module.moveLesson(createLessonId('m1-b'), 'up');
    expect(module.lessons.map((l) => l.id)).toEqual(['m1-b', 'm1-a']);
    module.moveLesson(createLessonId('m1-b'), 'up');
    expect(module.lessons.map((l) => l.id)).toEqual(['m1-b', 'm1-a']);
  });

  it('removeLesson يحذف الدرس ويرفض المجهول', () => {
    const module = buildPath().modules[0]!;
    module.removeLesson(createLessonId('m1-a'));
    expect(module.lessonsCount).toBe(1);
    expect(() => module.removeLesson(createLessonId('zzz'))).toThrow();
  });

  it('removeModule يعيد ترقيم الوحدات 1..n', () => {
    const path = buildPath();
    path.removeModule(createModuleId('m1'));
    expect(path.modules.map((m) => [m.id, m.orderIndex])).toEqual([
      ['m2', 1],
      ['m3', 2],
    ]);
    expect(path.nextModuleOrderIndex).toBe(3);
  });

  it('moveModule يبدّل الترتيب ويعيد الترقيم', () => {
    const path = buildPath();
    path.moveModule(createModuleId('m3'), 'up');
    expect(path.modules.map((m) => [m.id, m.orderIndex])).toEqual([
      ['m1', 1],
      ['m3', 2],
      ['m2', 3],
    ]);
  });

  it('updateDetails يحفظ الوحدات والدروس', () => {
    const path = buildPath();
    const updated = path.updateDetails({ title: 'عنوان', description: 'و', targetGoal: 'هدف', subject: 'م' });
    expect(updated.title).toBe('عنوان');
    expect(updated.totalLessonsCount).toBe(6);
    expect(updated.createdAt).toBe(path.createdAt);
  });

  it('findLesson يعيد الدرس ووحدته', () => {
    const found = buildPath().findLesson(createLessonId('m2-b'));
    expect(found?.module.id).toBe('m2');
    expect(found?.lesson.title).toBe('m2-b');
  });
});
