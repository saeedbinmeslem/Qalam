/**
 * @file page.tsx
 * @description صفحة المسار: وحدات مرتبة تسلسليًا ودروسها مع المصدر. بلا منطق عمل.
 */
import { createPathId } from '@qalam/domain';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatDuration, lessonsText, modulesText } from '../../../components/format';
import { getContainer } from '../../../composition/container';

export const dynamic = 'force-dynamic';

export default async function PathPage({ params }: { params: Promise<{ pathId: string }> }) {
  const { pathId } = await params;
  const { getLearningPath } = await getContainer();

  const result = await getLearningPath.execute({ pathId: createPathId(pathId) }).catch(() => null);
  if (!result) notFound();

  const { path, totalModulesCount, totalLessonsCount } = result;

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
                      <Link
                        href={`/paths/${path.id}/lessons/${lesson.id}`}
                        className="font-medium text-ink hover:underline"
                      >
                        {lesson.title}
                      </Link>
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
