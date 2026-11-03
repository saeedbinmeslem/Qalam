/**
 * @file page.tsx
 * @description «خطتي»: الهدف في سطر، خطة اليوم بارزة، ثم الأسابيع قابلة للطي (الحالي مفتوح) بأيامها.
 * التعديل والسجل مطويّان حتى لا تزدحم الصفحة. كل شيء من use case واحد.
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

type LessonStatus = 'done' | 'skipped' | 'next' | 'upcoming';

/** علامة الحالة: دائرة فارغة للقادم، نقطة بارزة للتالي، ✓ للمنجز، شرطة للمتخطى (بدل كلمات تزاحم السطر) */
function StatusMark({ status }: { status: LessonStatus }) {
  const label = { done: 'أنجزته', skipped: 'تخطّيناه', next: 'التالي', upcoming: 'قادم' }[status];
  const style =
    status === 'done'
      ? 'bg-primary text-on-primary'
      : status === 'next'
        ? 'border-2 border-primary bg-primary-container'
        : status === 'skipped'
          ? 'border border-outline-variant text-on-surface-variant'
          : 'border border-outline';
  return (
    <span title={label} className={`mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] leading-none ${style}`}>
      <span className="sr-only">{label}</span>
      {status === 'done' ? '✓' : status === 'skipped' ? '–' : null}
    </span>
  );
}

function LessonRow({ pathId, lesson }: { pathId: string; lesson: { id: string; title: string; status: LessonStatus } }) {
  const muted = lesson.status === 'done' || lesson.status === 'skipped';
  return (
    <li className="flex items-start gap-2">
      <StatusMark status={lesson.status} />
      <Link href={`/paths/${pathId}/lessons/${lesson.id}`} className={`text-sm leading-6 hover:underline ${muted ? 'text-on-surface-variant' : 'text-on-surface'}`}>
        {lesson.title}
      </Link>
    </li>
  );
}

const hourNames = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة', 'السابعة', 'الثامنة', 'التاسعة', 'العاشرة', 'الحادية عشرة', 'الثانية عشرة'];

type HourSlot = { hour: number; minutes: number; items: Array<{ lessonId: string; title: string; minutes: number; starts: boolean }> };

// لون لكل درس داخل الساعة يربط قطعته في الشريط بسطره في القائمة
const tones = [
  { bar: 'bg-secondary', edge: 'border-secondary' },
  { bar: 'bg-violet', edge: 'border-violet' },
  { bar: 'bg-highlighter', edge: 'border-highlighter' },
  { bar: 'bg-primary', edge: 'border-primary' },
];

/**
 * اليوم خطًّا زمنيًا رأسيًا: عقدة لكل ساعة («الساعة الأولى») وبطاقة فيها شريط مقسّم بألوان الدروس بحسب دقائقها
 * من أصل 60، ثم الدروس بألوانها. الدرس الممتد على ساعتين يظهر في كلتيهما بوسم «تكملة».
 */
