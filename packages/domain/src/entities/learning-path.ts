/**
 * @file learning-path.ts
 * @description كيان المسار التعليمي (Learning Path Entity)
 *
 * المسار التعليمي يمثل خريطة طريق كاملة للوصول إلى هدف تعليمي محدد،
 * مقسم إلى وحدات ودروس مرتبة منطقياً حسب متطلبات الفهم المسبق.
 */

import type { LessonId, ModuleId, PathId } from '../value-objects/identifiers.js';
import type { Lesson } from './lesson.js';
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
   * مجموع مدد المقاطع المطلوب مشاهدتها في المسار بالثواني
   */
  get totalDurationSeconds(): number {
    return this._modules.reduce((acc, m) => acc + m.totalDurationSeconds, 0);
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

  /** ترتيب الوحدة التالية (آخر ترتيب + 1) */
  get nextModuleOrderIndex(): number {
    return this._modules.reduce((max, m) => Math.max(max, m.orderIndex), 0) + 1;
  }

  findModule(moduleId: ModuleId): Module | undefined {
    return this._modules.find((m) => m.id === moduleId);
  }

  /** الدرس ووحدته من معرّف الدرس */
  findLesson(lessonId: LessonId): { module: Module; lesson: Lesson } | undefined {
    for (const module of this._modules) {
      const lesson = module.findLesson(lessonId);
      if (lesson) return { module, lesson };
    }
    return undefined;
  }

  /** نسخة جديدة ببيانات المسار المعدَّلة وبنفس الوحدات */
  updateDetails(details: {
    title: string;
    description: string;
    targetGoal: string;
    subject: string;
  }): LearningPath {
    return new LearningPath({
      ...details,
      id: this.id,
      modules: this._modules,
      createdAt: this.createdAt,
      updatedAt: new Date(),
    });
  }

  /** استبدال وحدة بنسخة معدّلة منها مع بقاء ترتيبها */
  replaceModule(module: Module): void {
    this._modules[this.indexOfModule(module.id)] = module;
  }

  /** حذف وحدة ثم إعادة ترقيم الباقي 1..n */
  removeModule(moduleId: ModuleId): void {
    this._modules.splice(this.indexOfModule(moduleId), 1);
    this.renumber();
  }

  /** تحريك وحدة موضعًا واحدًا؛ لا شيء يحدث عند الحافة */
  moveModule(moduleId: ModuleId, direction: 'up' | 'down'): void {
    const index = this.indexOfModule(moduleId);
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= this._modules.length) return;
    const [module] = this._modules.splice(index, 1) as [Module];
    this._modules.splice(target, 0, module);
    this.renumber();
  }

  private indexOfModule(moduleId: ModuleId): number {
    const index = this._modules.findIndex((m) => m.id === moduleId);
    if (index === -1) throw new Error(`الوحدة ${moduleId} غير موجودة في هذا المسار`);
    return index;
  }

  private renumber(): void {
    this._modules = this._modules.map((m, i) => (m.orderIndex === i + 1 ? m : m.withOrderIndex(i + 1)));
  }
}
