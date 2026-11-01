/**
 * @file page.tsx
 * @description صفحة الكورس: وحداته ودروسه مع المصدر وتقدّم المتعلم. بلا منطق عمل.
 */
import { createPathId } from '@qalam/domain';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CoverBanner, LessonThumb, courseCoverUrl } from '../../../../../components/cover-art';
import { formatDuration, lessonsText, modulesText } from '../../../../../components/format';
import { ProgressRing } from '../../../../../components/ui';
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
      <CoverBanner seed={path.id} title={course.title} imageUrl={courseCoverUrl(course, 'large')}>
        <Link href={`/paths/${path.id}`} className="text-sm opacity-90 hover:underline">
          {path.title}
        </Link>
        <h1 className="mt-4 font-display text-display">{course.title}</h1>
        {conceptName ? <p className="mt-2 opacity-90">المفهوم: {conceptName}</p> : null}
        {course.description ? <p className="mt-3 max-w-[40rem] text-lg opacity-90">{course.description}</p> : null}
        <p className="mt-6">
          {modulesText(course.modules.length)}، {lessonsText(course.lessonsCount)} · {formatDuration(course.totalDurationSeconds)}
        </p>
      </CoverBanner>

      {progress ? (
        <section aria-label="تقدمك" className="border-b border-outline-variant bg-surface-container-low">
          <div className="mx-auto max-w-6xl px-5 py-6 md:px-8">
            <div className="flex items-center gap-4">
              <ProgressRing percent={percent} label="نسبة إكمال الكورس" size={64} />
              <p className="text-on-surface-variant">
                أنجزت {doneCount} من {lessons.length}
              </p>
            </div>
          </div>
        </section>
      ) : null}

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
                  <li key={lesson.id} className="grid items-start gap-3 p-4 sm:grid-cols-[8rem_1fr_auto] md:gap-6">
                    <Link href={lessonHref(lesson.id)} tabIndex={-1} aria-hidden="true" className="hidden sm:block">
                      <LessonThumb
                        videoId={lesson.youtubeVideoId}
                        seed={path.id}
                        title={lesson.title}
                        className="aspect-video w-full rounded-sm"
                      />
                    </Link>
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
                    <p className="text-sm font-medium text-on-surface sm:text-end">
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
