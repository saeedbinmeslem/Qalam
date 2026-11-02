/**
 * @file page.tsx
 * @description صفحة المسار: وحدات مرتبة تسلسليًا ودروسها مع المصدر. بلا منطق عمل.
 */
import { createPathId } from '@qalam/domain';
import { BackLink } from '../../../components/back-link';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CoverArt, CoverBanner, courseCoverUrl } from '../../../components/cover-art';
import { formatDuration, lessonsText, modulesText } from '../../../components/format';
import { ProgressRing } from '../../../components/ui';
import { getAuth } from '../../../composition/auth';
import { getContainer } from '../../../composition/container';

export const dynamic = 'force-dynamic';

export default async function PathPage({ params }: { params: Promise<{ pathId: string }> }) {
  const { pathId } = await params;
  const { getLearningPath, getPathProgress, getDiagnostic, learningAgent } = await getContainer();

  const result = await getLearningPath.execute({ pathId: createPathId(pathId) }).catch(() => null);
  if (!result) notFound();

  const { path, concepts, totalModulesCount, totalLessonsCount } = result;

  // التقدم للمسجَّل فقط؛ الزائر يرى المسار بلا تتبع
  const user = await (await getAuth()).getCurrentUser.execute();
  const progress = user ? await getPathProgress.execute({ userId: user.id, pathId: path.id }) : null;
  // الاختبار التشخيصي يُعرض قبل بدء التعلم، وعند توفر أسئلة معتمدة فقط
  const diagnosticAvailable =
    progress !== null &&
    progress.completedCount + progress.skippedCount === 0 &&
    ((await getDiagnostic.execute({ pathId: path.id }).catch(() => [])).length > 0);
  // وكيل التعلّم: قراره الحالي بسببه، وقراراته السابقة (شفافية «لماذا اقترحنا هذا؟»)
  const advice = user ? await learningAgent.run({ userId: user.id, pathId: path.id }).catch(() => null) : null;
  const history = user
    ? (await learningAgent.history({ userId: user.id, pathId: path.id, limit: 6 }).catch(() => [])).slice(1)
    : [];
  const lessonTitles = new Map(path.modules.flatMap((m) => m.lessons).map((l) => [l.id as string, l.title]));
  const actionLabels = {
    proceed: 'تقدّم',
    review_lesson: 'مراجعة الدرس',
    retake_quiz: 'إعادة الاختبار',
    alternative_lesson: 'درس بديل',
    spaced_review: 'مراجعة متباعدة',
  } as const;
  const lessonHref = (id: string) => `/paths/${path.id}/lessons/${id}`;

  return (
    <>
      <CoverBanner seed={path.id} title={path.title} imageUrl={path.coverUrl}>
        <BackLink href="/paths">كل المسارات</BackLink>
        <h1 className="mt-4 font-display text-display">{path.title}</h1>
        <p className="mt-3 max-w-[40rem] text-lg opacity-90">{path.description}</p>
        <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-3">
          <div>
            <dt className="text-sm opacity-90">الهدف</dt>
            <dd>{path.targetGoal}</dd>
          </div>
          <div>
            <dt className="text-sm opacity-90">المحتوى</dt>
            <dd>
              {modulesText(totalModulesCount)}، {lessonsText(totalLessonsCount)}
            </dd>
          </div>
          <div>
            <dt className="text-sm opacity-90">مدة المشاهدة</dt>
            <dd>{formatDuration(path.totalDurationSeconds)}</dd>
          </div>
        </dl>
      </CoverBanner>

      {progress ? (
        <section aria-label="تقدمك" className="border-b border-outline-variant bg-surface-container-low">
          <div className="mx-auto max-w-6xl px-5 py-8 md:px-8">
            <div className="flex items-center gap-4">
              <ProgressRing percent={progress.percent} label="نسبة إكمال المسار" />
              <p className="text-on-surface-variant">
                أكملت {progress.completedCount}
                {progress.skippedCount > 0 ? ` وتخطّيت ${progress.skippedCount}` : ''} من {progress.totalCount}
              </p>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {diagnosticAvailable ? (
                <Link href={`/paths/${path.id}/diagnostic`} className="btn-outlined">
                  اختبار تشخيصي: تخطَّ ما تعرفه
                </Link>
              ) : null}
              {progress.nextLesson ? (
                <Link href={lessonHref(progress.nextLesson.id)} className="btn-filled">
                  {progress.completedCount === 0 ? 'ابدأ المسار' : 'تابع من حيث توقفت'}
                </Link>
              ) : (
                <p className="chip chip-mastery">✓ أكملت هذا المسار</p>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {advice ? (
        <section aria-labelledby="why-title" className="mx-auto max-w-6xl px-5 md:px-8 pt-10">
          <div className="card-filled border-s-4 border-violet p-6">
            <p className="chip chip-ai">
              اقتراح وكيل التعلّم: {actionLabels[advice.decision.action]}
            </p>
            <p className="mt-1 font-display text-lg font-semibold text-on-surface">
              {advice.decision.action === 'proceed'
                ? `الدرس التالي: ${advice.lessonTitle}`
                : advice.decision.action === 'alternative_lesson'
                  ? `جرّب: ${advice.alternativeLessonTitle ?? advice.lessonTitle}`
                  : advice.lessonTitle}
            </p>
            <h2 id="why-title" className="mt-4 text-sm font-semibold text-on-surface">
              لماذا اقترحنا هذا؟
            </h2>
            <p className="mt-1 text-on-surface">{advice.decision.reason}</p>
            {advice.explanation ? <p className="mt-2 text-on-surface-variant">{advice.explanation}</p> : null}
            <Link
              href={lessonHref(
                advice.decision.action === 'alternative_lesson' && advice.decision.alternativeLessonId
                  ? advice.decision.alternativeLessonId
                  : advice.decision.lessonId,
              )}
              className="mt-4 inline-block text-primary underline underline-offset-2 hover:text-secondary-strong"
            >
              افتح الدرس
            </Link>
            {history.length > 0 ? (
              <details className="mt-4 text-sm text-on-surface-variant">
                <summary className="cursor-pointer text-on-surface">اقتراحات سابقة</summary>
                <ul className="mt-2 space-y-2">
                  {history.map((h) => (
                    <li key={h.decidedAt.toISOString()}>
                      <span className="font-medium text-on-surface">{actionLabels[h.action]}</span> —{' '}
                      {lessonTitles.get(h.lessonId) ?? h.lessonId}: {h.reason}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
        </section>
      ) : null}

      <div className="mx-auto max-w-6xl px-5 md:px-8 pt-14">
        {concepts
          .filter((concept) => path.courses.some((c) => c.conceptId === concept.id))
          .map((concept) => (
            <section key={concept.id} className="mb-20" aria-labelledby={`concept-${concept.id}`}>
              <h2 id={`concept-${concept.id}`} className="font-display text-headline text-on-surface">
                {concept.name}
              </h2>
              {concept.description ? <p className="mt-1 text-on-surface-variant">{concept.description}</p> : null}

              {path.courses
                .filter((course) => course.conceptId === concept.id)
                .map((course) => {
                  const lessons = course.modules.flatMap((m) => m.lessons);
                  const done = progress
                    ? lessons.filter((l) => progress.completedLessonIds.has(l.id) || progress.skippedLessonIds.has(l.id)).length
                    : 0;
                  return (
                    <Link
                      key={course.id}
                      href={`/paths/${path.id}/courses/${course.id}`}
                      className="card-filled card-interactive mt-6 flex overflow-hidden"
                    >
                      <CoverArt
                        seed={path.id}
                        title={course.title}
                        imageUrl={courseCoverUrl(course)}
                        className="hidden w-48 shrink-0 sm:block"
                      />
                      <div className="min-w-0 flex-1 p-6 md:p-7">
                      <h3 className="font-display text-xl font-semibold text-on-surface">{course.title}</h3>
                      <p className="mt-1 text-xs text-on-surface-variant">
                        {modulesText(course.modules.length)}، {lessonsText(course.lessonsCount)} · {formatDuration(course.totalDurationSeconds)}
                      </p>
                      {course.description ? <p className="mt-1 text-sm text-on-surface-variant">{course.description}</p> : null}
                      {progress ? (
                        <p className="mt-3 text-sm font-medium text-on-surface">
                          أنجزت {done} من {lessons.length}
                        </p>
                      ) : null}
                      </div>
                    </Link>
                  );
                })}
            </section>
          ))}
      </div>
    </>
  );
}
