/**
 * @file page.tsx
 * @description المراجعة: ما يقترح الوكيل العودة إليه (مراجعة، إعادة اختبار، درس بديل، مراجعة متباعدة)
 * والدروس التي كانت نتيجة اختبارها منخفضة. بلا منطق عمل.
 */
import Link from 'next/link';
import { getAuth } from '../../composition/auth';
import { getContainer } from '../../composition/container';
import { EmptyState, PageHeader, pageWidth } from '../../components/ui';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'المراجعة — قلم' };

/** عتبة «نتيجة تستحق المراجعة» للعرض فقط؛ قرارات الوكيل الفعلية تأتي من قواعد Domain */
const WEAK_PERCENT = 60;

const actionLabels = {
  proceed: 'تقدّم',
  review_lesson: 'مراجعة الدرس',
  retake_quiz: 'إعادة الاختبار',
  alternative_lesson: 'درس بديل',
  spaced_review: 'مراجعة متباعدة',
} as const;

export default async function ReviewPage() {
  const user = await (await getAuth()).getCurrentUser.execute();
  const header = (
    <PageHeader
      eyebrow="المراجعة"
      title="راجع قبل أن تنسى"
      description="المشاهدة لا تعني الفهم ولا الحفظ. هنا ما يقترح الوكيل أن تعود إليه، وكل اقتراح بسببه."
      crumbs={[{ label: 'الرئيسية', href: '/' }, { label: 'المراجعة' }]}
    />
  );

  if (!user) {
    return (
      <>
        {header}
        <div className={`${pageWidth} py-12`}>
          <EmptyState
            title="سجّل الدخول لترى مراجعاتك"
            body="نحتاج معرفة ما أكملته ونتائج اختباراتك لنقترح ما تراجعه."
            action={
              <Link href="/login?next=/review" className="btn-filled">
                تسجيل الدخول
              </Link>
            }
          />
        </div>
      </>
    );
  }

  const { getLearnerDashboard } = await getContainer();
  const dash = await getLearnerDashboard.execute({ userId: user.id });

  const weak = dash.paths.flatMap(({ path, progress }) =>
    path.modules
      .flatMap((m) => m.lessons)
      .filter((l) => (progress.quizPercentByLesson.get(l.id as string) ?? 100) < WEAK_PERCENT)
      .map((l) => ({ path, lesson: l, percent: progress.quizPercentByLesson.get(l.id as string)! })),
  );

  return (
    <>
      {header}
      <div className={`${pageWidth} space-y-12 pt-10`}>
        <section aria-labelledby="agent-title">
          <h2 id="agent-title" className="font-display text-headline text-on-surface">
            اقتراحات الوكيل
          </h2>
          {dash.attention.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                title="لا شيء يحتاج مراجعة الآن"
                body="أكمل بعض الدروس وأجرِ الاختبارات القصيرة، وسيقترح الوكيل متى تعود لما درسته."
                action={
                  <Link href="/dashboard" className="btn-tonal">
                    العودة إلى تعلّمي
                  </Link>
                }
              />
            </div>
          ) : (
            <ul className="mt-5 space-y-4">
              {dash.attention.map(({ path, advice }) => (
                <li key={path.id} className="card-outlined border-s-4 border-s-highlighter p-5">
                  <span className="chip chip-ai">{actionLabels[advice!.decision.action]}</span>
                  <p className="font-display text-title mt-3 text-on-surface">{advice!.lessonTitle}</p>
                  <p className="text-sm text-on-surface-variant">{path.title}</p>
                  <p className="mt-3 text-on-surface">{advice!.decision.reason}</p>
                  {advice!.explanation ? <p className="mt-2 text-on-surface-variant">{advice!.explanation}</p> : null}
                  <Link href={`/paths/${path.id}/lessons/${advice!.decision.lessonId}`} className="btn-filled btn-sm mt-4">
                    ابدأ المراجعة
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="weak-title">
          <h2 id="weak-title" className="font-display text-headline text-on-surface">
            دروس نتيجتها أقل من {WEAK_PERCENT}%
          </h2>
          {weak.length === 0 ? (
            <p className="mt-4 text-on-surface-variant">لا دروس بنتيجة منخفضة. أحسنت.</p>
          ) : (
            <ul className="mt-5 divide-y divide-outline-variant card-outlined">
              {weak.map(({ path, lesson, percent }) => (
                <li key={lesson.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <Link href={`/paths/${path.id}/lessons/${lesson.id}`} className="font-medium text-on-surface hover:text-primary">
                      {lesson.title}
                    </Link>
                    <p className="text-sm text-on-surface-variant">{path.title}</p>
                  </div>
                  <span className="chip">آخر نتيجة {percent}%</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
