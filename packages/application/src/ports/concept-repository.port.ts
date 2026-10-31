/**
 * @file concept-repository.port.ts
 * @description منفذ مستودع المفاهيم (رسم المتطلبات السابقة). التنفيذ في Infrastructure.
 */

import type { Concept, ConceptId, PathId } from '@qalam/domain';

export interface ConceptRepositoryPort {
  /** حفظ أو تحديث مفهوم مع متطلباته السابقة */
  save(concept: Concept): Promise<void>;
  findById(id: ConceptId): Promise<Concept | null>;
  findAll(): Promise<Concept[]>;
  /** مفاهيم مسار واحد (المفهوم لا يُشارَك بين المسارات) */
  findByPath(pathId: PathId): Promise<Concept[]>;
  delete(id: ConceptId): Promise<void>;
}
