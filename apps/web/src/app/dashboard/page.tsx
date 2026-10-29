/**
 * @file page.tsx
 * @description «تعلّمي»: تقدم المتعلم في كل المسارات، متابعة الدرس، واقتراحات وكيل التعلّم بأسبابها. بلا منطق عمل.
 */
import Link from 'next/link';
import { getAuth } from '../../composition/auth';
import { getContainer } from '../../composition/container';
import { EmptyState, PageHeader, ProgressBar, StatTile, pageWidth } from '../../components/ui';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'تعلّمي — قلم' };

const actionLabels = {
  proceed: 'تقدّم',
  review_lesson: 'مراجعة الدرس',
  retake_quiz: 'إعادة الاختبار',
  alternative_lesson: 'درس بديل',
  spaced_review: 'مراجعة متباعدة',
} as const;

export default async function DashboardPage() {
  const user = await (await getAuth()).getCurrentUser.execute();
  if (!user) {
    return (
      <div className={`${pageWidth} py-20`}>
        <EmptyState
          title="سجّل الدخول لترى تقدمك"
          body="تعلّمي يجمع تقدمك في كل المسارات واقتراحات الوكيل. الدخول برمز يصلك على بريدك، بلا كلمة مرور."
          action={
            <Link href="/login?next=/dashboard" className="btn-filled">
              تسجيل الدخول
            </Link>
          }
        />
      </div>
    );
  }

  const { getLearnerDashboard } = await getContainer();
  const dash = await getLearnerDashboard.execute({ userId: user.id });
  const { totals } = dash;
  const resume = dash.continueWith;

  return (
    <>
      <PageHeader
        eyebrow="تعلّمي"
        title="مرحبًا بعودتك"
        description="هذا ما أنجزته وما يقترحه وكيل التعلّم لك الآن، مع سبب كل اقتراح."
        crumbs={[{ label: 'الرئيسية', href: '/' }, { label: 'تعلّمي' }]}
        actions={
          <Link href="/review" className="btn-tonal">
            المراجعة
          </Link>
        }
      />

      <div className={`${pageWidth} space-y-12 pt-10`}>
        <section aria-label="ملخص تقدمك" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile value={String(totals.pathsStarted)} label="مسارات بدأتها" />
          <StatTile
            value={`${totals.lessonsCompleted}`}
            label="دروس أكملتها"
            hint={totals.lessonsSkipped > 0 ? `وتخطّيت ${totals.lessonsSkipped} بعد التشخيص` : `من ${totals.lessonsTotal}`}
          />
          <StatTile
            value={totals.quizAveragePercent === null ? '—' : `${totals.quizAveragePercent}%`}
            label="متوسط الاختبارات"
            hint={totals.quizAveragePercent === null ? 'لم تُجرِ اختبارًا بعد' : undefined}
          />
          <StatTile value={`${totals.lessonsTotal}`} label="دروس متاحة" />
        </section>

        {resume && resume.progress.nextLesson ? (
          <section aria-labelledby="resume-title" className="card-filled flex flex-wrap items-center justify-between gap-6 p-6">
            <div className="min-w-0 flex-1">
              <p className="text-label text-primary">تابع من حيث توقفت</p>
              <h2 id="resume-title" className="font-display text-title mt-1 text-on-surface">
                {resume.progress.nextLesson.title}
              </h2>
              <p className="mt-1 text-sm text-on-surface-variant">{resume.path.title}</p>
              <div className="mt-4 max-w-sm">
                <ProgressBar percent={resume.progress.percent} label={`تقدمك في ${resume.path.title}`} />
              </div>
            </div>
            <Link href={`/paths/${resume.path.id}/lessons/${resume.progress.nextLesson.id}`} className="btn-filled">
              تابع الدرس
            </Link>
          </section>
        ) : null}

        {dash.attention.length > 0 ? (
          <section aria-labelledby="attention-title">
            <h2 id="attention-title" className="font-display text-headline text-on-surface">
              يحتاج انتباهك
            </h2>
            <ul className="mt-5 grid gap-4 md:grid-cols-2">
              {dash.attention.map(({ path, advice }) => (
                <li key={path.id} className="card-outlined border-s-4 border-s-highlighter p-5">
                  <span className="chip chip-warn">{actionLabels[advice!.decision.action]}</span>
                  <p className="font-display text-title mt-3 text-on-surface">{advice!.lessonTitle}</p>
                  <p className="mt-1 text-sm text-on-surface-variant">{path.title}</p>
                  <p className="mt-3 text-on-surface">
                    <span className="font-semibold">لماذا؟ </span>
                    {advice!.decision.reason}
                  </p>
                  <Link
                    href={`/paths/${path.id}/lessons/${advice!.decision.lessonId}`}
                    className="btn-outlined btn-sm mt-4"
                  >
                    افتح الدرس
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section aria-labelledby="paths-title">
          <h2 id="paths-title" className="font-display text-headline text-on-surface">
            مساراتك
          </h2>
          {dash.paths.length === 0 ? (
            <div className="mt-5">
              <EmptyState title="لا مسارات بعد" body="ابدأ بمسار من الدليل." />
            </div>
          ) : (
            <ul className="mt-5 grid gap-4 md:grid-cols-2">
              {dash.paths.map(({ path, progress }) => {
                const started = progress.completedCount + progress.skippedCount > 0;
                return (
                  <li key={path.id} className="card-outlined p-5">
                    <div className="flex items-start justify-between gap-3">
                      <Link href={`/paths/${path.id}`} className="font-display text-title text-on-surface hover:text-primary">
                        {path.title}
                      </Link>
                      <span className={started ? 'chip chip-primary' : 'chip'}>{started ? 'جارٍ' : 'لم تبدأ'}</span>
                    </div>
                    <p className="mt-3 text-sm text-on-surface-variant">
                      أكملت {progress.completedCount} من {progress.totalCount}
                    </p>
                    <div className="mt-2">
                      <ProgressBar percent={progress.percent} label={`تقدمك في ${path.title}`} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
