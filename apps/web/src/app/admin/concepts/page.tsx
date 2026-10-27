/**
 * @file page.tsx
 * @description إدارة المفاهيم ومتطلباتها السابقة (رسم المفاهيم الذي تبني عليه التوصيات لاحقًا).
 */
import { Card, ErrorBanner, Field, dangerButton, inputClass, primaryButton } from '../../../components/admin-ui';
import { ConfirmSubmit } from '../../../components/confirm-submit';
import { getAdminContainer } from '../../../composition/admin';
import { createConceptAction, deleteConceptAction, updateConceptAction } from '../actions';

const LEVELS = [
  { value: 1, label: 'مبتدئ' },
  { value: 2, label: 'متوسط' },
  { value: 3, label: 'متقدم' },
];

function LevelSelect({ value }: { value?: number }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-ink">المستوى</span>
      <select name="level" defaultValue={value ?? 1} className={inputClass}>
        {LEVELS.map((l) => (
          <option key={l.value} value={l.value}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Prerequisites({
  options,
  selected = [],
}: {
  options: Array<{ id: string; name: string }>;
  selected?: readonly string[];
}) {
  if (options.length === 0) return null;
  return (
    <fieldset className="md:col-span-2">
      <legend className="text-sm font-medium text-ink">المتطلبات السابقة</legend>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
        {options.map((o) => (
          <label key={o.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="prerequisiteIds" value={o.id} defaultChecked={selected.includes(o.id)} />
            {o.name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default async function AdminConcepts({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const admin = await getAdminContainer();
  const concepts = await admin.listConcepts.execute({ actor: admin.actor });
  const options = concepts.map((c) => ({ id: c.id as string, name: c.name }));

  return (
    <>
      <ErrorBanner message={error} />
      <h1 className="font-display text-2xl font-extrabold text-ink">المفاهيم</h1>
      <p className="mt-1 text-muted">
        المفهوم وحدة تعلّم ذرية يغطيها درس أو أكثر. المتطلبات السابقة تحدد ترتيب التعلّم، ولا يُسمح بدورات بينها.
      </p>

      <div className="mt-6 space-y-3">
        {concepts.map((concept) => (
          <details key={concept.id} className="rounded-lg border border-rule bg-sheet p-4">
            <summary className="cursor-pointer">
              <span className="font-medium text-ink">{concept.name}</span>
              <span className="ms-3 text-sm text-muted">
                {LEVELS.find((l) => l.value === concept.level)?.label ?? `المستوى ${concept.level}`}
                {concept.prerequisiteIds.length > 0 ? ` · يسبقه ${concept.prerequisiteIds.length}` : ''}
              </span>
            </summary>
            <form action={updateConceptAction} className="mt-4 grid gap-4 md:grid-cols-2">
              <input type="hidden" name="conceptId" value={concept.id} />
              <Field label="اسم المفهوم" name="name" defaultValue={concept.name} required />
              <LevelSelect value={concept.level} />
              <div className="md:col-span-2">
                <Field label="وصف" name="description" defaultValue={concept.description} />
              </div>
              <Prerequisites
                options={options.filter((o) => o.id !== concept.id)}
                selected={concept.prerequisiteIds}
              />
              <div>
                <button type="submit" className={primaryButton}>
                  حفظ المفهوم
                </button>
              </div>
            </form>
            <form action={deleteConceptAction} className="mt-4 border-t border-rule pt-4">
              <input type="hidden" name="conceptId" value={concept.id} />
              <ConfirmSubmit message={`حذف المفهوم «${concept.name}»؟`} className={dangerButton}>
                حذف المفهوم
              </ConfirmSubmit>
            </form>
          </details>
        ))}
      </div>

      <div className="mt-10">
        <Card title="مفهوم جديد">
          <form action={createConceptAction} className="grid gap-4 md:grid-cols-2">
            <Field label="اسم المفهوم" name="name" required />
            <LevelSelect />
            <div className="md:col-span-2">
              <Field label="وصف" name="description" />
            </div>
            <Prerequisites options={options} />
            <div>
              <button type="submit" className={primaryButton}>
                إضافة المفهوم
              </button>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}
