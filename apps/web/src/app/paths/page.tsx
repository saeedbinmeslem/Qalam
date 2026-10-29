/**
 * @file page.tsx
 * @description دليل المسارات: بحث وتصفية بالموضوع، وبطاقات المسارات مع تقدم المتعلم المسجَّل. بلا منطق عمل.
 */
import Link from 'next/link';
import { getAuth } from '../../composition/auth';
import { getContainer } from '../../composition/container';
import { EmptyState, PageHeader, PathCard, pageWidth } from '../../components/ui';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'المسارات — قلم' };

export default async function PathsPage({ searchParams }: { searchParams: Promise<{ q?: string; subject?: string }> }) {
  const { q = '', subject = '' } = await searchParams;
  const { listLearningPaths, getPathProgress } = await getContainer();
  const all = await listLearningPaths.execute();

  const subjects = [...new Set(all.map((p) => p.subject))];
  const needle = q.trim();
  const paths = all.filter(
    (p) => (!subject || p.subject === subject) && (!needle || `${p.title} ${p.description} ${p.subject}`.includes(needle)),
  );

  // تقدم المتعلم يظهر على البطاقة إن بدأ المسار
  const user = await (await getAuth()).getCurrentUser.execute();
  const percents = new Map<string, number>();
  if (user) {
    for (const p of paths) {
      const progress = await getPathProgress.execute({ userId: user.id, pathId: p.id }).catch(() => null);
      if (progress && progress.completedCount + progress.skippedCount > 0) percents.set(p.id, progress.percent);
    }
  }

  const chipHref = (value: string) => {
    const params = new URLSearchParams();
    if (needle) params.set('q', needle);
    if (value) params.set('subject', value);
    const qs = params.toString();
    return qs ? `/paths?${qs}` : '/paths';
  };

  return (
    <>
      <PageHeader
        eyebrow="المسارات"
        title="اختر مسار تعلّمك"
        description="كل مسار ترتيب كامل من الأساس إلى الهدف، دروسه مقاطع محددة من مصادر عربية موثوقة، وكل درس يُراجَع بشريًا."
        crumbs={[{ label: 'الرئيسية', href: '/' }, { label: 'المسارات' }]}
      />

      <div className={`${pageWidth} pt-8`}>
        <form action="/paths" role="search" className="flex flex-wrap items-center gap-3">
          <label className="sr-only" htmlFor="q">
            ابحث في المسارات
          </label>
          <input id="q" name="q" defaultValue={needle} placeholder="ابحث عن مسار أو موضوع…" className="field max-w-md !mt-0" />
          {subject ? <input type="hidden" name="subject" value={subject} /> : null}
          <button type="submit" className="btn-tonal">
            بحث
          </button>
        </form>

        {subjects.length > 1 ? (
          <div className="mt-5 flex flex-wrap gap-2" aria-label="تصفية بالموضوع">
            <Link href={chipHref('')} className={subject ? 'chip' : 'chip chip-primary'}>
              الكل
            </Link>
            {subjects.map((s) => (
              <Link key={s} href={chipHref(s)} className={subject === s ? 'chip chip-primary' : 'chip'}>
                {s}
              </Link>
            ))}
          </div>
        ) : null}

        <p className="mt-6 text-sm text-on-surface-variant" role="status">
          {paths.length} من {all.length} مسارات
        </p>

        <div className="mt-4">
          {paths.length === 0 ? (
            <EmptyState
              title="لا مسارات مطابقة"
              body="جرّب كلمة أخرى أو أزل التصفية. المسارات الجديدة تُضاف من إدارة المنصة."
              action={
                <Link href="/paths" className="btn-tonal">
                  إظهار كل المسارات
                </Link>
              }
            />
          ) : (
            <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {paths.map((p) => (
                <li key={p.id}>
                  <PathCard path={{ ...p, ...(percents.has(p.id) ? { percent: percents.get(p.id)! } : {}) }} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
