import { describe, expect, it } from 'vitest';
import { createConceptId, createLessonId, createModuleId, createPathId } from '../value-objects/identifiers.js';
import { VideoSegment } from '../value-objects/video-segment.js';
import { Lesson } from './lesson.js';
import { Module } from './module.js';
import { LearningPath } from './learning-path.js';

function lesson(id: string, start: number, end: number): Lesson {
  return new Lesson({
    id: createLessonId(id),
    title: id,
    conceptId: createConceptId('c'),
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
    path.addModule(m1);
    path.addModule(m2);

    expect(m1.totalDurationSeconds).toBe(360);
    expect(path.totalDurationSeconds).toBe(480);
  });

  it('مسار بلا وحدات مدته صفر', () => {
    const path = new LearningPath({ id: createPathId('p'), title: 'مسار', description: '', targetGoal: 'هدف', subject: 'عام' });
    expect(path.totalDurationSeconds).toBe(0);
  });
});
