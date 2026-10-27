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
  const { getLearningPath, getPathProgress } = await getContainer();

  const result = await getLearningPath.execute({ pathId: createPathId(pathId) }).catch(() => null);
  if (!result) notFound();

  const { path, totalModulesCount, totalLessonsCount } = result;

  // التقدم للمسجَّل فقط؛ الزائر يرى المسار بلا تتبع
  const user = await (await getAuth()).getCurrentUser.execute();
  const progress = user ? await getPathProgress.execute({ userId: user.id, pathId: path.id }) : null;
  const lessonHref = (id: string) => `/paths/${path.id}/lessons/${id}`;

  return (
    <>
      <section className="bg-ink text-white">
        <div className="mx-auto max-w-5xl px-5 py-14">
          <Link href="/#paths" className="text-sm text-white/70 hover:text-white">
            كل المسارات
          </Link>
          <h1 className="mt-4 font-display text-3xl font-extrabold leading-[1.5] md:text-4xl">
            {path.title}
          </h1>
          <p className="mt-3 max-w-[40rem] text-lg text-white/80">{path.description}</p>
          <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-3 text-white/90">
            <div>
              <dt className="text-sm text-white/60">الهدف</dt>
              <dd>{path.targetGoal}</dd>
            </div>
            <div>
              <dt className="text-sm text-white/60">المحتوى</dt>
              <dd>
                {modulesText(totalModulesCount)}، {lessonsText(totalLessonsCount)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-white/60">مدة المشاهدة</dt>
              <dd>{formatDuration(path.totalDurationSeconds)}</dd>
            </div>
          </dl>

          {progress ? (
            <div className="mt-8 max-w-md">
              <div className="flex items-baseline justify-between text-sm text-white/80">
                <span>
                  أكملت {progress.completedCount} من {progress.totalCount}
                </span>
                <span>{progress.percent}%</span>
              </div>
              <div
                role="progressbar"
                aria-label="نسبة إكمال المسار"
                aria-valuenow={progress.percent}
                aria-valuemin={0}
                aria-valuemax={100}
                className="mt-2 h-2 overflow-hidden rounded-full bg-white/20"
              >
                <div className="h-full rounded-full bg-highlighter" style={{ width: `${progress.percent}%` }} />
              </div>
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

      <div className="mx-auto max-w-5xl px-5 pt-14">
        <ol className="stroke-list">
          {path.modules.map((module, index) => (
            <li key={module.id} className="stroke-item">
              <span className="stroke-node" aria-hidden="true">
                {index + 1}
              </span>
              <h2 className="font-display text-xl font-semibold text-ink">{module.title}</h2>
              <p className="mt-1 text-muted">{module.description}</p>

              <ul className="mt-5 divide-y divide-rule rounded-lg border border-rule bg-sheet">
                {module.lessons.map((lesson) => (
                  <li key={lesson.id} className="grid gap-1 p-4 md:grid-cols-[1fr_auto] md:gap-6">
                    <div>
                      <Link href={lessonHref(lesson.id)} className="font-medium text-ink hover:underline">
                        {lesson.title}
                      </Link>
                      {progress?.completedLessonIds.has(lesson.id) ? (
                        <span className="ms-2 rounded-full bg-sea/10 px-2 py-0.5 text-xs font-medium text-sea-dark">
                          ✓ مكتمل
                        </span>
                      ) : null}
                      {lesson.summary ? <p className="mt-1 text-sm text-muted">{lesson.summary}</p> : null}
                      <p className="mt-2 text-sm text-muted">
                        المصدر:{' '}
                        <a
                          href={lesson.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sea underline underline-offset-2 hover:text-sea-dark"
                        >
                          {lesson.channelName}
                        </a>
                      </p>
                    </div>
                    <p className="text-sm font-medium text-ink md:text-end">
                      {formatDuration(lesson.segment.durationSeconds)}
                    </p>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </div>
    </>
  );
}
