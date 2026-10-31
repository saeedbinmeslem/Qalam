/**
 * @file page.tsx
 * @description صفحة المسار: وحدات مرتبة تسلسليًا ودروسها مع المصدر. بلا منطق عمل.
 */
import { createPathId } from '@qalam/domain';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatDuration, lessonsText, modulesText } from '../../../components/format';
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
      <section className="bg-ink text-on-primary">
        <div className="mx-auto max-w-6xl px-5 md:px-8 py-14">
          <Link href="/paths" className="text-sm text-on-primary/70 hover:text-on-primary">
            كل المسارات
          </Link>
          <h1 className="mt-4 font-display text-3xl font-extrabold leading-[1.5] md:text-4xl">
            {path.title}
          </h1>
          <p className="mt-3 max-w-[40rem] text-lg text-on-primary/80">{path.description}</p>
          <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-3 text-on-primary/90">
            <div>
              <dt className="text-sm text-on-primary/60">الهدف</dt>
              <dd>{path.targetGoal}</dd>
            </div>
            <div>
              <dt className="text-sm text-on-primary/60">المحتوى</dt>
              <dd>
                {modulesText(totalModulesCount)}، {lessonsText(totalLessonsCount)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-on-primary/60">مدة المشاهدة</dt>
              <dd>{formatDuration(path.totalDurationSeconds)}</dd>
            </div>
          </dl>

          {progress ? (
            <div className="mt-8 max-w-md">
              <div className="flex items-baseline justify-between text-sm text-on-primary/80">
                <span>
                  أكملت {progress.completedCount}
                  {progress.skippedCount > 0 ? ` وتخطّيت ${progress.skippedCount}` : ''} من {progress.totalCount}
                </span>
                <span>{progress.percent}%</span>
              </div>
              <div
                role="progressbar"
                aria-label="نسبة إكمال المسار"
                aria-valuenow={progress.percent}
                aria-valuemin={0}
                aria-valuemax={100}
                className="mt-2 h-2 overflow-hidden rounded-full bg-on-primary/20"
              >
                <div className="h-full rounded-full bg-highlighter" style={{ width: `${progress.percent}%` }} />
              </div>
              {diagnosticAvailable ? (
                <Link
                  href={`/paths/${path.id}/diagnostic`}
                  className="mt-5 me-3 inline-block rounded-lg border border-on-primary/40 px-5 py-2.5 font-medium text-on-primary transition-colors hover:bg-on-primary/10"
                >
                  اختبار تشخيصي: تخطَّ ما تعرفه
                </Link>
              ) : null}
              {progress.nextLesson ? (
                <Link
                  href={lessonHref(progress.nextLesson.id)}
                  className="mt-5 inline-block rounded-lg bg-highlighter px-5 py-2.5 font-medium text-ink transition-opacity hover:opacity-90"
                >
                  {progress.completedCount === 0 ? 'ابدأ المسار' : 'تابع من حيث توقفت'}
                </Link>
              ) : (
                <p className="mt-5 font-medium text-highlighter">أكملت هذا المسار 🎉</p>
              )}
            </div>
          ) : null}
        </div>
      </section>

      {advice ? (
        <section aria-labelledby="why-title" className="mx-auto max-w-6xl px-5 md:px-8 pt-10">
          <div className="card-outlined border-s-4 border-s-highlighter p-5">
            <p className="text-sm font-medium text-muted">
              اقتراح وكيل التعلّم: {actionLabels[advice.decision.action]}
            </p>
            <p className="mt-1 font-display text-lg font-semibold text-ink">
              {advice.decision.action === 'proceed'
                ? `الدرس التالي: ${advice.lessonTitle}`
                : advice.decision.action === 'alternative_lesson'
                  ? `جرّب: ${advice.alternativeLessonTitle ?? advice.lessonTitle}`
                  : advice.lessonTitle}
            </p>
            <h2 id="why-title" className="mt-4 text-sm font-semibold text-ink">
              لماذا اقترحنا هذا؟
            </h2>
            <p className="mt-1 text-ink">{advice.decision.reason}</p>
            {advice.explanation ? <p className="mt-2 text-muted">{advice.explanation}</p> : null}
            <Link
              href={lessonHref(
                advice.decision.action === 'alternative_lesson' && advice.decision.alternativeLessonId
                  ? advice.decision.alternativeLessonId
                  : advice.decision.lessonId,
              )}
              className="mt-4 inline-block text-sea underline underline-offset-2 hover:text-sea-dark"
            >
              افتح الدرس
            </Link>
            {history.length > 0 ? (
              <details className="mt-4 text-sm text-muted">
                <summary className="cursor-pointer text-ink">اقتراحات سابقة</summary>
                <ul className="mt-2 space-y-2">
                  {history.map((h) => (
                    <li key={h.decidedAt.toISOString()}>
                      <span className="font-medium text-ink">{actionLabels[h.action]}</span> —{' '}
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
            <section key={concept.id} className="mb-14" aria-labelledby={`concept-${concept.id}`}>
              <h2 id={`concept-${concept.id}`} className="font-display text-2xl font-extrabold text-ink">
                {concept.name}
              </h2>
              {concept.description ? <p className="mt-1 text-muted">{concept.description}</p> : null}

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
                      className="card-outlined mt-6 block p-5 shadow-sm transition-colors hover:border-ink md:p-6"
                    >
                      <h3 className="font-display text-xl font-semibold text-ink">{course.title}</h3>
                      <p className="mt-1 text-xs text-muted">
                        {modulesText(course.modules.length)}، {lessonsText(course.lessonsCount)} · {formatDuration(course.totalDurationSeconds)}
                      </p>
                      {course.description ? <p className="mt-1 text-sm text-muted">{course.description}</p> : null}
                      {progress ? (
                        <p className="mt-3 text-sm font-medium text-ink">
                          أنجزت {done} من {lessons.length}
                        </p>
                      ) : null}
                    </Link>
                  );
                })}
            </section>
          ))}
      </div>
    </>
  );
}