function HourList({ pathId, hours, lessons }: { pathId: string; hours: HourSlot[]; lessons: Array<{ id: string; title: string; status: LessonStatus }> }) {
  const byId = new Map(lessons.map((l) => [l.id, l]));
  return (
    <ol className="relative space-y-3 before:absolute before:inset-y-4 before:start-4 before:w-px before:bg-outline-variant">
      {hours.map((h) => {
        const finished = h.items.every((i) => ['done', 'skipped'].includes(byId.get(i.lessonId)?.status ?? ''));
        return (
          <li key={h.hour} className="relative flex items-start gap-3">
            <span
              className={`relative z-10 grid size-8 shrink-0 place-items-center rounded-full font-display text-sm font-bold ${finished ? 'bg-secondary-strong text-on-primary' : 'bg-primary text-on-primary'}`}
            >
              {finished ? '✓' : h.hour}
            </span>
            <div className="min-w-0 flex-1 rounded-md border border-outline-variant bg-surface-container-lowest p-3">
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-on-surface">الساعة {hourNames[h.hour - 1] ?? h.hour}</p>
                <p className="text-xs text-on-surface-variant">{h.minutes} من 60 د</p>
              </div>
              <div className="mb-3 flex h-2 overflow-hidden rounded-full bg-surface-container-high" role="img" aria-label={`${h.minutes} دقيقة من ساعة`}>
                {h.items.map((item, i) => (
                  <span key={`${item.lessonId}-${i}`} className={`${tones[i % tones.length]?.bar} border-e border-surface-container-lowest`} style={{ width: `${(item.minutes / 60) * 100}%` }} />
                ))}
              </div>
              <ul className="space-y-2">
                {h.items.map((item, i) => {
                  const lesson = byId.get(item.lessonId);
                  return lesson ? (
                    <li key={`${item.lessonId}-${i}`} className={`flex items-start gap-2 border-s-4 ps-3 ${tones[i % tones.length]?.edge}`}>
                      <div className="min-w-0 flex-1">
                        <LessonRow pathId={pathId} lesson={lesson} />
                      </div>
                      <span className="chip shrink-0 !text-xs">{item.starts ? `${item.minutes} د` : `تكملة · ${item.minutes} د`}</span>
                    </li>
                  ) : null;
                })}
              </ul>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

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
  const currentWeek = plan?.today?.week;
  return (
    <>
      <PageHeader
        eyebrow="خطتك الشخصية"
        title={goal.pathTitle}
        actions={
          next ? (
            <Link href={`/paths/${goal.pathId}/lessons/${next.id}`} className="btn-filled">
              تابع: {next.title}
            </Link>
          ) : null
        }
      />
      <div className={`${pageWidth} space-y-8 py-8`}>
        {error ? (
          <p role="alert" className="rounded-md bg-error-container p-4 text-on-error-container">
            {error}
          </p>
        ) : null}

        <section aria-label="هدفك" className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip">{goal.field}</span>
            <span className="chip">{levelLabels[goal.level] ?? goal.level}</span>
            <span className="chip">{goal.hoursPerDay} ساعة يوميًا</span>
            <Link href="/start" title="تُختبر من جديد عند تغيير الهدف" className="ms-auto text-sm text-primary underline">
              غيّر هدفي
            </Link>
          </div>
          <ProgressBar percent={progress.percent} label={`${progress.completedCount} مكتمل و${progress.skippedCount} متخطى من ${progress.totalCount}`} />
          {goal.interest || goal.rationale ? (
            <details className="text-sm text-on-surface-variant">
              <summary className="cursor-pointer">لماذا هذا المسار؟</summary>
              <p className="mt-2">
                {goal.interest ? <>شغفك: {goal.interest}. </> : null}
                {goal.rationale}
              </p>
            </details>
          ) : null}
        </section>

        {plan?.today ? (
          <section aria-labelledby="today-h" className="card-filled space-y-3 p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="today-h" className="font-display text-title text-on-surface">
                خطة اليوم
              </h2>
              <p className="text-sm text-on-surface-variant">
                الأسبوع {plan.today.week} · اليوم {plan.today.day} · نحو {plan.today.minutes} دقيقة
              </p>
            </div>
            <HourList pathId={goal.pathId} hours={plan.today.hours} lessons={plan.today.lessons} />
          </section>
        ) : null}

        <section aria-labelledby="plan-h" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="plan-h" className="font-display text-title text-on-surface">
              الأسابيع
            </h2>
            <form action={rebuildPlanAction}>
              <ConfirmSubmit
                className="btn-text btn-sm"
                message={revisions.length > 0 ? 'سيُعاد بناء الخطة تلقائيًا من دروسك المتبقية، وتُمحى تعديلاتك السابقة (بالمحادثة أو يدويًا). متابعة؟' : 'تحديث الخطة بحسب تقدمك؟'}
              >
                حدّث خطتي بحسب تقدمي
              </ConfirmSubmit>
            </form>
          </div>
          {!plan ? (
            <p className="text-on-surface-variant">لم تُبنَ خطتك بعد. اضغط «حدّث خطتي».</p>
          ) : plan.weeks.length === 0 ? (
            <p className="text-on-surface-variant">أنهيت كل دروس المسار. أحسنت!</p>
          ) : (
            <>
              {plan.summary ? <p className="text-sm text-on-surface-variant">{plan.summary}</p> : null}
              <div className="space-y-2">
                {plan.weeks.map((week) => (
                  <details key={week.week} open={week.week === (currentWeek ?? plan.weeks[0]?.week)} className="card-outlined group">
                    <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 p-4">
                      <span className="text-label text-primary">الأسبوع {week.week}</span>
                      <span className="font-display font-semibold text-on-surface">{week.title}</span>
                      <span className="ms-auto text-xs text-on-surface-variant">
                        {week.lessons.length} دروس · {week.minutes} د
                      </span>
                    </summary>
                    <div className="space-y-3 border-t border-outline-variant p-4">
                      {week.focus ? <p className="text-sm text-on-surface-variant">{week.focus}</p> : null}
                      <ol className="space-y-4">
                        {week.days.map((day) => {
                          const isToday = plan.today?.week === week.week && plan.today.day === day.day;
                          return (
                            <li key={day.day} className={`rounded-lg p-4 ${isToday ? 'bg-primary-container/40 ring-1 ring-primary' : 'bg-surface-container-low'}`}>
                              <div className="mb-3 flex flex-wrap items-center gap-2">
                                <h3 className="font-display text-lg font-semibold text-on-surface">اليوم {day.day}</h3>
                                {isToday ? <span className="chip">اليوم</span> : null}
                                <span className="ms-auto text-xs text-on-surface-variant">
                                  {day.hours.length} ساعات · {day.minutes} د
                                </span>
                              </div>
                              <HourList pathId={goal.pathId} hours={day.hours} lessons={day.lessons} />
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  </details>
                ))}
              </div>
            </>
          )}
        </section>

        {plan && plan.weeks.length > 0 ? (
          <details className="card-outlined">
            <summary className="cursor-pointer p-4 font-display text-title text-on-surface">عدّل خطتك</summary>
            <div className="space-y-4 border-t border-outline-variant p-4">
              <PlanChat revisions={revisions} />
              <PlanManualEditor plan={plan} catalog={catalog} currentPathId={goal.pathId} hoursPerDay={goal.hoursPerDay} />
            </div>
          </details>
        ) : null}

        <details>
          <summary className="cursor-pointer font-display text-title text-on-surface">سجلّ ما درستَه ({history.length})</summary>
          {history.length === 0 ? (
            <p className="mt-3 text-on-surface-variant">لم تُكمل درسًا بعد. ابدأ من الدرس التالي أعلاه.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {history.map((h) => (
                <li key={`${h.lessonId}-${h.at.getTime()}`} className="flex justify-between gap-3 text-sm text-on-surface">
                  <span>✓ {h.title}</span>
                  <time className="text-xs text-on-surface-variant" dateTime={h.at.toISOString()}>
                    {h.at.toLocaleDateString('ar')}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </details>
      </div>
    </>
  );
}
