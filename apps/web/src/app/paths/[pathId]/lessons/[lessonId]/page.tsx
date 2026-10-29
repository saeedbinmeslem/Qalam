/**
 * @file page.tsx
 * @description صفحة الدرس: مقطع يوتيوب محدد بالبداية والنهاية، مع الملخص والمصدر والتنقل. بلا منطق عمل.
 */
import { createLessonId, createPathId } from '@qalam/domain';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { completeLessonAction, submitQuizAction, summarizeLessonAction } from './actions';
import { formatDuration } from '../../../../../components/format';
import { AskQalam } from '../../../../../components/ask-qalam';
import { LessonPlayer } from '../../../../../components/lesson-player';
import { getAuth } from '../../../../../composition/auth';
import { getContainer } from '../../../../../composition/container';

export const dynamic = 'force-dynamic';

export default async function LessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ pathId: string; lessonId: string }>;
  searchParams: Promise<{ summaryError?: string }>;
}) {
  const { pathId, lessonId } = await params;
  const { summaryError } = await searchParams;
  // صفحات الدروس تتطلب تسجيل الدخول لأن التقدم والأحداث تُسجَّل باسم المتعلم
  const auth = await getAuth();
  const user = await auth.getCurrentUser.execute();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/paths/${pathId}/lessons/${lessonId}`)}`);
  }

  const { getLesson, getLessonQuiz, getPathProgress, recordLearningEvent } = await getContainer();

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
  const progress = await getPathProgress.execute({ userId: user.id, pathId: createPathId(pathId) });
  const alreadyCompleted = progress.completedLessonIds.has(lessonId);
  const quiz = await getLessonQuiz.execute({ lessonId });
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
        شاهد هذا المقطع فقط ({formatDuration(lesson.segment.durationSeconds)}) من الفيديو.
      </p>

      <div className="mt-6">
        <LessonPlayer lesson={lesson} />
      </div>

      {lesson.studyGuide || lesson.notes ? (
        <div className="mt-4">
          {lesson.studyGuide ? (
            <Link href={`/paths/${pathId}/lessons/${lessonId}/summary`} className="btn-outlined btn-sm">
              اقرأ ملخص الدرس (وحمّله PDF)
            </Link>
          ) : (
            <form action={summarizeLessonAction}>
              <input type="hidden" name="pathId" value={pathId} />
              <input type="hidden" name="lessonId" value={lessonId} />
              <button type="submit" className="btn-outlined btn-sm">
                لخّص لي الدرس بالذكاء الاصطناعي
              </button>
              <span className="ms-3 text-xs text-muted">تقرأه بدل المشاهدة، ويمكنك حفظه PDF.</span>
            </form>
          )}
          {summaryError ? (
            <p role="alert" className="mt-2 text-sm text-error">
              {summaryError}
            </p>
          ) : null}
        </div>
      ) : null}

      {lesson.summary ? (
        <section className="mt-8 max-w-[40rem]">
          <h2 className="font-display text-lg font-semibold text-ink">ما ستخرج به</h2>
          <p className="mt-2 text-muted">{lesson.summary}</p>
        </section>
      ) : null}

      {lesson.notes || lesson.studyGuide || lesson.summary ? <AskQalam pathId={pathId} lessonId={lessonId} /> : null}

      {quiz.length > 0 ? (
        <section className="mt-10 max-w-[40rem]" aria-labelledby="quiz-title">
          <h2 id="quiz-title" className="font-display text-xl font-semibold text-ink">
            اختبر فهمك
          </h2>
          <p className="mt-1 text-sm text-muted">عدد الأسئلة: {quiz.length}. اختر إجابة واحدة لكل سؤال.</p>
          <form action={submitQuizAction} className="mt-5 space-y-6">
            <input type="hidden" name="pathId" value={pathId} />
            <input type="hidden" name="lessonId" value={lessonId} />
            {quiz.map((question, index) => (
              <fieldset key={question.id} className="card-outlined p-4">
                <legend className="px-1 font-medium text-ink">
                  {index + 1}. {question.prompt}
                </legend>
                <div className="mt-2 space-y-2">
                  {question.choices.map((choice, i) => (
                    <label key={i} className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-paper">
                      <input type="radio" name={`q_${question.id}`} value={i} required className="mt-1.5" />
                      <span>{choice}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
            <button
              type="submit"
              className="btn-filled"
            >
              تسليم الإجابات
            </button>
          </form>
        </section>
      ) : null}

      <p className="mt-8 text-sm text-muted">
        تقدمك في المسار: {progress.completedCount} من {progress.totalCount} ({progress.percent}%)
      </p>
      {alreadyCompleted ? (
        <p role="status" className="mt-2 inline-block chip chip-primary">
          ✓ أكملت هذا الدرس
        </p>
      ) : null}

      <form action={completeLessonAction} className="mt-6">
        <input type="hidden" name="pathId" value={pathId} />
        <input type="hidden" name="lessonId" value={lessonId} />
        <input type="hidden" name="nextLessonId" value={next?.id ?? ''} />
        <button
          type="submit"
          className="btn-filled"
        >
          {alreadyCompleted
            ? next
              ? 'الانتقال إلى الدرس التالي'
              : 'العودة إلى المسار'
            : next
              ? 'أكملت الدرس، انتقل إلى التالي'
              : 'أكملت الدرس'}
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
