'use client';

/**
 * @file plan-manual-form.tsx
 * @description نموذج التعديل اليدوي الشامل لخطة المتعلم: الدروس المشمولة (باختيار كورس أو مفهوم كامل أو درس درسًا)،
 * الساعات اليومية، وتوزيع الدروس على الأسابيع بعناوينها وأسبابها. الحالة هنا للعرض فقط؛
 * التصحيح والحفظ في use case (`EditPersonalPlanUseCase`) عبر الإجراء الممرَّر من الصفحة.
 */
import { useMemo, useState } from 'react';
import type { PersonalPlanView } from '@qalam/application';

type Catalog = PersonalPlanView['catalog'];
type Plan = NonNullable<PersonalPlanView['plan']>;

interface Props {
  action: (data: FormData) => Promise<void>;
  catalog: Catalog;
  plan: Plan;
  hoursPerDay: number;
}

export function PlanManualForm({ action, catalog, plan, hoursPerDay }: Props) {
  const lessonWeek = useMemo(() => {
    const map = new Map<string, string>();
    for (const w of plan.weeks) for (const l of w.lessons) map.set(l.id, String(w.week));
    return map;
  }, [plan]);
  const lastWeek = String(plan.weeks[plan.weeks.length - 1]?.week ?? 1);

  const selectable = catalog.courses.flatMap((c) => c.lessons).filter((l) => l.state === 'in' || l.state === 'out');
  const [included, setIncluded] = useState(() => new Set(selectable.filter((l) => l.state === 'in').map((l) => l.id)));
  const [weekOf, setWeekOf] = useState(() => new Map(selectable.map((l) => [l.id, lessonWeek.get(l.id) ?? lastWeek])));
  const [redistribute, setRedistribute] = useState(false);

  const toggle = (ids: string[], on: boolean) =>
    setIncluded((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  const weekKeys = plan.weeks.map((w) => String(w.week));
  const titles = new Map(plan.weeks.map((w) => [String(w.week), w]));
  const minutesOf = new Map(selectable.map((l) => [l.id, l.minutes]));
  const totalMinutes = [...included].reduce((sum, id) => sum + (minutesOf.get(id) ?? 0), 0);

  return (
    <form action={action} className="mt-4 space-y-6">
      {selectable.map((l) => (
        <input key={l.id} type="hidden" name="order" value={l.id} />
      ))}

      <fieldset className="space-y-3 rounded-md border border-outline-variant p-4">
        <legend className="px-2 text-label text-primary">المدة</legend>
        <label className="flex flex-wrap items-center gap-3 text-sm text-on-surface">
          كم ساعة تتفرغ يوميًا؟
          <input name="hoursPerDay" type="number" min={0.5} max={12} step={0.5} defaultValue={hoursPerDay} className="field !w-24" />
        </label>
        <label className="flex items-start gap-3 text-sm text-on-surface">
          <input type="checkbox" name="redistribute" checked={redistribute} onChange={(e) => setRedistribute(e.target.checked)} className="mt-1 size-4 accent-[var(--color-primary)]" />
          <span>
            وزّع الدروس على الأسابيع تلقائيًا بحسب هذه الساعات
            <span className="block text-xs text-on-surface-variant">فعّله بعد تغيير الساعات أو إضافة دروس كثيرة. يُلغي التوزيع اليدوي أدناه.</span>
          </span>
        </label>
        <p className="text-xs text-on-surface-variant">
          المختار الآن: {included.size} درسًا · نحو {Math.round(totalMinutes / 60)} ساعة إجمالًا.
        </p>
      </fieldset>

      <fieldset className="space-y-4 rounded-md border border-outline-variant p-4">
        <legend className="px-2 text-label text-primary">ما الذي تدرسه؟ (الكورسات والمفاهيم والدروس)</legend>
        {catalog.courses.map((course) => {
          const ids = course.lessons.filter((l) => l.state === 'in' || l.state === 'out').map((l) => l.id);
          if (ids.length === 0) return null;
          const count = ids.filter((id) => included.has(id)).length;
          return (
            <div key={course.id} className="space-y-2">
              <label className="flex flex-wrap items-center gap-3 font-medium text-on-surface">
                <input
                  type="checkbox"
                  checked={count === ids.length}
                  ref={(el) => {
                    if (el) el.indeterminate = count > 0 && count < ids.length;
                  }}
                  onChange={(e) => toggle(ids, e.target.checked)}
                  className="size-4 accent-[var(--color-primary)]"
                />
                {course.title}
                {course.conceptName ? <span className="chip">مفهوم: {course.conceptName}</span> : null}
                <span className="text-xs font-normal text-on-surface-variant">
                  {count} / {ids.length}
                </span>
              </label>
              <ul className="ms-7 space-y-1">
                {course.lessons.map((l) =>
                  l.state === 'done' || l.state === 'skipped' ? (
                    <li key={l.id} className="text-sm text-on-surface-variant">
                      {l.title} <span className="text-xs">({l.state === 'done' ? '✓ أنجزته' : 'تخطّيناه'})</span>
                    </li>
                  ) : (
                    <li key={l.id}>
                      <label className="flex items-center gap-3 text-sm text-on-surface">
                        <input
                          type="checkbox"
                          name="include"
                          value={l.id}
                          checked={included.has(l.id)}
                          onChange={(e) => toggle([l.id], e.target.checked)}
                          className="size-4 accent-[var(--color-primary)]"
                        />
                        {l.title}
                        <span className="text-xs text-on-surface-variant">{l.minutes} د</span>
                      </label>
                    </li>
                  ),
                )}
              </ul>
            </div>
          );
        })}
      </fieldset>

      {redistribute ? null : (
        <div className="space-y-4">
          <p className="text-label text-primary">توزيع الدروس على الأسابيع</p>
          {weekKeys.map((key) => {
            const inWeek = selectable.filter((l) => included.has(l.id) && weekOf.get(l.id) === key);
            const info = titles.get(key);
            return (
              <fieldset key={key} className="space-y-3 rounded-md border border-outline-variant p-4">
                <legend className="px-2 text-label text-on-surface-variant">الأسبوع {key}</legend>
                <label className="block">
                  <span className="block text-sm text-on-surface">العنوان</span>
                  <input name={`title_${key}`} defaultValue={info?.title} maxLength={80} className="field" />
                </label>
                <label className="block">
                  <span className="block text-sm text-on-surface">لماذا هذه الدروس؟</span>
                  <textarea name={`focus_${key}`} defaultValue={info?.focus} rows={2} maxLength={300} className="field" />
                </label>
                {inWeek.length === 0 ? (
                  <p className="text-xs text-on-surface-variant">لا دروس في هذا الأسبوع، وسيُحذف عند الحفظ.</p>
                ) : (
                  <ul className="space-y-2">
                    {inWeek.map((l) => (
                      <li key={l.id} className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm text-on-surface">{l.title}</span>
                        <WeekSelect id={l.id} value={weekOf.get(l.id) ?? key} keys={weekKeys} onChange={(v) => setWeekOf((prev) => new Map(prev).set(l.id, v))} />
                      </li>
                    ))}
                  </ul>
                )}
              </fieldset>
            );
          })}
          {/* دروس تُنقل إلى أسبوع جديد */}
          {selectable.some((l) => included.has(l.id) && weekOf.get(l.id) === 'new') ? (
            <fieldset className="space-y-3 rounded-md border border-dashed border-outline-variant p-4">
              <legend className="px-2 text-label text-on-surface-variant">أسبوع جديد</legend>
              <input name="title_new" maxLength={80} className="field" placeholder="عنوان الأسبوع الجديد" />
              <textarea name="focus_new" rows={2} maxLength={300} className="field" placeholder="وصفه" />
              <ul className="space-y-2">
                {selectable
                  .filter((l) => included.has(l.id) && weekOf.get(l.id) === 'new')
                  .map((l) => (
                    <li key={l.id} className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm text-on-surface">{l.title}</span>
                      <WeekSelect id={l.id} value="new" keys={weekKeys} onChange={(v) => setWeekOf((prev) => new Map(prev).set(l.id, v))} />
                    </li>
                  ))}
              </ul>
            </fieldset>
          ) : null}
        </div>
      )}

      {/* قيم الأسابيع تُرسَل دائمًا حتى لو خُفي التوزيع: يُتجاهل عند التوزيع التلقائي */}
      {redistribute
        ? selectable.map((l) => <input key={l.id} type="hidden" name={`lesson_${l.id}`} value={weekOf.get(l.id) ?? lastWeek} />)
        : null}

      <button type="submit" className="btn-filled" disabled={included.size === 0}>
        احفظ التعديل
      </button>
      <p className="text-xs text-on-surface-variant">
        الأسبوع الذي يفرغ من دروسه يُحذف، والدرس الجديد الذي لم تحدد أسبوعه يُلحق بآخر أسبوع. «حدّث خطتي بحسب تقدمي» يعيد بناء الخطة من كل الدروس المتبقية ويمحو تعديلاتك.
      </p>
    </form>
  );
}

function WeekSelect({ id, value, keys, onChange }: { id: string; value: string; keys: string[]; onChange: (value: string) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs text-on-surface-variant">
      الأسبوع
      <select name={`lesson_${id}`} value={value} onChange={(e) => onChange(e.target.value)} className="field !w-auto !py-1">
        {keys.map((k) => (
          <option key={k} value={k}>
            {k}
          </option>
        ))}
        <option value="new">أسبوع جديد في النهاية</option>
      </select>
    </label>
  );
}
