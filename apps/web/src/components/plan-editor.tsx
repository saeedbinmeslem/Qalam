/**
 * @file plan-editor.tsx
 * @description تعديل الخطة بعد إنشائها: محادثة مع الذكاء الاصطناعي، وتعديل يدوي لعناوين الأسابيع وتوزيع الدروس.
 * بلا منطق عمل: النماذج تستدعي actions التي تحوّلها إلى use cases، والتصحيح (ما سقط من الدروس، المعرّفات المجهولة) في Domain.
 */
import type { PersonalPlanView } from '@qalam/application';
import { changePlanPathAction, editPlanAction, revisePlanAction } from '../app/start/actions';
import { ConfirmSubmit } from './confirm-submit';
import { InlinePending, PendingButton } from './inline-pending';
import { PlanManualForm } from './plan-manual-form';

type Plan = NonNullable<PersonalPlanView['plan']>;

/** محادثة تعديل الخطة: الذكاء الاصطناعي يعدّل الأسابيع حسب طلب المتعلم، وكل ردّ محفوظ في السجل */
export function PlanChat({ revisions }: { revisions: PersonalPlanView['revisions'] }) {
  const turns = revisions.filter((r) => r.kind === 'chat' || r.request || r.reply);
  return (
    <section id="plan-chat" aria-labelledby="chat-h" className="card-outlined p-5">
      <h2 id="chat-h" className="font-display text-title text-on-surface">
        عدّل خطتك بالمحادثة
      </h2>
      <p className="mt-1 text-sm text-on-surface-variant">
        اكتب ما تريد تغييره بكلامك، ويعدّل قلم الخطة من دروس المسار نفسها دون إضافة دروس من خارجه.
      </p>

      {turns.length > 0 ? (
        <ol className="mt-4 space-y-3" aria-label="سجل المحادثة">
          {turns.map((turn) => (
            <li key={turn.at.getTime()} className="space-y-2">
              <p className="ms-auto w-fit max-w-[90%] rounded-lg rounded-ee-sm bg-primary-container px-4 py-2 text-sm text-on-primary-container">{turn.request}</p>
              <p className="w-fit max-w-[90%] rounded-lg rounded-es-sm bg-surface-container-low px-4 py-2 text-sm text-on-surface">
                {turn.reply}
                <span className={`mt-1 block text-xs ${turn.changed ? 'text-secondary-strong' : 'text-on-surface-variant'}`}>{turn.changed ? '✓ عُدّلت الخطة' : 'لم تتغير الخطة'}</span>
              </p>
            </li>
          ))}
        </ol>
      ) : null}

      <form action={revisePlanAction} data-inline-loader className="mt-4 space-y-3">
        <label className="block">
          <span className="sr-only">طلبك</span>
          <textarea
            name="message"
            rows={3}
            required
            maxLength={1000}
            className="field"
            placeholder="مثال: عندي امتحانات، خفّف الأسبوعين الأولين. أو: انقل درس الدوال إلى الأسبوع الأول. أو: صرت أتفرغ 6 ساعات أسبوعيًا."
          />
        </label>
        <PendingButton className="btn-filled">أرسل وعدّل خطتي</PendingButton>
        <InlinePending label="قلم يعدّل خطتك…" />
      </form>
    </section>
  );
}

/** تعديل يدوي شامل: المسار، والكورسات والمفاهيم والدروس المشمولة، والمدة، وتوزيع الأسابيع */
export function PlanManualEditor({ plan, catalog, currentPathId, hoursPerWeek }: { plan: Plan; catalog: PersonalPlanView['catalog']; currentPathId: string; hoursPerWeek: number }) {
  const otherPaths = catalog.paths.filter((p) => p.id !== currentPathId);
  return (
    <details className="card-outlined p-5">
      <summary className="cursor-pointer font-display text-title text-on-surface">عدّل الخطة يدويًا</summary>

      {otherPaths.length > 0 ? (
        <form action={changePlanPathAction} className="mt-4 space-y-3 rounded-md border border-outline-variant p-4">
          <p className="text-label text-primary">المسار المراد تعلّمه</p>
          <div className="flex flex-wrap items-center gap-3">
            <select name="pathId" className="field !w-auto min-w-56" defaultValue={otherPaths[0]?.id}>
              {otherPaths.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            <ConfirmSubmit className="btn-outlined btn-sm" message="سيُبنى لك خطة جديدة من دروس المسار المختار وتُترك خطتك الحالية. متابعة؟">
              انتقل إلى هذا المسار
            </ConfirmSubmit>
          </div>
          <p className="text-xs text-on-surface-variant">بعد الانتقال تظهر كورسات المسار الجديد ودروسه هنا لتختار منها.</p>
        </form>
      ) : null}

      <PlanManualForm action={editPlanAction} catalog={catalog} plan={plan} hoursPerWeek={hoursPerWeek} />
    </details>
  );
}
