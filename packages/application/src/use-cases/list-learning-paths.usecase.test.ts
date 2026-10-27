import { describe, expect, it } from 'vitest';
import { createPathId, LearningPath, type PathId } from '@qalam/domain';
import type { PathRepositoryPort } from '../ports/path-repository.port.js';
import { ListLearningPathsUseCase } from './list-learning-paths.usecase.js';

class FakePathRepository implements PathRepositoryPort {
  constructor(private readonly paths: LearningPath[]) {}
  async save(): Promise<void> {}
  async delete(): Promise<void> {}
  async findById(id: PathId): Promise<LearningPath | null> {
    return this.paths.find((p) => p.id === id) ?? null;
  }
  async findBySubject(): Promise<LearningPath[]> {
    return this.paths;
  }
  async findAll(): Promise<LearningPath[]> {
    return this.paths;
  }
}

describe('ListLearningPathsUseCase (عرض المسارات)', () => {
  it('يعيد ملخصاً لكل مسار', async () => {
    const path = new LearningPath({
      id: createPathId('p1'),
      title: 'مسار تجريبي',
      description: 'وصف',
      targetGoal: 'هدف',
      subject: 'عام',
    });
    const result = await new ListLearningPathsUseCase(new FakePathRepository([path])).execute();
    expect(result).toEqual([
      {
        id: 'p1',
        title: 'مسار تجريبي',
        description: 'وصف',
        subject: 'عام',
        modulesCount: 0,
        lessonsCount: 0,
      reviewedLessonsCount: 0,
        totalDurationSeconds: 0,
      },
    ]);
  });

  it('يعيد قائمة فارغة عند عدم وجود مسارات', async () => {
    expect(await new ListLearningPathsUseCase(new FakePathRepository([])).execute()).toEqual([]);
  });
});
