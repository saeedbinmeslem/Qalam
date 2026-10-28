/**
 * @file path-progress.ts
 * @description حساب تقدم المتعلم في مسار من أحداثه. نقي بلا I/O.
 * مبدأ المشروع: التقدم يُبنى على أحداث مسجَّلة فعلًا (إكمال صريح)، لا على افتراض أن الفتح يعني الإتمام.
 */

import type { LearningPath } from '../entities/learning-path.js';
import type { Lesson } from '../entities/lesson.js';
import type { LearningEvent } from '../value-objects/learning-event.js';

export interface PathProgress {
  /** معرّفات الدروس المكتملة (من هذا المسار فقط) */
  completedLessonIds: ReadonlySet<string>;
  /** دروس تخطّاها الاختبار التشخيصي (قرار خطة مسجَّل بسببه)؛ لا تُحتسب «مكتملة» لئلا تتضخم أرقام الأثر */
  skippedLessonIds: ReadonlySet<string>;
  completedCount: number;
  skippedCount: number;
  totalCount: number;
  /** نسبة التقدم 0..100 (مكتمل + متخطى) مقرّبة لأقرب عدد صحيح */
  percent: number;
  /** أول درس غير مكتمل بترتيب المسار (null إذا اكتمل المسار أو كان فارغًا) */
  nextLesson: Lesson | null;
}

export function calculatePathProgress(path: LearningPath, events: readonly LearningEvent[]): PathProgress {
  const lessons = path.modules.flatMap((m) => m.lessons);
  const inPath = new Set(lessons.map((l) => l.id as string));

  // أي إكمال لدرس من المسار يُحتسب مرة واحدة مهما تكرّر الحدث
  const completed = new Set<string>();
  const skipped = new Set<string>();
  for (const event of events) {
    const lessonId = event.payload['lessonId'];
    if (typeof lessonId !== 'string' || !inPath.has(lessonId)) continue;
    if (event.type === 'lesson_completed') completed.add(lessonId);
    else if (event.type === 'plan_decision' && event.payload['decision'] === 'skip_lesson') skipped.add(lessonId);
  }
  // الإكمال الفعلي أقوى من التخطي: درس أُكمل لا يُعدّ متخطى
  for (const id of completed) skipped.delete(id);

  const totalCount = lessons.length;
  const done = completed.size + skipped.size;
  return {
    completedLessonIds: completed,
    skippedLessonIds: skipped,
    completedCount: completed.size,
    skippedCount: skipped.size,
    totalCount,
    percent: totalCount === 0 ? 0 : Math.round((done / totalCount) * 100),
    nextLesson: lessons.find((l) => !completed.has(l.id) && !skipped.has(l.id)) ?? null,
  };
}
