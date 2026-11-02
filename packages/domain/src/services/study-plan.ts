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

/** أيام الدراسة في الأسبوع التي تُبنى عليها الخطة اليومية (يومان للراحة) */
export const STUDY_DAYS_PER_WEEK = 5;

export interface PlanDay {
  /** رقم اليوم داخل الأسبوع بدءًا من 1 */
  day: number;
  lessonIds: string[];
  minutes: number;
}

/**
 * يوزّع دروس أسبوع على أيامه: سعة اليوم = سعة الأسبوع ÷ أيام الدراسة، والدرس لا يُجزَّأ فالأكبر من سعة اليوم
 * يأخذ يومًا وحده. التوزيع حتمي ومشتق من الأسبوع، فلا يُخزَّن ولا يخالف الخطة الأسبوعية.
 */
export function buildPlanDays(
  lessons: readonly PlanLessonInput[],
  hoursPerWeek: number,
  studyDays: number = STUDY_DAYS_PER_WEEK,
): PlanDay[] {
  const dailyCapacity = Math.max(1, Math.round((hoursPerWeek * 60) / studyDays));
  const days: PlanDay[] = [];
  let current: PlanDay | null = null;
  for (const lesson of lessons) {
    const minutes = estimateLessonMinutes(lesson.durationSeconds);
    if (!current || (current.minutes > 0 && current.minutes + minutes > dailyCapacity)) {
      current = { day: days.length + 1, lessonIds: [], minutes: 0 };
      days.push(current);
    }
    current.lessonIds.push(lesson.lessonId);
    current.minutes += minutes;
  }
  return days;
}

/**
 * يطبّق ترتيبًا مقترحًا للأسابيع (من النموذج أو من المتعلم يدويًا) على الدروس المتبقية فقط، فيبقى المخرج سليمًا
 * مهما كان المُدخل: يُسقط المعرّفات المجهولة والمكرّرة، ويحذف الأسابيع الفارغة، وكل درس متبقٍ لم يُذكر يُلحَق
 * بآخر أسبوع (أو بأسبوع جديد إن لم يبقَ أسبوع) بترتيبه الأصلي، فلا يضيع درس بخطأ في الصياغة.
 */
export function normalizePlanArrangement<T extends { lessonIds: readonly string[] }>(
  remainingIds: readonly string[],
  proposed: readonly T[],
  makeWeek: (lessonIds: string[]) => T,
): T[] {
  const allowed = new Set(remainingIds);
  const seen = new Set<string>();
  const weeks: T[] = [];
  for (const week of proposed) {
    const lessonIds = week.lessonIds.filter((id) => allowed.has(id) && !seen.has(id) && (seen.add(id), true));
    if (lessonIds.length > 0) weeks.push({ ...week, lessonIds });
  }
  const missing = remainingIds.filter((id) => !seen.has(id));
  if (missing.length > 0) {
    const last = weeks[weeks.length - 1];
    if (last) weeks[weeks.length - 1] = { ...last, lessonIds: [...last.lessonIds, ...missing] };
    else weeks.push(makeWeek(missing));
  }
  return weeks;
}
