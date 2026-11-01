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
      <section className="bg-surface-container-low">
        <div className="mx-auto max-w-6xl px-5 py-14 md:px-8 md:py-20">
          <Link href={`/paths/${path.id}`} className="text-sm text-on-surface-variant hover:text-primary">
            {path.title}
          </Link>
          <h1 className="mt-4 font-display text-display">{course.title}</h1>
          {conceptName ? <p className="mt-2 text-on-surface-variant">المفهوم: {conceptName}</p> : null}
          {course.description ? <p className="mt-3 max-w-[40rem] text-lg text-on-surface-variant">{course.description}</p> : null}
          <p className="mt-6 text-on-surface">
            {modulesText(course.modules.length)}، {lessonsText(course.lessonsCount)} · {formatDuration(course.totalDurationSeconds)}
          </p>
          {progress ? (
            <div className="mt-6 max-w-md">
              <div className="flex items-baseline justify-between text-sm text-on-surface-variant">
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
                className="mt-2 h-2 overflow-hidden rounded-full bg-surface-container-highest"
              >
                <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
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
              <h2 className="font-display text-lg font-semibold text-on-surface">{module.title}</h2>
              <p className="mt-1 text-on-surface-variant">{module.description}</p>

              <ul className="mt-5 divide-y divide-rule card-outlined">
                {module.lessons.map((lesson) => (
                  <li key={lesson.id} className="grid gap-1 p-4 md:grid-cols-[1fr_auto] md:gap-6">
                    <div>
                      <Link href={lessonHref(lesson.id)} className="font-medium text-on-surface hover:underline">
                        {lesson.title}
                      </Link>
                      {progress?.skippedLessonIds.has(lesson.id) ? (
                        <span className="ms-2 chip chip-mastery">
                          تم تخطيه (أتقنتَ مفهومه)
                        </span>
                      ) : null}
                      {progress?.completedLessonIds.has(lesson.id) ? (
                        <span className="ms-2 chip chip-progress">✓ مكتمل</span>
                      ) : null}
                      {progress?.quizPercentByLesson.has(lesson.id) ? (
                        <span className="ms-2 chip">آخر اختبار: {progress.quizPercentByLesson.get(lesson.id)}%</span>
                      ) : null}
                      {lesson.summary ? <p className="mt-1 text-sm text-on-surface-variant">{lesson.summary}</p> : null}
                      <p className="mt-2 text-sm text-on-surface-variant">
                        المصدر:{' '}
                        <a
                          href={lesson.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline underline-offset-2 hover:text-secondary-strong"
                        >
                          {lesson.channelName}
                        </a>
                      </p>
                    </div>
                    <p className="text-sm font-medium text-on-surface md:text-end">
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
