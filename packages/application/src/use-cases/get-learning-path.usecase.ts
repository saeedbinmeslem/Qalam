/**
 * @file get-learning-path.usecase.ts
 * @description حالة استخدام استرجاع المسار التعليمي (GetLearningPath Use Case)
 *
 * حالة الاستخدام (Use Case) تمثّل عملية عمل محددة يطلبها المستخدم أو النظام.
 * تعتمد على المنافذ (Ports) عبر حقن التبعيات (Dependency Injection).
 */

import { LearningPath, PathId } from '@qalam/domain';
import { PathRepositoryPort } from '../ports/path-repository.port.js';

export interface GetLearningPathRequest {
  pathId: PathId;
}

export interface GetLearningPathResponse {
  path: LearningPath;
  totalModulesCount: number;
  totalLessonsCount: number;
}

export class GetLearningPathUseCase {
  constructor(private readonly pathRepository: PathRepositoryPort) {}

  /**
   * تنفيذ حالة الاستخدام
   */
  async execute(request: GetLearningPathRequest): Promise<GetLearningPathResponse> {
    const path = await this.pathRepository.findById(request.pathId);

    if (!path) {
      throw new Error(`المسار التعليمي ذو المعرّف "${request.pathId}" غير موجود`);
    }

    return {
      path,
      totalModulesCount: path.modules.length,
      totalLessonsCount: path.totalLessonsCount,
    };
  }
}
