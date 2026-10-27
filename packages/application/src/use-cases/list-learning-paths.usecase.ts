/**
 * @file list-learning-paths.usecase.ts
 * @description حالة استخدام عرض المسارات المتاحة (ملخصات خفيفة للصفحة الرئيسية).
 */

import type { PathId } from '@qalam/domain';
import type { PathRepositoryPort } from '../ports/path-repository.port.js';

export interface LearningPathSummary {
  id: PathId;
  title: string;
  description: string;
  subject: string;
  modulesCount: number;
  lessonsCount: number;
  /** عدد الدروس التي اعتمدها المالك بعد مراجعتها (يعرضه لوحة التحكم) */
  reviewedLessonsCount: number;
  totalDurationSeconds: number;
}

export class ListLearningPathsUseCase {
  constructor(private readonly pathRepository: PathRepositoryPort) {}

  async execute(): Promise<LearningPathSummary[]> {
    const paths = await this.pathRepository.findAll();
    return paths.map((path) => ({
      id: path.id,
      title: path.title,
      description: path.description,
      subject: path.subject,
      modulesCount: path.modules.length,
      lessonsCount: path.totalLessonsCount,
      reviewedLessonsCount: path.modules.reduce(
        (sum, m) => sum + m.lessons.filter((l) => l.reviewedByHuman).length,
        0,
      ),
      totalDurationSeconds: path.totalDurationSeconds,
    }));
  }
}
