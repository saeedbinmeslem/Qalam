/**
 * @file page.tsx
 * @description لوحة التحكم: قائمة المسارات مع تقدم المراجعة، وإنشاء مسار جديد.
 */
import Link from 'next/link';
import { Card, ErrorBanner, Field, primaryButton } from '../../components/admin-ui';
import { formatDuration, lessonsText, modulesText } from '../../components/format';
import { getAdminContainer } from '../../composition/admin';
import { createPathAction } from './actions';

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { listPaths } = await getAdminContainer();
  const paths = await listPaths.execute();

  return (
    <>
      <ErrorBanner message={error} />

      <h1 className="font-display text-2xl font-extrabold text-ink">المسارات</h1>
      {paths.length === 0 ? (
        <p className="mt-4 text-muted">لا توجد مسارات بعد. أنشئ أول مسار من النموذج أدناه.</p>
      ) : (
        <ul className="mt-5 divide-y divide-rule card-outlined">
          {paths.map((path) => (
            <li key={path.id} className="grid gap-2 p-4 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <Link href={`/admin/paths/${path.id}`} className="font-display text-lg font-semibold text-ink hover:underline">
                  {path.title}
                </Link>
                <p className="text-sm text-muted">
                  {path.subject} · {modulesText(path.modulesCount)}، {lessonsText(path.lessonsCount)} ·{' '}
                  {formatDuration(path.totalDurationSeconds)}
                </p>
              </div>
              <p
                className={`text-sm font-medium ${path.reviewedLessonsCount === path.lessonsCount && path.lessonsCount > 0 ? 'text-sea-dark' : 'text-ink'}`}
              >
                مراجَع {path.reviewedLessonsCount} من {path.lessonsCount}
              </p>
            </li>
          ))}
        </ul>
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
