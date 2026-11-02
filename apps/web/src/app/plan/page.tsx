/**
 * @file page.tsx
 * @description «خطتي»: الهدف، الخطة الأسبوعية بأسبابها، ما درسه المتعلم وما سيدرسه. كل شيء من use case واحد.
 */
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ConfirmSubmit } from '../../components/confirm-submit';
import { PlanChat, PlanManualEditor } from '../../components/plan-editor';
import { EmptyState, PageHeader, ProgressBar, pageWidth } from '../../components/ui';
import { getAuth } from '../../composition/auth';
import { getContainer } from '../../composition/container';
import { rebuildPlanAction } from '../start/actions';

export const dynamic = 'force-dynamic';
// الصياغة بالذكاء الاصطناعي تجري بعد الاستجابة (after) وقد تستغرق دقيقة على Gemini المجاني
export const maxDuration = 60;
export const metadata = { title: 'خطتي — قلم' };

const levelLabels: Record<string, string> = { beginner: 'مبتدئ', intermediate: 'متوسط', advanced: 'متقدم' };
const statusLabels = { done: '✓ أنجزته', skipped: 'تخطّيناه', next: 'التالي', upcoming: 'قادم' } as const;

export default async function PlanPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const user = await (await getAuth()).getCurrentUser.execute();
  if (!user) redirect('/login?next=/plan');

  const { getPersonalPlan } = await getContainer();
  const view = await getPersonalPlan.execute({ userId: user.id });

  if (!view) {
    return (
      <div className={`${pageWidth} py-20`}>
        <EmptyState
          title="لم نبنِ خطتك بعد"
          body="أخبرنا بما يشغفك وبالمجال الذي تريده، ونختار لك المسار الأنسب ونرتّبه في أسابيع تناسب وقتك."
          action={
            <Link href="/start" className="btn-filled">
              ابدأ الآن
            </Link>
          }
        />
      </div>
    );
  }

  const { goal, plan, progress, next, history, revisions, catalog } = view;
  return (
    <>
      <PageHeader
        eyebrow="خطتك الشخصية"
        title={goal.pathTitle}
        description={goal.rationale}
        actions={
          next ? (
            <Link href={`/paths/${goal.pathId}/lessons/${next.id}`} className="btn-filled">
              تابع: {next.title}
            </Link>
          ) : null
        }
      />
      <div className={`${pageWidth} space-y-10 py-10`}>
        {error ? (
          <p role="alert" className="rounded-md bg-error-container p-4 text-on-error-container">
            {error}
          </p>
        ) : null}

        <section aria-label="هدفك" className="card-outlined space-y-2 p-5">
          <p className="text-sm text-on-surface-variant">
            شغفك: <span className="text-on-surface">{goal.interest}</span>
          </p>
          <p className="text-sm text-on-surface-variant">
            مجالك: <span className="text-on-surface">{goal.field}</span> · المستوى: {levelLabels[goal.level] ?? goal.level} ·{' '}
            {goal.hoursPerWeek} ساعات أسبوعيًا
          </p>
          <ProgressBar percent={progress.percent} label={`${progress.completedCount} مكتمل و${progress.skippedCount} متخطى من ${progress.totalCount}`} />
          <Link href="/start" className="text-sm text-primary underline">
            غيّر هدفي
          </Link>
        </section>

        <section aria-labelledby="plan-h">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="plan-h" className="font-display text-title text-on-surface">
              الخطة الأسبوعية
            </h2>
            <form action={rebuildPlanAction}>
              <ConfirmSubmit
                className="btn-outlined btn-sm"
                message={revisions.length > 0 ? 'سيُعاد بناء الخطة تلقائيًا من دروسك المتبقية، وتُمحى تعديلاتك السابقة (بالمحادثة أو يدويًا). متابعة؟' : 'تحديث الخطة بحسب تقدمك؟'}
              >
                حدّث خطتي بحسب تقدمي
              </ConfirmSubmit>
            </form>
          </div>
          {!plan ? (
            <p className="mt-3 text-on-surface-variant">لم تُبنَ خطتك بعد. اضغط «حدّث خطتي».</p>
          ) : plan.weeks.length === 0 ? (
            <p className="mt-3 text-on-surface-variant">أنهيت كل دروس المسار. أحسنت!</p>
          ) : (
            <>
              <p className="mt-2 text-on-surface-variant">{plan.summary}</p>
              <ol className="mt-5 space-y-4">
                {plan.weeks.map((week) => (
                  <li key={week.week} className="card-outlined p-5">
                    <p className="text-label text-primary">الأسبوع {week.week} · نحو {week.minutes} دقيقة</p>
                    <h3 className="mt-1 font-display text-lg font-semibold text-on-surface">{week.title}</h3>
                    <p className="mt-1 text-sm text-on-surface-variant">{week.focus}</p>
                    <ul className="mt-3 space-y-2">
                      {week.lessons.map((lesson) => (
                        <li key={lesson.id} className="flex items-center justify-between gap-3">
                          <Link href={`/paths/${goal.pathId}/lessons/${lesson.id}`} className="text-on-surface hover:underline">
                            {lesson.title}
                          </Link>
                          <span className={lesson.status === 'next' ? 'chip chip-primary' : 'text-xs text-on-surface-variant'}>{statusLabels[lesson.status]}</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-xs text-on-surface-variant">{plan.usedAi ? 'صيغت عناوين الأسابيع وأسبابها بالذكاء الاصطناعي من دروس المنصة فقط.' : 'بُنيت الخطة من ساعاتك ونتيجة اختبارك. يصوغ الذكاء الاصطناعي عناوين الأسابيع وأسبابها في الخلفية؛ حدّث الصفحة بعد دقيقة.'}</p>
            </>
          )}
        </section>

        {plan && plan.weeks.length > 0 ? (
          <>
            <PlanChat revisions={revisions} />
            <PlanManualEditor plan={plan} catalog={catalog} currentPathId={goal.pathId} hoursPerWeek={goal.hoursPerWeek} />
          </>
        ) : null}

        <section aria-labelledby="history-h">
          <h2 id="history-h" className="font-display text-title text-on-surface">
            سجلّ ما درستَه
          </h2>
          {history.length === 0 ? (
            <p className="mt-3 text-on-surface-variant">لم تُكمل درسًا بعد. ابدأ من الدرس التالي أعلاه.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {history.map((h) => (
                <li key={`${h.lessonId}-${h.at.getTime()}`} className="flex justify-between gap-3 text-on-surface">
                  <span>✓ {h.title}</span>
                  <time className="text-xs text-on-surface-variant" dateTime={h.at.toISOString()}>
                    {h.at.toLocaleDateString('ar')}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
