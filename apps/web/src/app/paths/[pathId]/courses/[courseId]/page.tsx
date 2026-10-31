/**
 * @file page.tsx
 * @description صفحة الكورس: وحداته ودروسه مع المصدر وتقدّم المتعلم. بلا منطق عمل.
 */
import { createPathId } from '@qalam/domain';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatDuration, lessonsText, modulesText } from '../../../../../components/format';
import { getAuth } from '../../../../../composition/auth';
import { getContainer } from '../../../../../composition/container';

export const dynamic = 'force-dynamic';

export default async function CoursePage({ params }: { params: Promise<{ pathId: string; courseId: string }> }) {
  const { pathId, courseId } = await params;
  const { getLearningPath, getPathProgress } = await getContainer();

  const result = await getLearningPath.execute({ pathId: createPathId(pathId) }).catch(() => null);
  const course = result?.path.courses.find((c) => c.id === courseId);
  if (!result || !course) notFound();
  const { path, concepts } = result;
  const conceptName = concepts.find((c) => c.id === course.conceptId)?.name;

  // التقدم للمسجَّل فقط؛ الزائر يرى الكورس بلا تتبع
  const user = await (await getAuth()).getCurrentUser.execute();
  const progress = user ? await getPathProgress.execute({ userId: user.id, pathId: path.id }) : null;
  const lessonHref = (id: string) => `/paths/${path.id}/lessons/${id}`;

  const lessons = course.modules.flatMap((m) => m.lessons);
  const doneCount = progress
    ? lessons.filter((l) => progress.completedLessonIds.has(l.id) || progress.skippedLessonIds.has(l.id)).length
    : 0;
  const percent = lessons.length > 0 ? Math.round((doneCount / lessons.length) * 100) : 0;

  return (
    <>
      <section className="bg-ink text-on-primary">
        <div className="mx-auto max-w-6xl px-5 md:px-8 py-14">
          <Link href={`/paths/${path.id}`} className="text-sm text-on-primary/70 hover:text-on-primary">
            {path.title}
          </Link>
          <h1 className="mt-4 font-display text-3xl font-extrabold leading-[1.5] md:text-4xl">{course.title}</h1>
          {conceptName ? <p className="mt-2 text-on-primary/70">المفهوم: {conceptName}</p> : null}
          {course.description ? <p className="mt-3 max-w-[40rem] text-lg text-on-primary/80">{course.description}</p> : null}
          <p className="mt-6 text-on-primary/90">
            {modulesText(course.modules.length)}، {lessonsText(course.lessonsCount)} · {formatDuration(course.totalDurationSeconds)}
          </p>
          {progress ? (
            <div className="mt-6 max-w-md">
              <div className="flex items-baseline justify-between text-sm text-on-primary/80">
                <span>
                  أنجزت {doneCount} من {lessons.length}
                </span>
                <span>{percent}%</span>
              </div>
              <div
                role="progressbar"
                aria-label="نسبة إكمال الكورس"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
                className="mt-2 h-2 overflow-hidden rounded-full bg-on-primary/20"
              >
                <div className="h-full rounded-full bg-highlighter" style={{ width: `${percent}%` }} />
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5 md:px-8 py-14">
        <ol className="stroke-list">
          {course.modules.map((module, index) => (
            <li key={module.id} className="stroke-item">
              <span className="stroke-node" aria-hidden="true">
                {index + 1}
              </span>
              <h2 className="font-display text-lg font-semibold text-ink">{module.title}</h2>
              <p className="mt-1 text-muted">{module.description}</p>

              <ul className="mt-5 divide-y divide-rule card-outlined">
                {module.lessons.map((lesson) => (
                  <li key={lesson.id} className="grid gap-1 p-4 md:grid-cols-[1fr_auto] md:gap-6">
                    <div>
                      <Link href={lessonHref(lesson.id)} className="font-medium text-ink hover:underline">
                        {lesson.title}
                      </Link>
                      {progress?.skippedLessonIds.has(lesson.id) ? (
                        <span className="ms-2 rounded-full bg-highlighter/25 px-2 py-0.5 text-xs font-medium text-ink">
                          تم تخطيه (أتقنتَ مفهومه)
                        </span>
                      ) : null}
                      {progress?.completedLessonIds.has(lesson.id) ? (
                        <span className="ms-2 chip chip-primary">✓ مكتمل</span>
                      ) : null}
                      {progress?.quizPercentByLesson.has(lesson.id) ? (
                        <span className="ms-2 chip">آخر اختبار: {progress.quizPercentByLesson.get(lesson.id)}%</span>
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
