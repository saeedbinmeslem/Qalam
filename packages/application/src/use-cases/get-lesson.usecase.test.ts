import { describe, expect, it } from 'vitest';
import {
  createLessonId,
  createModuleId,
  createPathId,
  LearningPath,
  Lesson,
  Module,
  VideoSegment,
  type PathId,
} from '@qalam/domain';
import type { PathRepositoryPort } from '../ports/path-repository.port.js';
import { GetLessonUseCase } from './get-lesson.usecase.js';
import { addModule } from '../test-support/path-builder.js';

class FakePathRepository implements PathRepositoryPort {
  constructor(private readonly path: LearningPath) {}
  async save(): Promise<void> {}
  async delete(): Promise<void> {}
  async findById(id: PathId): Promise<LearningPath | null> {
    return id === this.path.id ? this.path : null;
  }
  async findBySubject(): Promise<LearningPath[]> {
    return [this.path];
  }
  async findAll(): Promise<LearningPath[]> {
    return [this.path];
  }
}

function lesson(id: string): Lesson {
  return new Lesson({
    id: createLessonId(id),
    title: `درس ${id}`,
    segment: new VideoSegment({ videoId: 'abc', startSeconds: 0, endSeconds: 60 }),
    sourceUrl: 'https://www.youtube.com/watch?v=abc',
    channelName: 'قناة',
  });
}

function buildPath(): LearningPath {
  const m1 = new Module({ id: createModuleId('m1'), title: 'أ', description: '', orderIndex: 1 });
  m1.addLesson(lesson('l1'));
  m1.addLesson(lesson('l2'));
  const m2 = new Module({ id: createModuleId('m2'), title: 'ب', description: '', orderIndex: 2 });
  m2.addLesson(lesson('l3'));
  const path = new LearningPath({ id: createPathId('p'), title: 'مسار', description: '', targetGoal: 'هدف', subject: 'عام' });
  addModule(path, m1);
  addModule(path, m2);
  return path;
}

describe('GetLessonUseCase (استرجاع درس)', () => {
  const useCase = new GetLessonUseCase(new FakePathRepository(buildPath()));

  it('يعيد الدرس ووحدته مع السابق والتالي عبر حدود الوحدات', async () => {
    const result = await useCase.execute({ pathId: createPathId('p'), lessonId: createLessonId('l2') });
    expect(result.module.id).toBe('m1');
    expect(result.previous?.id).toBe('l1');
    expect(result.next?.id).toBe('l3');
  });

  it('أول درس بلا سابق وآخر درس بلا تالٍ', async () => {
    const first = await useCase.execute({ pathId: createPathId('p'), lessonId: createLessonId('l1') });
    const last = await useCase.execute({ pathId: createPathId('p'), lessonId: createLessonId('l3') });
    expect(first.previous).toBeNull();
    expect(last.next).toBeNull();
  });

  it('يرفض مساراً أو درساً غير موجود', async () => {
    await expect(useCase.execute({ pathId: createPathId('x'), lessonId: createLessonId('l1') })).rejects.toThrow();
    await expect(useCase.execute({ pathId: createPathId('p'), lessonId: createLessonId('zz') })).rejects.toThrow();
  });
});
