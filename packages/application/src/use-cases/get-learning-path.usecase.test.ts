import { describe, expect, it } from 'vitest';
import {
  createConceptId,
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
import { GetLearningPathUseCase } from './get-learning-path.usecase.js';

/**
 * تنفيذ وهمي (Fake / In-Memory) لمنفذ مستودع المسارات
 * يُستخدم للاختبارات السريعة دون الحاجة إلى قاعدة بيانات أو شبكة
 */
class InMemoryPathRepository implements PathRepositoryPort {
  private paths = new Map<string, LearningPath>();

  async delete(): Promise<void> {}

  async save(path: LearningPath): Promise<void> {
    this.paths.set(path.id, path);
  }

  async findById(id: PathId): Promise<LearningPath | null> {
    return this.paths.get(id) ?? null;
  }

  async findBySubject(subject: string): Promise<LearningPath[]> {
    return Array.from(this.paths.values()).filter((p) => p.subject === subject);
  }

  async findAll(): Promise<LearningPath[]> {
    return Array.from(this.paths.values());
  }
}

describe('GetLearningPathUseCase (حالة استخدام استرجاع المسار)', () => {
  it('يسترجع المسار التعليمي مع عدد الوحدات والدروس بشكل صحيح', async () => {
    const repo = new InMemoryPathRepository();
    const useCase = new GetLearningPathUseCase(repo);

    const pathId = createPathId('cpp-intro');
    const samplePath = new LearningPath({
      id: pathId,
      title: 'مدخل إلى لغة C++',
      description: 'مسار تمهيدي لتعلم أساسيات البرمجة بلغة C++',
      targetGoal: 'إتقان الأساسيات البرمجية وحل المشكلات',
      subject: 'C++',
    });

    const module1 = new Module({
      id: createModuleId('mod-1'),
      title: 'المتغيرات والعمليات',
      description: 'شرح الأنواع الأساسية والعمليات الحسابية',
      orderIndex: 1,
    });

    const lesson1 = new Lesson({
      id: createLessonId('les-1'),
      title: 'المتغيرات وأنواع البيانات',
      conceptId: createConceptId('variables'),
      segment: new VideoSegment({
        videoId: 'dQw4w9WgXcQ',
        startSeconds: 0,
        endSeconds: 120,
      }),
      sourceUrl: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
      channelName: 'قناة البرمجة العربية',
    });

    module1.addLesson(lesson1);
    samplePath.addModule(module1);

    await repo.save(samplePath);

    const result = await useCase.execute({ pathId });

    expect(result.path.title).toBe('مدخل إلى لغة C++');
    expect(result.totalModulesCount).toBe(1);
    expect(result.totalLessonsCount).toBe(1);
  });

  it('يرمي استثناء عندما يكون المسار غير موجود', async () => {
    const repo = new InMemoryPathRepository();
    const useCase = new GetLearningPathUseCase(repo);

    await expect(
      useCase.execute({ pathId: createPathId('non-existent') })
    ).rejects.toThrowError(/غير موجود/);
  });
});
