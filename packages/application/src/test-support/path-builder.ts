/**
 * @file path-builder.ts
 * @description مساعد للاختبارات فقط: يضع وحدة في كورس المسار الأول (وينشئه عند الغياب) ليبقى بناء المسارات في
 * الاختبارات قصيرًا بعد أن صار الهيكل مسار ← مفهوم ← كورس ← وحدة ← درس. لا يُصدَّر من الحزمة.
 */
import { Course, createConceptId, createCourseId, type LearningPath, type Module } from '@qalam/domain';

/** يضيف الوحدة إلى أول كورس في المسار (يُنشأ كورس بمفهوم `conceptId` إن لم يوجد) */
export function addModule(path: LearningPath, module: Module, conceptId = 'c1'): void {
  let course = path.courses[0];
  if (!course) {
    course = new Course({
      id: createCourseId(`co-${path.id}`),
      conceptId: createConceptId(conceptId),
      title: 'كورس',
      description: '',
      orderIndex: 1,
    });
    path.addCourse(course);
  }
  course.addModule(module);
}

/** كورس مستقل لكل وحدة (لاختبار مفاهيم مختلفة): conceptId لكل كورس */
export function addCourseWithModule(path: LearningPath, module: Module, conceptId: string): void {
  const course = new Course({
    id: createCourseId(`co-${module.id}`),
    conceptId: createConceptId(conceptId),
    title: `كورس ${module.title}`,
    description: '',
    orderIndex: path.nextCourseOrderIndex,
  });
  course.addModule(module);
  path.addCourse(course);
}
