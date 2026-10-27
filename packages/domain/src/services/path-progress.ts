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
  completedCount: number;
  totalCount: number;
  /** نسبة الإكمال 0..100 مقرّبة لأقرب عدد صحيح */
  percent: number;
  /** أول درس غير مكتمل بترتيب المسار (null إذا اكتمل المسار أو كان فارغًا) */
  nextLesson: Lesson | null;
}

export function calculatePathProgress(path: LearningPath, events: readonly LearningEvent[]): PathProgress {
  const lessons = path.modules.flatMap((m) => m.lessons);
  const inPath = new Set(lessons.map((l) => l.id as string));

  // أي إكمال لدرس من المسار يُحتسب مرة واحدة مهما تكرّر الحدث
  const completed = new Set<string>();
  for (const event of events) {
    if (event.type !== 'lesson_completed') continue;
    const lessonId = event.payload['lessonId'];
    if (typeof lessonId === 'string' && inPath.has(lessonId)) completed.add(lessonId);
  }

  const totalCount = lessons.length;
  return {
    completedLessonIds: completed,
    completedCount: completed.size,
    totalCount,
    percent: totalCount === 0 ? 0 : Math.round((completed.size / totalCount) * 100),
    nextLesson: lessons.find((l) => !completed.has(l.id)) ?? null,
  };
}
