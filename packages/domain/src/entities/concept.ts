/**
 * @file concept.ts
 * @description كيان المفهوم التعليمي (Concept Entity)
 *
 * المفهوم محور تعلّم داخل **مسار واحد** (لا مفاهيم عامة)، ويضم كورسًا أو أكثر. المسار يتكوّن من رسم بياني
 * من مفاهيمه (Concept Graph) ذات متطلبات سابقة من المسار نفسه.
 */

import type { ConceptId, PathId } from '../value-objects/identifiers.js';

export interface ConceptProps {
  id: ConceptId;
  /** المسار الذي يتبعه المفهوم (المفهوم لا يُشارَك بين المسارات) */
  pathId: PathId;
  /** اسم المفهوم بالعربية (مثال: الشروط والعبارات الشرطية) */
  name: string;
  /** شرح مبسّط للمفهوم */
  description: string;
  /** المستوى التقديري (1: مبتدئ، 2: متوسط، 3: متقدم) */
  level: number;
  /** معرّفات المفاهيم التي يجب إتقانها قبل هذا المفهوم (المتطلبات السابقة) */
  prerequisiteIds?: ConceptId[];
  createdAt?: Date;
}

export class Concept {
  readonly id: ConceptId;
  readonly pathId: PathId;
  readonly name: string;
  readonly description: string;
  readonly level: number;
  readonly prerequisiteIds: readonly ConceptId[];
  readonly createdAt: Date;

  constructor(props: ConceptProps) {
    if (!props.name || props.name.trim().length === 0) {
      throw new Error('اسم المفهوم مطلوب ولا يمكن أن يكون فارغاً');
    }

    if (props.level < 1) {
      throw new Error('مستوى المفهوم يجب أن يكون 1 أو أعلى');
    }

    this.id = props.id;
    this.pathId = props.pathId;
    this.name = props.name.trim();
    this.description = props.description.trim();
    this.level = props.level;
    this.prerequisiteIds = Object.freeze([...(props.prerequisiteIds ?? [])]);
    this.createdAt = props.createdAt ?? new Date();
  }

  /**
   * التحقق مما إذا كان هناك متطلب سابق محدد
   */
  hasPrerequisite(prerequisiteId: ConceptId): boolean {
    return this.prerequisiteIds.includes(prerequisiteId);
  }

  /** نسخة جديدة بالتعديلات (المعرّف وتاريخ الإنشاء ثابتان) */
  update(changes: Partial<Omit<ConceptProps, 'id' | 'pathId' | 'createdAt'>>): Concept {
    return new Concept({
      id: this.id,
      pathId: this.pathId,
      name: this.name,
      description: this.description,
      level: this.level,
      prerequisiteIds: [...this.prerequisiteIds],
      createdAt: this.createdAt,
      ...changes,
    });
  }
}
