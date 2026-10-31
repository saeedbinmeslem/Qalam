/**
 * @file identifiers.ts
 * @description معرّفات فريدة مُميّزة بالنوع (Branded Types)
 *
 * لماذا نستخدم Branded Types بدلاً من مجرد string؟
 * إذا كانت جميع المعرّفات مجرد string، قد نمرر بالخطأ معرّف درس (LessonId)
 * إلى دالة تتوقع معرّف مفهوم (ConceptId)، ولن يكتشف TypeScript هذا الخطأ!
 * باستخدام Branded Types، يُلزمنا المترجم بتمرير المعرّف الصحيح دائمًا.
 */

declare const brand: unique symbol;

export type Brand<T, TBrand> = T & { readonly [brand]: TBrand };

/** معرّف المفهوم التعليمي */
export type ConceptId = Brand<string, 'ConceptId'>;

/** دالة مساعدة لإنشاء معرّف مفهوم */
export function createConceptId(id: string): ConceptId {
  if (!id || id.trim().length === 0) {
    throw new Error('معرّف المفهوم لا يمكن أن يكون فارغاً');
  }
  return id as ConceptId;
}

/** معرّف الدرس */
export type LessonId = Brand<string, 'LessonId'>;

export function createLessonId(id: string): LessonId {
  if (!id || id.trim().length === 0) {
    throw new Error('معرّف الدرس لا يمكن أن يكون فارغاً');
  }
  return id as LessonId;
}

/** معرّف الكورس (مجموعة وحدات تغطي مفهومًا واحدًا داخل مسار) */
export type CourseId = Brand<string, 'CourseId'>;

export function createCourseId(id: string): CourseId {
  if (!id || id.trim().length === 0) {
    throw new Error('معرّف الكورس لا يمكن أن يكون فارغاً');
  }
  return id as CourseId;
}

/** معرّف الوحدة التعليمية */
export type ModuleId = Brand<string, 'ModuleId'>;

export function createModuleId(id: string): ModuleId {
  if (!id || id.trim().length === 0) {
    throw new Error('معرّف الوحدة لا يمكن أن يكون فارغاً');
  }
  return id as ModuleId;
}

/** معرّف المسار التعليمي */
export type PathId = Brand<string, 'PathId'>;

export function createPathId(id: string): PathId {
  if (!id || id.trim().length === 0) {
    throw new Error('معرّف المسار لا يمكن أن يكون فارغاً');
  }
  return id as PathId;
}

/** معرّف المتعلّم */
export type LearnerId = Brand<string, 'LearnerId'>;

export function createLearnerId(id: string): LearnerId {
  if (!id || id.trim().length === 0) {
    throw new Error('معرّف المتعلّم لا يمكن أن يكون فارغاً');
  }
  return id as LearnerId;
}

/** معرّف سؤال الاختبار */
export type QuestionId = Brand<string, 'QuestionId'>;

export function createQuestionId(id: string): QuestionId {
  if (!id || id.trim().length === 0) {
    throw new Error('معرّف السؤال لا يمكن أن يكون فارغاً');
  }
  return id as QuestionId;
}

/** معرّف التمرين */
export type ExerciseId = Brand<string, 'ExerciseId'>;

export function createExerciseId(id: string): ExerciseId {
  if (!id || id.trim().length === 0) {
    throw new Error('معرّف التمرين لا يمكن أن يكون فارغاً');
  }
  return id as ExerciseId;
}
