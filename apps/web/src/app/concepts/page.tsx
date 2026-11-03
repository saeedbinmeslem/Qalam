/**
 * @file page.tsx
 * @description خريطة المفاهيم: المستويات (مبتدئ، متوسط، متقدم) صفوف متتالية على خط رأسي، ومفاهيم كل مستوى شبكة تحتها؛ كل مفهوم بطاقة مضغوطة
 * تفتح صفحته لعرض كورساته. لا دروس هنا حتى لا تزدحم الخريطة. بلا منطق عمل.
 */
import Link from 'next/link';
import { EmptyState, PageHeader, pageWidth } from '../../components/ui';
import { getContainer } from '../../composition/container';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'خريطة المفاهيم — قلم' };

const levelNames: Record<number, string> = { 1: 'مبتدئ', 2: 'متوسط', 3: 'متقدم' };
// الأعمدة الثلاثة تظهر دائمًا ليبقى مكان كل مستوى ثابتًا، وأي مستوى أعلى يُضاف بعدها
const BASE_LEVELS = [1, 2, 3];

export default async function ConceptsPage() {
  const { getConceptMap } = await getContainer();
  const map = await getConceptMap.execute();
  const byLevel = new Map(map.levels.map((g) => [g.level, g.concepts]));
  const levels = [...new Set([...BASE_LEVELS, ...map.levels.map((g) => g.level)])].sort((a, b) => a - b);

  return (
    <>
      <PageHeader
        eyebrow="المفاهيم"
        title="خريطة المفاهيم"
        description="كل مفهوم في مكان مستواه. اختر مفهومًا لترى كورساته ومتطلباته السابقة."
        crumbs={[{ label: 'الرئيسية', href: '/' }, { label: 'خريطة المفاهيم' }]}
      />

      <div className={`${pageWidth} pt-10`}>
        {map.total === 0 ? (
          <EmptyState title="لا مفاهيم بعد" body="تُضاف المفاهيم من لوحة إدارة المنصة وتُربط بالدروس." />
        ) : (
          <ol className="relative space-y-8 before:absolute before:inset-y-6 before:start-[1.125rem] before:w-px before:bg-outline-variant">
            {levels.map((level) => {
              const concepts = byLevel.get(level) ?? [];
              return (
                <li key={level} className="relative">
                  <section aria-labelledby={`level-${level}`} className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="relative z-10 grid size-9 place-items-center rounded-full bg-primary font-display font-bold text-on-primary">{level}</span>
                      <h2 id={`level-${level}`} className="font-display text-title text-on-surface">
                        {levelNames[level] ?? `المستوى ${level}`}
                      </h2>
                      <span className="chip">{concepts.length} مفاهيم</span>
                    </div>
                    <div className="ms-12">
                      {concepts.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-outline-variant p-4 text-sm text-on-surface-variant">لا مفاهيم في هذا المستوى بعد.</p>
                      ) : (
                        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {concepts.map((c) => (
                            <li key={c.id}>
                              <Link href={`/concepts/${c.id}`} className="card-outlined card-interactive flex h-full flex-col p-4">
                                <h3 className="font-display text-lg font-semibold text-on-surface">{c.name}</h3>
                                {c.description ? <p className="mt-1 line-clamp-2 text-sm text-on-surface-variant">{c.description}</p> : null}
                                <p className="mt-auto pt-3 text-xs text-on-surface-variant">
                                  {c.courseCount === 0 ? 'لا كورسات بعد' : `${c.courseCount} كورس · ${c.lessonCount} درس`}
                                  {c.prerequisites.length > 0 ? ` · يسبقه ${c.prerequisites.length}` : ''}
                                </p>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </section>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </>
  );
}
