/**
 * @file study-plan.ts
 * @description خطة الدراسة الأسبوعية: توزيع الدروس المتبقية على أسابيع حسب الساعات المتاحة للمتعلم.
 * نقية وحتمية (لا نموذج لغوي هنا)؛ النموذج يختار المسار ويكتب عناوين الأسابيع وأسبابها فقط، فتبقى الخطة
 * صحيحة حتى لو تعطّل أو أخطأ.
 */

export interface PlanLessonInput {
  lessonId: string;
  durationSeconds: number;
}

export interface PlanWeek {
  /** رقم الأسبوع بدءًا من 1 */
  week: number;
  lessonIds: string[];
  /** الوقت التقديري للأسبوع بالدقائق */
  minutes: number;
}

/** وقت الدرس التقديري: المقطع مرة ونصفًا (إيقاف وتكرار) + 5 دقائق للاختبار القصير */
export function estimateLessonMinutes(durationSeconds: number): number {
  return Math.ceil((durationSeconds / 60) * 1.5) + 5;
}

export const MIN_HOURS_PER_WEEK = 1;
export const MAX_HOURS_PER_WEEK = 40;

/** يملأ كل أسبوع بدروس بالترتيب حتى سعته؛ الدرس الأكبر من السعة يأخذ أسبوعًا وحده */
export function buildPlanWeeks(lessons: readonly PlanLessonInput[], hoursPerWeek: number): PlanWeek[] {
  if (!Number.isFinite(hoursPerWeek) || hoursPerWeek < MIN_HOURS_PER_WEEK || hoursPerWeek > MAX_HOURS_PER_WEEK) {
    throw new Error(`عدد الساعات الأسبوعية يجب أن يكون بين ${MIN_HOURS_PER_WEEK} و${MAX_HOURS_PER_WEEK}`);
  }
  const capacity = Math.round(hoursPerWeek * 60);
  const weeks: PlanWeek[] = [];
  let current: PlanWeek | null = null;

  for (const lesson of lessons) {
    const minutes = estimateLessonMinutes(lesson.durationSeconds);
    if (!current || (current.minutes > 0 && current.minutes + minutes > capacity)) {
      current = { week: weeks.length + 1, lessonIds: [], minutes: 0 };
      weeks.push(current);
    }
    current.lessonIds.push(lesson.lessonId);
    current.minutes += minutes;
  }
  return weeks;
}
