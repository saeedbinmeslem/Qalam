/**
 * @file page.tsx
 * @description صفحة مفهوم: وصفه ومتطلباته السابقة وكورساته (كل كورس يفتح صفحته). بلا منطق عمل.
 */
import { createConceptId } from '@qalam/domain';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CoverArt, courseCoverUrl } from '../../../components/cover-art';
import { formatDuration, lessonsText, modulesText } from '../../../components/format';
import { PageHeader, pageWidth } from '../../../components/ui';
import { getContainer } from '../../../composition/container';

export const dynamic = 'force-dynamic';

const levelNames: Record<number, string> = { 1: 'مبتدئ', 2: 'متوسط', 3: 'متقدم' };

export default async function ConceptPage({ params }: { params: Promise<{ conceptId: string }> }) {
  const { conceptId } = await params;
  const { getConceptDetail } = await getContainer();
  const detail = await getConceptDetail.execute({ conceptId: createConceptId(conceptId) }).catch(() => null);
  if (!detail) notFound();
  const { concept, courses } = detail;

  return (
    <>
      <PageHeader
        eyebrow={`${levelNames[concept.level] ?? `المستوى ${concept.level}`} · ${concept.pathTitle}`}
        title={concept.name}
        {...(concept.description ? { description: concept.description } : {})}
        crumbs={[{ label: 'الرئيسية', href: '/' }, { label: 'خريطة المفاهيم', href: '/concepts' }, { label: concept.name }]}
      />

      <div className={`${pageWidth} space-y-8 pt-10`}>
        {concept.prerequisites.length > 0 ? (
          <section aria-label="المتطلبات السابقة" className="flex flex-wrap items-center gap-2">
            <span className="text-label text-on-surface-variant">يسبقه:</span>
            {concept.prerequisites.map((p) => (
              <Link key={p.id} href={`/concepts/${p.id}`} className="chip chip-primary hover:underline">
                {p.name}
              </Link>
            ))}
          </section>
        ) : null}

        <section aria-labelledby="courses-h">
          <h2 id="courses-h" className="font-display text-headline text-on-surface">
            الكورسات
          </h2>
          {courses.length === 0 ? (
            <p className="mt-3 text-on-surface-variant">لا كورسات في هذا المفهوم بعد.</p>
          ) : (
            <ul className="mt-5 space-y-4">
              {courses.map((course) => (
                <li key={course.id}>
                  <Link href={`/paths/${concept.pathId}/courses/${course.id}`} className="card-filled card-interactive flex overflow-hidden">
                    <CoverArt seed={concept.pathId} title={course.title} imageUrl={courseCoverUrl(course)} className="hidden w-48 shrink-0 sm:block" />
                    <div className="min-w-0 flex-1 p-6">
                      <h3 className="font-display text-xl font-semibold text-on-surface">{course.title}</h3>
                      <p className="mt-1 text-xs text-on-surface-variant">
                        {modulesText(course.modules.length)}، {lessonsText(course.lessonsCount)} · {formatDuration(course.totalDurationSeconds)}
                      </p>
                      {course.description ? <p className="mt-1 line-clamp-2 text-sm text-on-surface-variant">{course.description}</p> : null}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
