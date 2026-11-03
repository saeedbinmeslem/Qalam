/**
 * @file page.tsx
 * @description سجل خططي: كل خطة أنشأها المتعلم (تلقائيًا أو بمحادثة أو يدويًا) محفوظة هنا، الأحدث أولًا، تُفتح
 * لعرض أسابيعها ودروسها. يُدخل إليها من صفحة الحساب. بلا منطق عمل: use case واحد.
 */
import Link from 'next/link';
import { EmptyState, PageHeader, pageWidth } from '../../../components/ui';
import { getAuth } from '../../../composition/auth';
import { getContainer } from '../../../composition/container';
import { ConfirmSubmit } from '../../../components/confirm-submit';
import { deletePlanAction, restorePlanAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'سجل خططي — قلم' };

const sourceLabels = { auto: 'بُنيت تلقائيًا', chat: 'عُدّلت بالمحادثة', manual: 'عُدّلت يدويًا', restore: 'استُرجعت من نسخة سابقة' } as const;

export default async function PlanHistoryPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const user = await (await getAuth()).getCurrentUser.execute();
  if (!user) {
    return (
      <div className={`${pageWidth} py-20`}>
        <EmptyState
          title="لم تسجّل الدخول"
          body="سجّل الدخول لترى خططك المحفوظة."
          action={
            <Link href="/login?next=/profile/plans" className="btn-filled">
              تسجيل الدخول
            </Link>
          }
        />
      </div>
    );
  }

  const { listPlanHistory } = await getContainer();
  const plans = await listPlanHistory.execute({ userId: user.id });

  return (
    <>
      <PageHeader
        eyebrow="حسابي"
        title="سجل خططي"
        description="كل خطة تنشئها أو تعدّلها تُحفظ هنا، لتعود إلى ما كان عليه مسارك في أي وقت."
        crumbs={[{ label: 'الرئيسية', href: '/' }, { label: 'حسابي', href: '/profile' }, { label: 'سجل خططي' }]}
      />
      <div className={`${pageWidth} pt-10`}>
        {error ? (
          <p role="alert" className="mb-6 rounded-md bg-error-container p-4 text-on-error-container">
            {error}
          </p>
        ) : null}
        {plans.length === 0 ? (
          <EmptyState
            title="لا خطط محفوظة بعد"
            body="أخبرنا بما يشغفك وسنبني لك خطتك الأولى، وتُحفظ هنا تلقائيًا."
            action={
              <Link href="/start" className="btn-filled">
                ابدأ خطتك
              </Link>
            }
          />
        ) : (
          <ol className="relative space-y-6 before:absolute before:inset-y-6 before:start-[1.125rem] before:w-px before:bg-outline-variant">
            {plans.map((plan, index) => (
              <li key={plan.id} className="relative flex items-start gap-3">
                <span
                  className={`relative z-10 grid size-9 shrink-0 place-items-center rounded-full font-display text-sm font-bold ${plan.isCurrent ? 'bg-secondary-strong text-on-primary' : 'bg-primary text-on-primary'}`}
                >
                  {plans.length - index}
                </span>
                <details open={plan.isCurrent} className="card-outlined min-w-0 flex-1">
                  <summary className="cursor-pointer space-y-2 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-lg font-semibold text-on-surface">{plan.pathTitle}</span>
                      {plan.isCurrent ? <span className="chip !bg-secondary-container !text-on-secondary-container">الخطة الحالية</span> : null}
                      <time className="ms-auto text-xs text-on-surface-variant" dateTime={plan.createdAt.toISOString()}>
                        {plan.createdAt.toLocaleDateString('ar', { dateStyle: 'medium' })}
                      </time>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="chip">{sourceLabels[plan.source]}</span>
                      <span className="chip">{plan.weeks.length} أسبوع</span>
                      <span className="chip">{plan.lessonCount} درسًا</span>
                      <span className="chip">{plan.hoursPerDay} ساعة يوميًا</span>
                    </div>
                  </summary>
                  <div className="space-y-4 border-t border-outline-variant p-4">
                    {plan.request ? (
                      <p className="rounded-md bg-surface-container-low p-3 text-sm text-on-surface-variant">
                        <span className="font-semibold text-on-surface">طلبك: </span>
                        {plan.request}
                      </p>
                    ) : null}
                    {plan.summary ? <p className="text-sm text-on-surface-variant">{plan.summary}</p> : null}
                    <ol className="space-y-3">
                      {plan.weeks.map((week) => (
                        <li key={week.week} className="rounded-lg bg-surface-container-low p-3">
                          <p className="flex flex-wrap items-baseline gap-x-3">
                            <span className="text-label text-primary">الأسبوع {week.week}</span>
                            <span className="font-display font-semibold text-on-surface">{week.title}</span>
                            <span className="ms-auto text-xs text-on-surface-variant">{week.minutes} د</span>
                          </p>
                          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-on-surface">
                            {week.lessons.map((lesson) => (
                              <li key={lesson.id}>{lesson.title}</li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ol>
                    {plan.isCurrent ? (
                      <Link href="/plan" className="btn-tonal inline-flex">
                        افتح الخطة
                      </Link>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        <form action={restorePlanAction}>
                          <input type="hidden" name="planId" value={plan.id} />
                          <ConfirmSubmit className="btn-filled btn-sm" message="تصبح هذه النسخة خطتك الحالية (وتبقى خطتك الحالية الآن محفوظة في السجل). متابعة؟">
                            استرجع هذه النسخة
                          </ConfirmSubmit>
                        </form>
                        <form action={deletePlanAction}>
                          <input type="hidden" name="planId" value={plan.id} />
                          <ConfirmSubmit className="btn-outlined btn-sm" message="حذف هذه النسخة من سجلّك نهائيًا؟">
                            احذف
                          </ConfirmSubmit>
                        </form>
                      </div>
                    )}
                  </div>
                </details>
              </li>
            ))}
          </ol>
        )}
      </div>
    </>
  );
}
