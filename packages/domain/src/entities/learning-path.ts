/**
 * @file learning-path.ts
 * @description كيان المسار التعليمي (Learning Path Entity)
 *
 * المسار خريطة طريق لهدف تعليمي، وهيكله: مسار ← مفاهيم ← كورسات ← وحدات ← دروس.
 * المفاهيم تُحفظ بجانب المسار (لكل مفهوم `pathId`)، والمسار يملك كورساته؛ كل كورس يتبع مفهومًا واحدًا كاملًا،
 * وبه يُعرف مفهوم أي درس (`conceptIdOfLesson`) فلا يُنسب الدرس إلى مفهوم بمفرده.
 * `modules` عرض مسطّح لكل وحدات الكورسات بترتيبها (للقراءة فقط).
 */

import type { ConceptId, CourseId, LessonId, ModuleId, PathId } from '../value-objects/identifiers.js';
import type { Course } from './course.js';
import type { Lesson } from './lesson.js';
import type { Module } from './module.js';

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
  /** كورسات المسار */
  courses?: Course[];
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
  private _courses: Course[];

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
    this._courses = [...(props.courses ?? [])].sort((a, b) => a.orderIndex - b.orderIndex);
  }

  /** الكورسات مرتبة حسب orderIndex */
  get courses(): readonly Course[] {
    return Object.freeze([...this._courses]);
  }

  /** كل وحدات المسار مسطّحة: بترتيب الكورسات ثم ترتيب الوحدة داخل كورسها */
  get modules(): readonly Module[] {
    return Object.freeze(this._courses.flatMap((c) => [...c.modules]));
  }

  /** معرّفات المفاهيم التي لها كورسات في المسار، بترتيب ظهورها */
  get conceptIds(): readonly ConceptId[] {
    return [...new Set(this._courses.map((c) => c.conceptId))];
  }

  /** إجمالي عدد الدروس في المسار كاملاً */
  get totalLessonsCount(): number {
    return this._courses.reduce((acc, c) => acc + c.lessonsCount, 0);
  }

  /** مجموع مدد المقاطع المطلوب مشاهدتها في المسار بالثواني */
  get totalDurationSeconds(): number {
    return this._courses.reduce((acc, c) => acc + c.totalDurationSeconds, 0);
  }

  // ───── الكورسات ─────

  addCourse(course: Course): void {
    if (this._courses.some((c) => c.id === course.id)) {
      throw new Error(`الكورس ذو المعرّف ${course.id} موجود بالفعل في هذا المسار`);
    }
    this._courses.push(course);
    this._courses.sort((a, b) => a.orderIndex - b.orderIndex);
  }

  /** ترتيب الكورس التالي (آخر ترتيب + 1) */
  get nextCourseOrderIndex(): number {
    return this._courses.reduce((max, c) => Math.max(max, c.orderIndex), 0) + 1;
  }

  findCourse(courseId: CourseId): Course | undefined {
    return this._courses.find((c) => c.id === courseId);
  }

  replaceCourse(course: Course): void {
    this._courses[this.indexOfCourse(course.id)] = course;
  }

  /** حذف كورس بوحداته ودروسه ثم إعادة ترقيم الباقي 1..n */
  removeCourse(courseId: CourseId): void {
    this._courses.splice(this.indexOfCourse(courseId), 1);
    this.renumber();
  }

  /** تحريك كورس موضعًا واحدًا؛ لا شيء يحدث عند الحافة */
  moveCourse(courseId: CourseId, direction: 'up' | 'down'): void {
    const index = this.indexOfCourse(courseId);
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= this._courses.length) return;
    const [course] = this._courses.splice(index, 1) as [Course];
    this._courses.splice(target, 0, course);
    this.renumber();
  }

  // ───── الوحدات والدروس (تُحلّ عبر كورسها) ─────

  findModule(moduleId: ModuleId): Module | undefined {
    return this.courseOfModule(moduleId)?.findModule(moduleId);
  }

  /** الكورس الذي يضم الوحدة */
  courseOfModule(moduleId: ModuleId): Course | undefined {
    return this._courses.find((c) => c.findModule(moduleId));
  }

  /** الدرس ووحدته وكورسه من معرّف الدرس */
  findLesson(lessonId: LessonId): { course: Course; module: Module; lesson: Lesson } | undefined {
    for (const course of this._courses) {
      const found = course.findLesson(lessonId);
      if (found) return { course, ...found };
    }
    return undefined;
  }

  /** مفهوم الدرس = مفهوم كورسه */
  conceptIdOfLesson(lessonId: LessonId | string): ConceptId | undefined {
    return this.findLesson(lessonId as LessonId)?.course.conceptId;
  }

  /** معرّف كل درس ← مفهومه (للخدمات التي تجمّع بالمفهوم) */
  lessonConceptMap(): Map<string, ConceptId> {
    const map = new Map<string, ConceptId>();
    for (const course of this._courses) {
      for (const module of course.modules) {
        for (const lesson of module.lessons) map.set(lesson.id, course.conceptId);
      }
    }
    return map;
  }

  replaceModule(module: Module): void {
    this.requireCourseOf(module.id).replaceModule(module);
  }

  removeModule(moduleId: ModuleId): void {
    this.requireCourseOf(moduleId).removeModule(moduleId);
  }

  moveModule(moduleId: ModuleId, direction: 'up' | 'down'): void {
    this.requireCourseOf(moduleId).moveModule(moduleId, direction);
  }

  /** نسخة جديدة ببيانات المسار المعدَّلة وبنفس الكورسات */
  updateDetails(details: {
    title: string;
    description: string;
    targetGoal: string;
    subject: string;
  }): LearningPath {
    return new LearningPath({
      ...details,
      id: this.id,
      courses: this._courses,
      createdAt: this.createdAt,
      updatedAt: new Date(),
    });
  }

  private requireCourseOf(moduleId: ModuleId): Course {
    const course = this.courseOfModule(moduleId);
    if (!course) throw new Error(`الوحدة ${moduleId} غير موجودة في هذا المسار`);
    return course;
  }

  private indexOfCourse(courseId: CourseId): number {
    const index = this._courses.findIndex((c) => c.id === courseId);
    if (index === -1) throw new Error(`الكورس ${courseId} غير موجود في هذا المسار`);
    return index;
  }

  private renumber(): void {
    this._courses = this._courses.map((c, i) => (c.orderIndex === i + 1 ? c : c.withOrderIndex(i + 1)));
  }
}
