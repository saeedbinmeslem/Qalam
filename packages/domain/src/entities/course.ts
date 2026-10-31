/**
 * @file course.ts
 * @description كيان الكورس (Course Entity)
 *
 * الهيكل: مسار ← مفاهيم ← كورسات ← وحدات ← دروس. الكورس يتبع **مفهومًا واحدًا** كاملًا (لا يُنسب كل درس
 * بمفرده إلى مفهوم)، ويضم وحدات مرتبة بدروسها. مثال: كورس «النظام الثنائي من الصفر» ضمن مفهوم «أنظمة العد».
 */

import type { ConceptId, CourseId, LessonId, ModuleId } from '../value-objects/identifiers.js';
import type { Lesson } from './lesson.js';
import { Module } from './module.js';

export interface CourseProps {
  id: CourseId;
  /** المفهوم الذي يغطيه الكورس كاملًا */
  conceptId: ConceptId;
  title: string;
  description: string;
  /** ترتيب الكورس داخل المسار (يبدأ من 1) */
  orderIndex: number;
  modules?: Module[];
}

export class Course {
  readonly id: CourseId;
  readonly conceptId: ConceptId;
  readonly title: string;
  readonly description: string;
  readonly orderIndex: number;
  private _modules: Module[];

  constructor(props: CourseProps) {
    if (!props.title || props.title.trim().length === 0) {
      throw new Error('عنوان الكورس مطلوب ولا يمكن أن يكون فارغاً');
    }
    if (props.orderIndex < 1) {
      throw new Error('ترتيب الكورس يجب أن يبدأ من 1 أو أعلى');
    }
    this.id = props.id;
    this.conceptId = props.conceptId;
    this.title = props.title.trim();
    this.description = props.description.trim();
    this.orderIndex = props.orderIndex;
    this._modules = [...(props.modules ?? [])].sort((a, b) => a.orderIndex - b.orderIndex);
  }

  /** وحدات الكورس مرتبة (ترتيبها داخل الكورس) */
  get modules(): readonly Module[] {
    return Object.freeze([...this._modules]);
  }

  get lessonsCount(): number {
    return this._modules.reduce((acc, m) => acc + m.lessonsCount, 0);
  }

  get totalDurationSeconds(): number {
    return this._modules.reduce((acc, m) => acc + m.totalDurationSeconds, 0);
  }

  /** ترتيب الوحدة التالية داخل الكورس */
  get nextModuleOrderIndex(): number {
    return this._modules.reduce((max, m) => Math.max(max, m.orderIndex), 0) + 1;
  }

  addModule(module: Module): void {
    if (this._modules.some((m) => m.id === module.id)) {
      throw new Error(`الوحدة ذات المعرّف ${module.id} موجودة بالفعل في هذا الكورس`);
    }
    this._modules.push(module);
    this._modules.sort((a, b) => a.orderIndex - b.orderIndex);
  }

  findModule(moduleId: ModuleId): Module | undefined {
    return this._modules.find((m) => m.id === moduleId);
  }

  findLesson(lessonId: LessonId): { module: Module; lesson: Lesson } | undefined {
    for (const module of this._modules) {
      const lesson = module.findLesson(lessonId);
      if (lesson) return { module, lesson };
    }
    return undefined;
  }

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

  /** نسخة جديدة بالعنوان/الوصف/المفهوم المعدَّلة وبنفس الوحدات */
  updateDetails(details: { title: string; description: string; conceptId?: ConceptId }): Course {
    return new Course({
      id: this.id,
      conceptId: details.conceptId ?? this.conceptId,
      title: details.title,
      description: details.description,
      orderIndex: this.orderIndex,
      modules: this._modules,
    });
  }

  withOrderIndex(orderIndex: number): Course {
    return new Course({
      id: this.id,
      conceptId: this.conceptId,
      title: this.title,
      description: this.description,
      orderIndex,
      modules: this._modules,
    });
  }

  private indexOfModule(moduleId: ModuleId): number {
    const index = this._modules.findIndex((m) => m.id === moduleId);
    if (index === -1) throw new Error(`الوحدة ${moduleId} غير موجودة في هذا الكورس`);
    return index;
  }

  private renumber(): void {
    this._modules = this._modules.map((m, i) => (m.orderIndex === i + 1 ? m : m.withOrderIndex(i + 1)));
  }
}
