'use client';

/**
 * @file ask-qalam.tsx
 * @description صندوق «اسأل قلم» في صفحة الدرس: سؤال واحد وإجابة مبنية على مادة الدرس، مع تنبيه حين لا تكفي المادة.
 */
import { useActionState } from 'react';
import { InlinePending } from './inline-pending';
import { askLessonAction, type AskState } from '../app/paths/[pathId]/lessons/[lessonId]/ask-action';

export function AskQalam({ pathId, lessonId }: { pathId: string; lessonId: string }) {
  const [state, action, pending] = useActionState<AskState, FormData>(askLessonAction, {});

  return (
    <section className="mt-10 max-w-[40rem] border-s-4 border-violet ps-5" aria-labelledby="ask-title">
      <h2 id="ask-title" className="font-display text-xl font-semibold text-on-surface">
        اسأل قلم عن هذا الدرس
      </h2>
      <p className="mt-1 text-sm text-on-surface-variant">يجيبك من مادة الدرس فقط، فإن لم تكفِ أخبرك بصدق.</p>
      <form action={action} data-inline-loader className="mt-4 space-y-3">
        <input type="hidden" name="pathId" value={pathId} />
        <input type="hidden" name="lessonId" value={lessonId} />
        <textarea
          name="question"
          rows={2}
          maxLength={500}
          required
          defaultValue={state.question}
          className="field"
          placeholder="مثال: ما الفرق بين البت والبايت؟"
          aria-label="سؤالك"
        />
        <button type="submit" className="btn-filled" disabled={pending}>
          {pending ? 'قلم يفكّر…' : 'اسأل'}
        </button>
        <InlinePending label="قلم يبحث في مادة الدرس…" />
      </form>

      {state.error ? (
        <p role="alert" className="mt-4 text-sm text-error">
          {state.error}
        </p>
      ) : null}
      {state.answer ? (
        <div role="status" className="card-outlined mt-4 p-4">
          <p className="whitespace-pre-line leading-8 text-on-surface">{state.answer}</p>
          {state.grounded ? null : (
            <p className="mt-2 text-xs text-on-surface-variant">هذه الإجابة ليست من مادة الدرس؛ راجع الفيديو للتأكد.</p>
          )}
        </div>
      ) : null}
    </section>
  );
}
