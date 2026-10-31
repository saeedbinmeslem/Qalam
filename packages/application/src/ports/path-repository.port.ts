/**
 * @file path-repository.port.ts
 * @description منفذ مستودع المسارات التعليمية (Path Repository Port)
 *
 * المنفذ (Port) في العمارة النظيفة هو واجهة (Interface) تعرّف ما تحتاجه
 * طبقة التطبيق من عمليات الحفظ والاسترجاع، دون أن تهتم بكيفية التنفيذ (Supabase أو ذاكرة أو ملفات).
 */

import type { LearningPath, LessonId, PathId } from '@qalam/domain';

export interface PathRepositoryPort {
  /**
   * حفظ أو تحديث مسار تعليمي
   */
  save(path: LearningPath): Promise<void>;

  /**
   * (اختياري) يحفظ صف درس واحد فقط من المسار المعطى، بدل إعادة كتابة المسار كله.
   * أسرع بكثير في المسارات الكبيرة، ولا يكتب فوق تعديلات المالك على غير هذا الدرس (توليد الملاحظات والملخصات).
   * من لا يدعمه تُستعمل `save` (انظر `persistLesson`).
   */
  saveLesson?(path: LearningPath, lessonId: LessonId): Promise<void>;

  /**
   * حذف مسار مع وحداته ودروسه (لا يخطئ إن لم يوجد)
   */
  delete(id: PathId): Promise<void>;

  /**
   * البحث عن مسار بواسطة معرّفه الفريد
   */
  findById(id: PathId): Promise<LearningPath | null>;

  /**
   * البحث عن مسارات مرتبطة بمجال أو هدف محدد
   */
  findBySubject(subject: string): Promise<LearningPath[]>;

  /**
   * استرجاع جميع المسارات المتاحة
   */
  findAll(): Promise<LearningPath[]>;
}
