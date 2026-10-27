/**
 * @file page.tsx
 * @description صفحة الدرس: مقطع يوتيوب محدد بالبداية والنهاية، مع الملخص والمصدر والتنقل. بلا منطق عمل.
 */
import { createLessonId, createPathId } from '@qalam/domain';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { completeLessonAction } from './actions';
import { formatDuration } from '../../../../../components/format';
import { YouTubePlayer } from '../../../../../components/youtube-player';
import { getAuth } from '../../../../../composition/auth';
import { getContainer } from '../../../../../composition/container';

export const dynamic = 'force-dynamic';

export default async function LessonPage({
  params,
}: {
  params: Promise<{ pathId: string; lessonId: string }>;
}) {
  const { pathId, lessonId } = await params;
  // صفحات الدروس تتطلب تسجيل الدخول لأن التقدم والأحداث تُسجَّل باسم المتعلم
  const auth = await getAuth();
  const user = await auth.getCurrentUser.execute();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/paths/${pathId}/lessons/${lessonId}`)}`);
  }

  const { getLesson, recordLearningEvent } = await getContainer();

  const result = await getLesson
    .execute({ pathId: createPathId(pathId), lessonId: createLessonId(lessonId) })
    .catch(() => null);
  if (!result) notFound();

  const { pathTitle, module, lesson, previous, next } = result;
  await recordLearningEvent.execute({
    userId: user.id,
    type: 'lesson_opened',
    payload: { pathId, lessonId },
  });
  const lessonHref = (id: string) => `/paths/${pathId}/lessons/${id}`;

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <nav aria-label="مسار التنقل" className="text-sm text-muted">
        <Link href={`/paths/${pathId}`} className="hover:underline">
          {pathTitle}
        </Link>{' '}
        / {module.title}
      </nav>

      <h1 className="mt-4 font-display text-3xl font-extrabold leading-[1.5] text-ink">
        {lesson.title}
      </h1>
      <p className="mt-1 text-muted">
        شاهد هذا المقطع فقط ({formatDuration(lesson.segment.durationSeconds)}) من الفيديو الأصلي.
      </p>

      <div className="mt-6">
        <YouTubePlayer
          embedUrl={lesson.segment.toEmbedUrl()}
          title={lesson.title}
          channelName={lesson.channelName}
          sourceUrl={lesson.sourceUrl}
        />
      </div>

      {lesson.summary ? (
        <section className="mt-8 max-w-[40rem]">
          <h2 className="font-display text-lg font-semibold text-ink">ما ستخرج به</h2>
          <p className="mt-2 text-muted">{lesson.summary}</p>
        </section>
      ) : null}

      <form action={completeLessonAction} className="mt-10">
        <input type="hidden" name="pathId" value={pathId} />
        <input type="hidden" name="lessonId" value={lessonId} />
        <input type="hidden" name="nextLessonId" value={next?.id ?? ''} />
        <button
          type="submit"
          className="rounded-lg bg-ink px-6 py-3 font-medium text-white transition-colors hover:bg-ink-soft"
        >
          {next ? 'أكملت الدرس، انتقل إلى التالي' : 'أكملت الدرس'}
        </button>
      </form>

      <nav aria-label="الدروس" className="mt-12 flex justify-between gap-4 border-t border-rule pt-6">
        {previous ? (
          <Link href={lessonHref(previous.id)} className="text-ink hover:underline">
            <span className="block text-sm text-muted">الدرس السابق</span>
            {previous.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={lessonHref(next.id)} className="text-end text-ink hover:underline">
            <span className="block text-sm text-muted">الدرس التالي</span>
            {next.title}
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
