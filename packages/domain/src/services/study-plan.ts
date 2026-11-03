/**
 * @file study-plan.ts
 * @description خطة الدراسة الأسبوعية: توزيع الدروس المتبقية على أسابيع حسب الساعات اليومية المتاحة للمتعلم.
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

/** أيام الدراسة في الأسبوع (يومان للراحة): سعة الأسبوع = ساعات اليوم × هذا العدد */
export const STUDY_DAYS_PER_WEEK = 5;
export const MIN_HOURS_PER_DAY = 0.5;
export const MAX_HOURS_PER_DAY = 12;

function assertHoursPerDay(hoursPerDay: number): void {
  if (!Number.isFinite(hoursPerDay) || hoursPerDay < MIN_HOURS_PER_DAY || hoursPerDay > MAX_HOURS_PER_DAY) {
    throw new Error(`عدد الساعات اليومية يجب أن يكون بين ${MIN_HOURS_PER_DAY} و${MAX_HOURS_PER_DAY}`);
  }
}

/** يملأ كل أسبوع بدروس بالترتيب حتى سعته (ساعات اليوم × أيام الدراسة)؛ الدرس الأكبر من السعة يأخذ أسبوعًا وحده */
export function buildPlanWeeks(lessons: readonly PlanLessonInput[], hoursPerDay: number): PlanWeek[] {
  assertHoursPerDay(hoursPerDay);
  const capacity = Math.round(hoursPerDay * 60 * STUDY_DAYS_PER_WEEK);
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

export interface PlanDay {
  /** رقم اليوم داخل الأسبوع بدءًا من 1 */
  day: number;
  lessonIds: string[];
  minutes: number;
}

/**
 * يوزّع دروس أسبوع على أيامه: سعة اليوم = ساعات المتعلم اليومية، والدرس لا يُجزَّأ فالأكبر من سعة اليوم
 * يأخذ يومًا وحده. التوزيع حتمي ومشتق من الأسبوع، فلا يُخزَّن ولا يخالف الخطة الأسبوعية.
 */
export function buildPlanDays(lessons: readonly PlanLessonInput[], hoursPerDay: number): PlanDay[] {
  const dailyCapacity = Math.max(1, Math.round(hoursPerDay * 60));
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

export interface PlanHourItem {
  lessonId: string;
  /** الدقائق التي يشغلها الدرس داخل هذه الساعة */
  minutes: number;
  /** هل يبدأ الدرس في هذه الساعة (وإلا فهو تكملة لما بدأ في ساعة سابقة) */
  starts: boolean;
}

export interface PlanHour {
  /** رقم الساعة داخل اليوم بدءًا من 1 */
  hour: number;
  items: PlanHourItem[];
  minutes: number;
}

/**
 * يقسّم دروس يوم على ساعاته بتسلسل زمني: الدرس يشغل مدته التقديرية متصلة، فقد يمتد على ساعتين
 * ويشاركه درس آخر الساعة نفسها. حتمي ومشتق من اليوم فلا يُخزَّن.
 */
export function buildPlanHours(lessons: readonly PlanLessonInput[]): PlanHour[] {
  const hours: PlanHour[] = [];
  let cursor = 0; // الدقيقة الحالية من بداية اليوم
  for (const lesson of lessons) {
    let left = estimateLessonMinutes(lesson.durationSeconds);
    let starts = true;
    while (left > 0) {
      const index = Math.floor(cursor / 60);
      const slice = Math.min(left, (index + 1) * 60 - cursor);
      let hour = hours[index];
      if (!hour) {
        hour = { hour: index + 1, items: [], minutes: 0 };
        hours[index] = hour;
      }
      hour.items.push({ lessonId: lesson.lessonId, minutes: slice, starts });
      hour.minutes += slice;
      cursor += slice;
      left -= slice;
      starts = false;
    }
  }
  return hours;
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
