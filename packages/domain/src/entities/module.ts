/**
 * @file module.ts
 * @description كيان الوحدة التعليمية (Module Entity)
 *
 * الوحدة التعليمية هي مجموعة منظمة من الدروس تغطي موضوعاً مترابطاً
 * (مثال: وحدة "الأساسيات والمدخلات"، وحدة "جمل التحكم والتكرار").
 */

import type { LessonId, ModuleId } from '../value-objects/identifiers.js';
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
   * مجموع مدد مقاطع الدروس بالثواني
   */
  get totalDurationSeconds(): number {
    return this._lessons.reduce((acc, l) => acc + l.segment.durationSeconds, 0);
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

  findLesson(lessonId: LessonId): Lesson | undefined {
    return this._lessons.find((l) => l.id === lessonId);
  }

  /** استبدال درس موجود بنسخته المعدّلة مع بقاء موضعه */
  replaceLesson(lesson: Lesson): void {
    const index = this.indexOfLesson(lesson.id);
    this._lessons[index] = lesson;
  }

  removeLesson(lessonId: LessonId): void {
    this._lessons.splice(this.indexOfLesson(lessonId), 1);
  }

  /** تحريك درس موضعًا واحدًا؛ لا شيء يحدث عند الحافة */
  moveLesson(lessonId: LessonId, direction: 'up' | 'down'): void {
    const index = this.indexOfLesson(lessonId);
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= this._lessons.length) return;
    const [lesson] = this._lessons.splice(index, 1) as [Lesson];
    this._lessons.splice(target, 0, lesson);
  }

  /** نسخة جديدة بعنوان/وصف معدَّلين، وبقية الحالة كما هي */
  updateDetails(details: { title: string; description: string }): Module {
    return new Module({
      id: this.id,
      title: details.title,
      description: details.description,
      orderIndex: this.orderIndex,
      lessons: this._lessons,
    });
  }

  withOrderIndex(orderIndex: number): Module {
    return new Module({
      id: this.id,
      title: this.title,
      description: this.description,
      orderIndex,
      lessons: this._lessons,
    });
  }

  private indexOfLesson(lessonId: LessonId): number {
    const index = this._lessons.findIndex((l) => l.id === lessonId);
    if (index === -1) throw new Error(`الدرس ${lessonId} غير موجود في هذه الوحدة`);
    return index;
  }
}
