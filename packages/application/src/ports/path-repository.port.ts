/**
 * @file path-repository.port.ts
 * @description منفذ مستودع المسارات التعليمية (Path Repository Port)
 *
 * المنفذ (Port) في العمارة النظيفة هو واجهة (Interface) تعرّف ما تحتاجه
 * طبقة التطبيق من عمليات الحفظ والاسترجاع، دون أن تهتم بكيفية التنفيذ (Supabase أو ذاكرة أو ملفات).
 */

import type { LearningPath, PathId } from '@qalam/domain';

export interface PathRepositoryPort {
  /**
   * حفظ أو تحديث مسار تعليمي
   */
  save(path: LearningPath): Promise<void>;

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
