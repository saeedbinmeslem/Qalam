/**
 * @file learning-agent-rules.ts
 * @description قواعد قرار وكيل التعلّم (SPEC §6–7). نقية وحتمية بلا I/O: أحداث المتعلم + المسار ← قرار واحد بسببه.
 * مبدأ المشروع: القرار يُبنى على أدلة مسجَّلة (نتائج اختبارات، إكمال، تخطٍّ)، لا على افتراض أن المشاهدة تعني الفهم.
 *
 * القواعد (بالأولوية):
 *  1. آخر محاولة اختبار على درس فاشلة (دون النجاح):
 *     - فشل واحد            ← `retake_quiz` (راجع الملاحظات ثم أعد الاختبار)
 *     - فشلان متتاليان      ← `review_lesson` (راجع الدرس ثم أعد الاختبار قبل المتابعة) — مثال SPEC §7
 *     - ثلاثة فأكثر         ← `alternative_lesson` (درس آخر على نفس المفهوم؛ وإن لم يوجد فمراجعة الدرس)
 *  2. مراجعة متباعدة (إن مُرّر `now`): درس اجتاز اختباره وحان موعد مراجعته ← `spaced_review` (الأكثر تأخرًا أولًا).
 *     الفواصل بالأيام 1، 3، 7، 14، 30 حسب عدد مرات النجاح في أيام مختلفة؛ ونجاح المراجعة يطيل الفاصل.
 *  3. غير ذلك ← `proceed` إلى أول درس غير مكتمل ولا متخطى (null إذا انتهى المسار).
 * النجاح يمسح سلسلة الفشل لذلك الدرس.
 */

import type { LearningPath } from '../entities/learning-path.js';
import type { Lesson } from '../entities/lesson.js';
import type { LearningEvent } from '../value-objects/learning-event.js';
import { calculatePathProgress } from './path-progress.js';

/** نسبة النجاح في الاختبار القصير (٪) */
export const QUIZ_PASS_PERCENT = 70;

export type AgentAction = 'proceed' | 'review_lesson' | 'retake_quiz' | 'alternative_lesson' | 'spaced_review';

/** فواصل المراجعة المتباعدة بالأيام؛ بعد آخر فاصل يبقى الأخير */
export const REVIEW_INTERVAL_DAYS = [1, 3, 7, 14, 30] as const;
const DAY_MS = 86_400_000;

export interface AgentDecision {
  action: AgentAction;
  /** الدرس المعني (للتقدم: الدرس التالي) */
  lessonId: string;
  /** للدرس البديل فقط */
  alternativeLessonId?: string;
  /** سبب القرار بالعربية: يظهر للمتعلم («لماذا اقترحنا هذا؟») ويُسجَّل مع الحدث */
  reason: string;
  /** بصمة الأدلة التي بُني عليها القرار؛ نفس البصمة = نفس القرار فلا يُسجَّل مرتين */
  evidenceKey: string;
  consecutiveFailures: number;
  /** نسبة آخر محاولة على الدرس المعني إن وُجدت */
  lastPercent?: number;
}

interface QuizAttempt {
  lessonId: string;
  percent: number;
  at: number;
}

function quizAttempts(events: readonly LearningEvent[], inPath: ReadonlySet<string>): QuizAttempt[] {
  const attempts: QuizAttempt[] = [];
  for (const e of events) {
    if (e.type !== 'attempt_submitted' || e.payload['kind'] !== 'quiz') continue;
    const lessonId = e.payload['lessonId'];
    const percent = e.payload['percent'];
    if (typeof lessonId !== 'string' || !inPath.has(lessonId) || typeof percent !== 'number') continue;
    attempts.push({ lessonId, percent, at: e.occurredAt.getTime() });
  }
  // الترتيب مستقر: المتساوي زمنيًا يبقى بترتيب وصوله
  return attempts.sort((a, b) => a.at - b.at);
}

/** «منذ …» بعدّ عربي صحيح (مفرد/مثنى/جمع) */
function daysAgo(days: number): string {
  if (days === 0) return 'اليوم';
  if (days === 1) return 'منذ يوم';
  if (days === 2) return 'منذ يومين';
  return days <= 10 ? `منذ ${days} أيام` : `منذ ${days} يومًا`;
}

/** أكثر درس متأخر عن موعد مراجعته (اجتاز اختباره ومرّ الفاصل المستحق بعد آخر نجاح) */
function mostOverdueReview(attempts: readonly QuizAttempt[], now: number) {
  const passes = new Map<string, QuizAttempt[]>();
  for (const a of attempts) if (a.percent >= QUIZ_PASS_PERCENT) passes.set(a.lessonId, [...(passes.get(a.lessonId) ?? []), a]);
  let best: { lessonId: string; overdueMs: number; daysSince: number } | undefined;
  for (const [lessonId, list] of passes) {
    const days = new Set(list.map((a) => Math.floor(a.at / DAY_MS)));
    const interval = REVIEW_INTERVAL_DAYS[Math.min(days.size, REVIEW_INTERVAL_DAYS.length) - 1]!;
    const last = list[list.length - 1]!;
    const overdueMs = now - (last.at + interval * DAY_MS);
    if (overdueMs >= 0 && (!best || overdueMs > best.overdueMs)) {
      best = { lessonId, overdueMs, daysSince: Math.floor((now - last.at) / DAY_MS) };
    }
  }
  return best;
}

