/**
 * @file get-lesson.usecase.ts
 * @description حالة استخدام استرجاع درس واحد داخل مسار، مع الدرس السابق والتالي في الترتيب.
 */

import type { Lesson, LessonId, Module, PathId } from '@qalam/domain';
import type { PathRepositoryPort } from '../ports/path-repository.port.js';

export interface GetLessonRequest {
  pathId: PathId;
  lessonId: LessonId;
}

export interface LessonRef {
  id: LessonId;
  title: string;
}

export interface GetLessonResponse {
  pathTitle: string;
  module: Module;
  lesson: Lesson;
  previous: LessonRef | null;
  next: LessonRef | null;
}

export class GetLessonUseCase {
  constructor(private readonly pathRepository: PathRepositoryPort) {}

  async execute(request: GetLessonRequest): Promise<GetLessonResponse> {
    const path = await this.pathRepository.findById(request.pathId);
    if (!path) {
      throw new Error(`المسار التعليمي ذو المعرّف "${request.pathId}" غير موجود`);
    }

    // تسطيح الدروس بترتيب المسار (الوحدات ثم الدروس) لاستخراج السابق والتالي
    const flat = path.modules.flatMap((module) => module.lessons.map((lesson) => ({ module, lesson })));
    const index = flat.findIndex((entry) => entry.lesson.id === request.lessonId);
    const current = flat[index];
    if (!current) {
      throw new Error(`الدرس ذو المعرّف "${request.lessonId}" غير موجود في هذا المسار`);
    }

    const toRef = (entry: (typeof flat)[number] | undefined): LessonRef | null =>
      entry ? { id: entry.lesson.id, title: entry.lesson.title } : null;

    return {
      pathTitle: path.title,
      module: current.module,
      lesson: current.lesson,
      previous: toRef(flat[index - 1]),
      next: toRef(flat[index + 1]),
    };
  }
}
