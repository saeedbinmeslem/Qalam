/**
 * @file get-learning-path.usecase.ts
 * @description حالة استخدام استرجاع المسار التعليمي (GetLearningPath Use Case)
 *
 * حالة الاستخدام (Use Case) تمثّل عملية عمل محددة يطلبها المستخدم أو النظام.
 * تعتمد على المنافذ (Ports) عبر حقن التبعيات (Dependency Injection).
 */

import type { Concept, LearningPath, PathId } from '@qalam/domain';
import type { ConceptRepositoryPort } from '../ports/concept-repository.port.js';
import type { PathRepositoryPort } from '../ports/path-repository.port.js';

export interface GetLearningPathRequest {
  pathId: PathId;
}

export interface GetLearningPathResponse {
  path: LearningPath;
  /** مفاهيم المسار مرتبة بالمستوى (فارغة إن لم يُمرَّر مستودع المفاهيم) */
  concepts: Concept[];
  totalModulesCount: number;
  totalLessonsCount: number;
}

export class GetLearningPathUseCase {
  constructor(
    private readonly pathRepository: PathRepositoryPort,
    private readonly conceptRepository?: ConceptRepositoryPort,
  ) {}

  /**
   * تنفيذ حالة الاستخدام
   */
  async execute(request: GetLearningPathRequest): Promise<GetLearningPathResponse> {
    const path = await this.pathRepository.findById(request.pathId);

    if (!path) {
      throw new Error(`المسار التعليمي ذو المعرّف "${request.pathId}" غير موجود`);
    }

    const concepts = (await this.conceptRepository?.findByPath(path.id)) ?? [];
    concepts.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, 'ar'));

    return {
      path,
      concepts,
      totalModulesCount: path.modules.length,
      totalLessonsCount: path.totalLessonsCount,
    };
  }
}
