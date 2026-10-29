/**
 * @file page.tsx
 * @description مكتبة الدروس: كل الدروس عبر المسارات مع بحث وتصفية بالمسار والقناة، ومصدر كل درس ظاهر دائمًا. بلا منطق عمل.
 */
import Link from 'next/link';
import { formatDuration } from '../../components/format';
import { EmptyState, PageHeader, pageWidth } from '../../components/ui';
import { getContainer } from '../../composition/container';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'مكتبة الدروس — قلم' };

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; path?: string; channel?: string }>;
}) {
  const { q = '', path = '', channel = '' } = await searchParams;
  const { searchLessonLibrary } = await getContainer();
  const library = await searchLessonLibrary.execute({
    ...(q.trim() ? { query: q } : {}),
    ...(path ? { pathId: path } : {}),
    ...(channel ? { channel } : {}),
  });

  const hasFilters = Boolean(q.trim() || path || channel);

  return (
    <>
      <PageHeader
        eyebrow="المكتبة"
        title="مكتبة الدروس"
        description="كل الدروس في مكان واحد. كل درس مقطع محدد من فيديو أصلي، واسم القناة ظاهر دائمًا."
        crumbs={[{ label: 'الرئيسية', href: '/' }, { label: 'مكتبة الدروس' }]}
      />

      <div className={`${pageWidth} grid gap-8 pt-8 lg:grid-cols-[16rem_1fr]`}>
        <form action="/library" role="search" className="card-filled h-fit space-y-5 p-5">
          <label className="block">
            <span className="text-label text-on-surface">بحث</span>
            <input name="q" defaultValue={q} placeholder="عنوان الدرس أو موضوعه" className="field" />
          </label>
          <label className="block">
            <span className="text-label text-on-surface">المسار</span>
            <select name="path" defaultValue={path} className="field">
              <option value="">كل المسارات</option>
              {library.paths.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-label text-on-surface">القناة</span>
            <select name="channel" defaultValue={channel} className="field">
              <option value="">كل القنوات</option>
              {library.channels.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <button type="submit" className="btn-filled flex-1">
              تطبيق
            </button>
            {hasFilters ? (
              <Link href="/library" className="btn-text">
                مسح
              </Link>
            ) : null}
          </div>
        </form>

        <section aria-label="نتائج المكتبة">
          <p className="text-sm text-on-surface-variant" role="status">
            {library.lessons.length} درسًا
          </p>
          {library.lessons.length === 0 ? (
            <div className="mt-4">
              <EmptyState title="لا دروس مطابقة" body="غيّر كلمة البحث أو أزل بعض عوامل التصفية." />
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {library.lessons.map((l) => (
                <li key={l.lessonId} className="card-outlined p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/paths/${l.pathId}/lessons/${l.lessonId}`}
                        className="font-display text-title text-on-surface hover:text-primary"
                      >
                        {l.title}
                      </Link>
                      {l.summary ? <p className="mt-1 line-clamp-2 text-on-surface-variant">{l.summary}</p> : null}
                      <p className="mt-3 text-sm text-on-surface-variant">
                        <Link href={`/paths/${l.pathId}`} className="hover:text-primary hover:underline">
                          {l.pathTitle}
                        </Link>{' '}
                        · {l.moduleTitle}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 text-sm">
                      <span className="font-medium text-on-surface">{formatDuration(l.durationSeconds)}</span>
                      {l.reviewedByHuman ? (
                        <span className="chip chip-primary">راجعه المالك</span>
                      ) : (
                        <span className="chip chip-warn">بانتظار المراجعة</span>
                      )}
                    </div>
                  </div>
                  <p className="mt-3 border-t border-outline-variant pt-3 text-sm text-on-surface-variant">
                    المصدر: <span className="font-medium text-on-surface">{l.channelName}</span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
