/**
 * @file page.tsx
 * @description نتيجة الاختبار القصير: الدرجة، وكل سؤال مع إجابتك والصحيحة والشرح. التصحيح في الخادم.
 * الإجابات تأتي في الرابط (a=id:index,...) والصفحة لا تسجّل شيئًا (التسجيل عند التسليم).
 */
import Link from 'next/link';
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
      <div className="mx-auto max-w-2xl px-5 py-16">
        <p className="text-muted">لا يوجد اختبار لهذا الدرس.</p>
        <Link href={back} className="mt-4 inline-block text-sea underline">
          العودة إلى الدرس
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <h1 className="font-display text-3xl font-extrabold text-ink">نتيجة الاختبار</h1>
      <p role="status" className="mt-3 text-xl text-ink">
        أجبتَ صحيحًا على {result.correct} من {result.total} ({result.percent}%)
      </p>
      <p className="mt-1 text-muted">
        {result.percent === 100
          ? 'ممتاز! أتقنتَ هذا الدرس.'
          : result.percent >= 60
            ? 'جيد. راجع الأسئلة الخاطئة قبل أن تنتقل.'
            : 'يُستحسن أن تعيد مشاهدة الدرس ثم تعيد المحاولة.'}
      </p>

      <ol className="mt-8 space-y-5">
        {result.results.map((r, index) => (
          <li key={r.questionId} className="rounded-lg border border-rule bg-sheet p-4">
            <p className="font-medium text-ink">
              {index + 1}. {r.prompt}{' '}
              <span className={r.isCorrect ? 'text-sea-dark' : 'text-red-700'}>{r.isCorrect ? '✓ صحيح' : '✗ خطأ'}</span>
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              {r.choices.map((choice, i) => (
                <li
                  key={i}
                  className={
                    i === r.correctIndex
                      ? 'font-medium text-sea-dark'
                      : i === r.chosenIndex
                        ? 'text-red-700 line-through'
                        : 'text-muted'
                  }
                >
                  {i === r.correctIndex ? '✓ ' : i === r.chosenIndex ? '✗ ' : '• '}
                  {choice}
                  {i === r.chosenIndex ? ' (اختيارك)' : ''}
                </li>
              ))}
            </ul>
            {r.explanation ? <p className="mt-3 text-sm text-muted">{r.explanation}</p> : null}
          </li>
        ))}
      </ol>

      <Link href={back} className="mt-8 inline-block rounded-lg bg-ink px-6 py-3 font-medium text-white hover:bg-ink-soft">
        العودة إلى الدرس
      </Link>
    </div>
  );
}
