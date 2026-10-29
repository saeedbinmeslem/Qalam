/**
 * @file page.tsx
 * @description خريطة المفاهيم: المفاهيم مجمّعة بمستواها مع متطلباتها السابقة والدروس التي تشرحها. بلا منطق عمل.
 */
import Link from 'next/link';
import { EmptyState, PageHeader, pageWidth } from '../../components/ui';
import { getContainer } from '../../composition/container';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'خريطة المفاهيم — قلم' };

const levelNames: Record<number, string> = { 1: 'مبتدئ', 2: 'متوسط', 3: 'متقدم' };

export default async function ConceptsPage() {
  const { getConceptMap } = await getContainer();
  const map = await getConceptMap.execute();

  return (
    <>
      <PageHeader
        eyebrow="المفاهيم"
        title="خريطة المفاهيم"
        description="كل مفهوم له متطلبات سابقة. الخريطة تُريك ما يجب أن تعرفه أولًا وأين تتعلم كل مفهوم، وعليها يبني الوكيل خطتك."
        crumbs={[{ label: 'الرئيسية', href: '/' }, { label: 'خريطة المفاهيم' }]}
      />

      <div className={`${pageWidth} space-y-12 pt-10`}>
        {map.total === 0 ? (
          <EmptyState title="لا مفاهيم بعد" body="تُضاف المفاهيم من لوحة إدارة المنصة وتُربط بالدروس." />
        ) : (
          map.levels.map((group) => (
            <section key={group.level} aria-labelledby={`level-${group.level}`}>
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-primary font-display font-bold text-on-primary">
                  {group.level}
                </span>
                <h2 id={`level-${group.level}`} className="font-display text-headline text-on-surface">
                  {levelNames[group.level] ?? `المستوى ${group.level}`}
                </h2>
                <span className="chip">{group.concepts.length} مفهومًا</span>
              </div>
              <ul className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {group.concepts.map((c) => (
                  <li key={c.id} className="card-outlined flex flex-col p-5">
                    <h3 className="font-display text-title text-on-surface">{c.name}</h3>
                    {c.description ? <p className="mt-1 text-on-surface-variant">{c.description}</p> : null}

                    {c.prerequisites.length > 0 ? (
                      <div className="mt-4">
                        <p className="text-label text-on-surface-variant">يسبقه</p>
                        <ul className="mt-2 flex flex-wrap gap-2">
                          {c.prerequisites.map((p) => (
                            <li key={p.id} className="chip chip-warn">
                              {p.name}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-on-surface-variant">لا متطلبات سابقة، يمكن البدء به مباشرة.</p>
                    )}

                    <div className="mt-4 border-t border-outline-variant pt-3">
                      <p className="text-label text-on-surface-variant">تتعلمه في</p>
                      {c.lessons.length === 0 ? (
                        <p className="mt-1 text-sm text-on-surface-variant">لا درس مرتبط به بعد.</p>
                      ) : (
                        <ul className="mt-1 space-y-1 text-sm">
                          {c.lessons.map((l) => (
                            <li key={l.id}>
                              <Link href={`/paths/${l.pathId}/lessons/${l.id}`} className="text-primary hover:underline">
                                {l.title}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </>
  );
}
