/**
 * @file module.ts
 * @description كيان الوحدة التعليمية (Module Entity)
 *
 * الوحدة التعليمية هي مجموعة منظمة من الدروس تغطي موضوعاً مترابطاً
 * (مثال: وحدة "الأساسيات والمدخلات"، وحدة "جمل التحكم والتكرار").
 */

import { ModuleId } from '../value-objects/identifiers.js';
import { Lesson } from './lesson.js';

export interface ModuleProps {
  id: ModuleId;
  /** عنوان الوحدة بالعربية */
  title: string;
  /** وصف أهداف الوحدة التعليمية */
  description: string;
  /** ترتيب الوحدة داخل المسار (يبدأ من 1) */
  orderIndex: number;
  /** الدروس المندرجة تحت هذه الوحدة */
  lessons?: Lesson[];
}

export class Module {
  readonly id: ModuleId;
  readonly title: string;
  readonly description: string;
  readonly orderIndex: number;
  private _lessons: Lesson[];

  constructor(props: ModuleProps) {
    if (!props.title || props.title.trim().length === 0) {
      throw new Error('عنوان الوحدة مطلوب ولا يمكن أن يكون فارغاً');
    }

    if (props.orderIndex < 1) {
      throw new Error('ترتيب الوحدة يجب أن يبدأ من 1 أو أعلى');
    }

    this.id = props.id;
    this.title = props.title.trim();
    this.description = props.description.trim();
    this.orderIndex = props.orderIndex;
    this._lessons = [...(props.lessons ?? [])];
  }

  /**
   * قائمة دروس الوحدة (نسخة غير قابلة للتعديل المباشر من الخارج)
   */
  get lessons(): readonly Lesson[] {
    return Object.freeze([...this._lessons]);
  }

  /**
   * إجمالي عدد الدروس في الوحدة
   */
  get lessonsCount(): number {
    return this._lessons.length;
  }

  /**
   * إضافة درس إلى الوحدة
   */
  addLesson(lesson: Lesson): void {
    if (this._lessons.some((l) => l.id === lesson.id)) {
      throw new Error(`الدرس ذو المعرّف ${lesson.id} موجود بالفعل في هذه الوحدة`);
    }
    this._lessons.push(lesson);
  }
}
