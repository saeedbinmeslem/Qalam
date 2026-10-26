/**
 * @file learning-path.ts
 * @description كيان المسار التعليمي (Learning Path Entity)
 *
 * المسار التعليمي يمثل خريطة طريق كاملة للوصول إلى هدف تعليمي محدد،
 * مقسم إلى وحدات ودروس مرتبة منطقياً حسب متطلبات الفهم المسبق.
 */

import { PathId } from '../value-objects/identifiers.js';
import { Module } from './module.js';

export interface LearningPathProps {
  id: PathId;
  /** عنوان المسار بالعربية (مثال: أساسيات C++ للمبتدئين) */
  title: string;
  /** وصف المسار والفائدة المتوقعة منه */
  description: string;
  /** الهدف التعليمي المستهدف للمتعلم */
  targetGoal: string;
  /** لغة البرمجة أو المجال المستهدف */
  subject: string;
  /** الوحدات المكونة للمسار */
  modules?: Module[];
  createdAt?: Date;
  updatedAt?: Date;
}

export class LearningPath {
  readonly id: PathId;
  readonly title: string;
  readonly description: string;
  readonly targetGoal: string;
  readonly subject: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  private _modules: Module[];

  constructor(props: LearningPathProps) {
    if (!props.title || props.title.trim().length === 0) {
      throw new Error('عنوان المسار مطلوب ولا يمكن أن يكون فارغاً');
    }

    if (!props.targetGoal || props.targetGoal.trim().length === 0) {
      throw new Error('الهدف التعليمي للمسار مطلوب');
    }

    this.id = props.id;
    this.title = props.title.trim();
    this.description = props.description.trim();
    this.targetGoal = props.targetGoal.trim();
    this.subject = props.subject.trim();
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
    this._modules = [...(props.modules ?? [])].sort(
      (a, b) => a.orderIndex - b.orderIndex
    );
  }

  /**
   * قائمة الوحدات مرتبة حسب orderIndex
   */
  get modules(): readonly Module[] {
    return Object.freeze([...this._modules]);
  }

  /**
   * إجمالي عدد الدروس في المسار كاملاً
   */
  get totalLessonsCount(): number {
    return this._modules.reduce((acc, m) => acc + m.lessonsCount, 0);
  }

  /**
   * إضافة وحدة جديدة إلى المسار مع الحفاظ على الترتيب
   */
  addModule(module: Module): void {
    if (this._modules.some((m) => m.id === module.id)) {
      throw new Error(`الوحدة ذات المعرّف ${module.id} موجودة بالفعل في هذا المسار`);
    }
    this._modules.push(module);
    this._modules.sort((a, b) => a.orderIndex - b.orderIndex);
  }
}
