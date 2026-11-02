/**
 * @file page.tsx
 * @description نتيجة الاختبار القصير: الدرجة، وكل سؤال مع إجابتك والصحيحة والشرح. التصحيح في الخادم.
 * الإجابات تأتي في الرابط (a=id:index,...) والصفحة لا تسجّل شيئًا (التسجيل عند التسليم).
 */
import Link from 'next/link';
import { BackLink } from '../../../../../../components/back-link';
import { redirect } from 'next/navigation';
import { getAuth } from '../../../../../../composition/auth';
import { getContainer } from '../../../../../../composition/container';

export const dynamic = 'force-dynamic';

function parseAnswers(raw: string | undefined): Record<string, number> {
  const answers: Record<string, number> = {};
  for (const part of (raw ?? '').split(',')) {
    const [id, index] = part.split(':');
    if (id && index !== undefined && /^\d+$/.test(index)) answers[id] = Number(index);
  }
  return answers;
}

export default async function QuizResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ pathId: string; lessonId: string }>;
  searchParams: Promise<{ a?: string }>;
}) {
  const { pathId, lessonId } = await params;
  const { a } = await searchParams;
  const user = await (await getAuth()).getCurrentUser.execute();
  if (!user) redirect('/login');

  const { getQuizResult } = await getContainer();
  const result = await getQuizResult.execute({ lessonId, answers: parseAnswers(a) });
  const back = `/paths/${pathId}/lessons/${lessonId}`;

  if (result.total === 0) {
    return (
      <div className="mx-auto max-w-2xl px-5 md:px-8 py-16">
        <p className="text-on-surface-variant">لا يوجد اختبار لهذا الدرس.</p>
        <div className="mt-4"><BackLink href={back}>العودة إلى الدرس</BackLink></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-5 md:px-8 py-12">
      <h1 className="font-display text-display text-on-surface">نتيجة الاختبار</h1>
      <p role="status" className="mt-3 text-xl text-on-surface">
        أجبتَ صحيحًا على {result.correct} من {result.total} ({result.percent}%)
      </p>
      <p className="mt-1 text-on-surface-variant">
        {result.percent === 100
          ? 'ممتاز! أتقنتَ هذا الدرس.'
          : result.percent >= 60
            ? 'جيد. راجع الأسئلة الخاطئة قبل أن تنتقل.'
            : 'يُستحسن أن تعيد مشاهدة الدرس ثم تعيد المحاولة.'}
      </p>

      <ol className="mt-8 space-y-5">
        {result.results.map((r, index) => (
          <li key={r.questionId} className="card-outlined p-4">
            <p className="font-medium text-on-surface">
              {index + 1}. {r.prompt}{' '}
              <span className={r.isCorrect ? 'text-secondary-strong' : 'text-error'}>{r.isCorrect ? '✓ صحيح' : '✗ خطأ'}</span>
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              {r.choices.map((choice, i) => (
                <li
                  key={i}
                  className={
                    i === r.correctIndex
                      ? 'font-medium text-secondary-strong'
                      : i === r.chosenIndex
                        ? 'text-error line-through'
                        : 'text-on-surface-variant'
                  }
                >
                  {i === r.correctIndex ? '✓ ' : i === r.chosenIndex ? '✗ ' : '• '}
                  {choice}
                  {i === r.chosenIndex ? ' (اختيارك)' : ''}
                </li>
              ))}
            </ul>
            {r.explanation ? <p className="mt-3 text-sm text-on-surface-variant">{r.explanation}</p> : null}
          </li>
        ))}
      </ol>

      <Link href={back} className="mt-8 btn-filled">
        العودة إلى الدرس
      </Link>
    </div>
  );
}
