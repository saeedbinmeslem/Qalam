/**
 * @file page.tsx
 * @description لوحة التحكم: قائمة المسارات مع تقدم المراجعة، وإنشاء مسار جديد.
 */
import Link from 'next/link';
import { AdminPageHeader, Card, ErrorBanner, Field, primaryButton } from '../../components/admin-ui';
import { formatDuration, lessonsText, modulesText } from '../../components/format';
import { StatTile } from '../../components/ui';
import { getAdminContainer } from '../../composition/admin';
import { createPathAction } from './actions';

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { listPaths } = await getAdminContainer();
  const paths = await listPaths.execute();
  const totalLessons = paths.reduce((sum, p) => sum + p.lessonsCount, 0);
  const totalReviewed = paths.reduce((sum, p) => sum + p.reviewedLessonsCount, 0);

  return (
    <>
      <ErrorBanner message={error} />

      <AdminPageHeader title="المسارات" description="إدارة المسارات والدروس ومتابعة تقدّم المراجعة البشرية." />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatTile value={String(paths.length)} label="مسارًا" />
        <StatTile value={String(totalLessons)} label="درسًا" />
        <StatTile
          value={totalLessons > 0 ? `${Math.round((totalReviewed / totalLessons) * 100)}%` : '—'}
          label="نسبة المراجعة البشرية"
          hint={`${totalReviewed} من ${totalLessons} درسًا`}
        />
      </div>

      {paths.length === 0 ? (
        <p className="text-on-surface-variant">لا توجد مسارات بعد. أنشئ أول مسار من النموذج أدناه.</p>
      ) : (
        <div className="data-table" role="table" aria-label="المسارات">
          <div className="data-table-head hidden md:grid md:grid-cols-[1fr_auto_auto]" role="row">
            <span role="columnheader">المسار</span>
            <span role="columnheader">المحتوى</span>
            <span role="columnheader" className="w-32 text-end">
              المراجعة
            </span>
          </div>
          {paths.map((path) => {
            const done = path.lessonsCount > 0 && path.reviewedLessonsCount === path.lessonsCount;
            return (
              <div key={path.id} role="row" className="data-table-row md:grid-cols-[1fr_auto_auto]">
                <div role="cell">
                  <Link href={`/admin/paths/${path.id}`} className="text-title font-display text-on-surface hover:text-primary">
                    {path.title}
                  </Link>
                  <p className="text-caption text-on-surface-variant">{path.subject}</p>
                </div>
                <p role="cell" className="tabular text-sm text-on-surface-variant">
                  {modulesText(path.modulesCount)}، {lessonsText(path.lessonsCount)} · {formatDuration(path.totalDurationSeconds)}
                </p>
                <p role="cell" className="tabular w-32 md:text-end">
                  <span className={done ? 'chip chip-primary' : 'chip chip-warn'}>
                    {path.reviewedLessonsCount} / {path.lessonsCount}
                  </span>
                </p>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-10">
        <Card title="مسار جديد">
          <form action={createPathAction} className="grid gap-4 md:grid-cols-2">
            <Field label="عنوان المسار" name="title" required />
            <Field label="المجال" name="subject" required hint="مثل: أساسيات الحاسوب، التصميم، الإنجليزية" />
            <div className="md:col-span-2">
              <Field label="الهدف التعليمي" name="targetGoal" required hint="ماذا سيتمكن المتعلم منه بعد إنهاء المسار؟" />
            </div>
            <div className="md:col-span-2">
              <Field label="وصف المسار" name="description" rows={3} />
            </div>
            <div>
              <button type="submit" className={primaryButton}>
                إنشاء المسار
              </button>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}
