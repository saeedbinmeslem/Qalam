import { describe, expect, it } from 'vitest';
import {
  LearningEvent,
  LearningPath,
  Lesson,
  Module,
  VideoSegment,
  createConceptId,
  createLessonId,
  createModuleId,
  createPathId,
  type LearningEventType,
  type PathId,
} from '@qalam/domain';
import type { EventReaderPort } from '../ports/event-reader.port.js';
import type { PathRepositoryPort } from '../ports/path-repository.port.js';
import { GetPathProgressUseCase } from './get-path-progress.usecase.js';

function samplePath(): LearningPath {
  const path = new LearningPath({ id: createPathId('p1'), title: 'م', description: '', targetGoal: 'هدف', subject: 'عام' });
  const module = new Module({ id: createModuleId('m1'), title: 'وحدة', description: '', orderIndex: 1 });
  for (const id of ['a', 'b']) {
    module.addLesson(
      new Lesson({
        id: createLessonId(id),
        title: id,
        conceptId: createConceptId('c'),
        segment: new VideoSegment({ videoId: 'abcdefghijk', startSeconds: 0, endSeconds: 60 }),
        sourceUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
        channelName: 'قناة',
      }),
    );
  }
  path.addModule(module);
  return path;
}

const paths: PathRepositoryPort = {
  save: async () => {},
  delete: async () => {},
  findById: async (id: PathId) => (id === 'p1' ? samplePath() : null),
  findBySubject: async () => [],
  findAll: async () => [],
};

function readerOf(events: LearningEvent[]): EventReaderPort & { askedFor: unknown[] } {
  const askedFor: unknown[] = [];
  return {
    askedFor,
    listByUser: async (userId: string, types?: readonly LearningEventType[]) => {
      askedFor.push({ userId, types });
      return events.filter((e) => e.userId === userId);
    },
  };
}

const completed = (userId: string, lessonId: string) =>
  new LearningEvent({ userId, type: 'lesson_completed', payload: { lessonId }, occurredAt: new Date() });

describe('GetPathProgressUseCase (تقدم المسار)', () => {
  it('يحسب تقدم المستخدم المطلوب فقط', async () => {
    const reader = readerOf([completed('u1', 'a'), completed('u2', 'a'), completed('u2', 'b')]);
    const progress = await new GetPathProgressUseCase(paths, reader).execute({
      userId: 'u1',
      pathId: createPathId('p1'),
    });
    expect(progress.completedCount).toBe(1);
    expect(progress.percent).toBe(50);
    expect(progress.nextLesson?.id).toBe('b');
    expect(reader.askedFor).toEqual([{ userId: 'u1', types: ['lesson_completed', 'plan_decision'] }]);
  });

  it('يرفض مسارًا غير موجود', async () => {
    await expect(
      new GetPathProgressUseCase(paths, readerOf([])).execute({ userId: 'u1', pathId: createPathId('zzz') }),
    ).rejects.toThrow('غير موجود');
  });
});
