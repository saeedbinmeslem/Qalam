/**
 * @file page.tsx
 * @description الاختبار التشخيصي: بلا `a` يعرض الأسئلة، ومعه يعرض النتيجة والدروس المتخطاة بأسبابها.
 * الأسئلة معتمدة فقط، والتصحيح في الخادم، والصفحة لا تسجّل شيئًا (التسجيل عند التسليم).
 */
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getAuth } from '../../../../composition/auth';
import { getContainer } from '../../../../composition/container';
import { submitDiagnosticAction } from './actions';

export const dynamic = 'force-dynamic';

function parseAnswers(raw: string | undefined): Record<string, number> {
  const answers: Record<string, number> = {};
  for (const part of (raw ?? '').split(',')) {
    const [id, index] = part.split(':');
    if (id && index !== undefined && /^\d+$/.test(index)) answers[id] = Number(index);
  }
  return answers;
}

export default async function DiagnosticPage({
  params,
  searchParams,
}: {
  params: Promise<{ pathId: string }>;
  searchParams: Promise<{ a?: string }>;
}) {
  const { pathId } = await params;
  const { a } = await searchParams;
  const user = await (await getAuth()).getCurrentUser.execute();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/paths/${pathId}/diagnostic`)}`);

  const { getDiagnostic, getDiagnosticResult } = await getContainer();
  const questions = await getDiagnostic.execute({ pathId }).catch(() => null);
  if (!questions) notFound();
  const back = `/paths/${pathId}`;

  if (questions.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16">
        <p className="text-muted">لا يوجد اختبار تشخيصي لهذا المسار بعد. ابدأ من الدرس الأول.</p>
        <Link href={back} className="mt-4 inline-block text-sea underline">
          العودة إلى المسار
        </Link>
      </div>
    );
  }

  if (a) {
    const outcome = await getDiagnosticResult.execute({ pathId, answers: parseAnswers(a) });
    const { result, skippedLessons } = outcome;
    return (
      <div className="mx-auto max-w-2xl px-5 py-12">
        <h1 className="font-display text-3xl font-extrabold text-ink">نتيجة الاختبار التشخيصي</h1>
        <p role="status" className="mt-3 text-xl text-ink">
          أجبتَ صحيحًا على {result.correct} من {result.total} ({result.percent}%)
        </p>

        <section className="mt-8" aria-labelledby="plan-title">
          <h2 id="plan-title" className="font-display text-xl font-semibold text-ink">
            ما قررناه لخطتك
          </h2>
          {skippedLessons.length === 0 ? (
            <p className="mt-2 text-muted">لم نجد ما يكفي من الأدلة لتخطي أي درس، فستبدأ من الدرس الأول. هذا طبيعي.</p>
          ) : (
            <>
              <p className="mt-2 text-muted">تخطّينا هذه الدروس لأنك أثبتّ إتقان مفاهيمها، وهذه الأسباب:</p>
              <ul className="mt-3 space-y-3">
                {skippedLessons.map((s) => (
                  <li key={s.lessonId} className="rounded-lg border border-rule bg-sheet p-4">
                    <p className="font-medium text-ink">{s.title}</p>
                    <p className="mt-1 text-sm text-muted">{s.reason}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <Link href={back} className="mt-8 inline-block rounded-lg bg-ink px-6 py-3 font-medium text-white hover:bg-ink-soft">
          متابعة المسار
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <Link href={back} className="text-sm text-muted hover:text-ink">
        ← المسار
      </Link>
      <h1 className="mt-2 font-display text-3xl font-extrabold text-ink">الاختبار التشخيصي</h1>
      <p className="mt-2 text-muted">
        عدد الأسئلة: {questions.length}. نقيس ما تعرفه الآن لنتخطى لك ما أتقنته. لا تخمّن: اتركه فارغًا إن لم تعرف، فالخطأ
        لا يضرّك، بل يعني فقط أن الدرس سيبقى في خطتك.
      </p>
      <form action={submitDiagnosticAction} className="mt-6 space-y-6">
        <input type="hidden" name="pathId" value={pathId} />
        {questions.map((question, index) => (
          <fieldset key={question.id} className="rounded-lg border border-rule bg-sheet p-4">
            <legend className="px-1 font-medium text-ink">
              {index + 1}. {question.prompt}
            </legend>
            <div className="mt-2 space-y-2">
              {question.choices.map((choice, i) => (
                <label key={i} className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-paper">
                  <input type="radio" name={`q_${question.id}`} value={i} className="mt-1.5" />
                  <span>{choice}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        <button type="submit" className="rounded-lg bg-sea px-6 py-3 font-medium text-white transition-colors hover:bg-sea-dark">
          تسليم الإجابات
        </button>
      </form>
    </div>
  );
}