export function decideNextStep(path: LearningPath, events: readonly LearningEvent[], now?: Date): AgentDecision | null {
  const lessons = path.modules.flatMap((m) => m.lessons);
  const byId = new Map<string, Lesson>(lessons.map((l) => [l.id as string, l]));
  const progress = calculatePathProgress(path, events);
  const attempts = quizAttempts(events, new Set(byId.keys()));

  // آخر محاولة فاشلة لم تُمسَح بنجاح لاحق على نفس الدرس: الأحدث أولًا
  const lastAttemptByLesson = new Map<string, QuizAttempt>();
  for (const a of attempts) lastAttemptByLesson.set(a.lessonId, a);
  const blocked = [...lastAttemptByLesson.values()]
    .filter((a) => a.percent < QUIZ_PASS_PERCENT)
    .sort((a, b) => b.at - a.at)[0];

  const tail = `${attempts.length}:${progress.completedCount}:${progress.skippedCount}`;

  if (blocked) {
    const lesson = byId.get(blocked.lessonId)!;
    let failures = 0;
    for (let i = attempts.length - 1; i >= 0; i--) {
      const a = attempts[i]!;
      if (a.lessonId !== blocked.lessonId) continue;
      if (a.percent >= QUIZ_PASS_PERCENT) break;
      failures++;
    }
    const base = { lessonId: lesson.id as string, consecutiveFailures: failures, lastPercent: blocked.percent };

    if (failures >= 3) {
      const alternative = lessons.find((l) => l.id !== lesson.id && l.conceptId === lesson.conceptId);
      if (alternative) {
        return {
          ...base,
          action: 'alternative_lesson',
          alternativeLessonId: alternative.id as string,
          reason: `تعثّرتَ ${failures} مرات متتالية في اختبار «${lesson.title}» (آخرها ${blocked.percent}%). جرّب درسًا آخر على نفس المفهوم هو «${alternative.title}»، فقد يناسبك أسلوبه أكثر، ثم أعد الاختبار.`,
          evidenceKey: `alternative_lesson:${lesson.id}:${alternative.id}:${tail}`,
        };
      }
      return {
        ...base,
        action: 'review_lesson',
        reason: `تعثّرتَ ${failures} مرات متتالية في اختبار «${lesson.title}» (آخرها ${blocked.percent}%) ولا يوجد درس بديل على نفس المفهوم بعد. راجع الدرس بتمهّل ثم أعد الاختبار قبل المتابعة.`,
        evidenceKey: `review_lesson:${lesson.id}::${tail}`,
      };
    }
    if (failures === 2) {
      return {
        ...base,
        action: 'review_lesson',
        reason: `لم تجتز اختبار «${lesson.title}» في محاولتين متتاليتين (آخرها ${blocked.percent}%، والنجاح ${QUIZ_PASS_PERCENT}%). راجع الدرس ثم أعد الاختبار قبل المتابعة.`,
        evidenceKey: `review_lesson:${lesson.id}::${tail}`,
      };
    }
    return {
      ...base,
      action: 'retake_quiz',
      reason: `حصلتَ على ${blocked.percent}% في اختبار «${lesson.title}» والنجاح ${QUIZ_PASS_PERCENT}%. راجع الأسئلة التي أخطأتَ فيها ثم أعد الاختبار.`,
      evidenceKey: `retake_quiz:${lesson.id}::${tail}`,
    };
  }

  const due = now ? mostOverdueReview(attempts, now.getTime()) : undefined;
  if (due) {
    const lesson = byId.get(due.lessonId)!;
    const since = daysAgo(due.daysSince);
    return {
      action: 'spaced_review',
      lessonId: lesson.id as string,
      consecutiveFailures: 0,
      reason: `اجتزتَ اختبار «${lesson.title}» ${since}، وحسب جدول المراجعة المتباعدة حان وقت مراجعته لتثبيت ما تعلمته. أعد اختباره قبل المتابعة.`,
      evidenceKey: `spaced_review:${lesson.id}::${tail}`,
    };
  }

  const next = progress.nextLesson;
  if (!next) return null;

  const lastAttempt = attempts[attempts.length - 1];
  const passedLesson = lastAttempt ? byId.get(lastAttempt.lessonId) : undefined;
  let reason: string;
  if (passedLesson && lastAttempt) {
    reason = `اجتزتَ اختبار «${passedLesson.title}» بنسبة ${lastAttempt.percent}%، فلا مانع من المتابعة إلى «${next.title}».`;
  } else if (progress.completedCount + progress.skippedCount === 0) {
    reason = `لا توجد لدينا أدلة بعد على مستواك، فنبدأ من أول درس: «${next.title}».`;
  } else {
    const skipped = progress.skippedCount > 0 ? ` وتخطّيتَ ${progress.skippedCount} بالاختبار التشخيصي` : '';
    reason = `أكملتَ ${progress.completedCount} من ${progress.totalCount}${skipped} دون تعثّر في اختبار، فالدرس التالي هو «${next.title}».`;
  }
  return {
    action: 'proceed',
    lessonId: next.id as string,
    reason,
    consecutiveFailures: 0,
    ...(lastAttempt ? { lastPercent: lastAttempt.percent } : {}),
    evidenceKey: `proceed:${next.id}::${tail}`,
  };
}
