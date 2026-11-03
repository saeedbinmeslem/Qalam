/**
 * @file page.tsx
 * @description حسابي: بيانات الحساب وإحصاءات موجزة وتسجيل الخروج، وروابط الإدارة للمديرين. بلا منطق عمل.
 */
import Link from 'next/link';
import { isAdminUser } from '../../composition/admin';
import { getAuth } from '../../composition/auth';
import { getContainer } from '../../composition/container';
import { SignOutDialog } from '../../components/sign-out-dialog';
import { EmptyState, PageHeader, StatTile, pageWidth } from '../../components/ui';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'حسابي — قلم' };

export default async function ProfilePage() {
  const user = await (await getAuth()).getCurrentUser.execute();
  if (!user) {
    return (
      <div className={`${pageWidth} py-20`}>
        <EmptyState
          title="لم تسجّل الدخول"
          body="سجّل الدخول لترى حسابك وتقدمك."
          action={
            <Link href="/login?next=/profile" className="btn-filled">
              تسجيل الدخول
            </Link>
          }
        />
      </div>
    );
  }

  const { getLearnerDashboard } = await getContainer();
  const { totals } = await getLearnerDashboard.execute({ userId: user.id });

  return (
    <>
      <PageHeader
        eyebrow="حسابي"
        title="حسابي"
        crumbs={[{ label: 'الرئيسية', href: '/' }, { label: 'حسابي' }]}
      />
      <div className={`${pageWidth} space-y-10 pt-10`}>
        <section className="card-outlined flex flex-wrap items-center justify-between gap-6 p-6">
          <div className="flex items-center gap-4">
            <span
              aria-hidden="true"
              className="grid size-14 place-items-center rounded-full bg-primary-container font-display text-2xl font-bold text-on-primary-container"
            >
              {user.email.charAt(0).toUpperCase()}
            </span>
            <div>
              <p className="text-label text-on-surface-variant">البريد الإلكتروني</p>
              <p dir="ltr" className="text-start font-medium text-on-surface">
                {user.email}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {isAdminUser(user) ? (
              <Link href="/admin" className="btn-tonal">
                لوحة التحكم
              </Link>
            ) : null}
            <SignOutDialog className="btn-outlined">تسجيل الخروج</SignOutDialog>
          </div>
        </section>

        <section aria-label="إحصاءاتك" className="grid gap-4 sm:grid-cols-3">
          <StatTile value={String(totals.pathsStarted)} label="مسارات بدأتها" />
          <StatTile value={String(totals.lessonsCompleted)} label="دروس أكملتها" />
          <StatTile value={totals.quizAveragePercent === null ? '—' : `${totals.quizAveragePercent}%`} label="متوسط الاختبارات" />
        </section>

        <Link href="/profile/plans" className="card-outlined card-interactive flex items-center justify-between gap-4 p-5">
          <span>
            <span className="block font-display text-title text-on-surface">سجل خططي</span>
            <span className="block text-sm text-on-surface-variant">كل خطة أنشأتها أو عدّلتها محفوظة هنا.</span>
          </span>
          <span aria-hidden="true" className="text-primary">←</span>
        </Link>

        <p className="text-sm text-on-surface-variant">
          نخزّن بريدك وأحداث تعلّمك فقط. التفاصيل في{' '}
          <Link href="/about#privacy" className="text-primary underline underline-offset-2">
            الخصوصية
          </Link>
          .
        </p>
      </div>
    </>
  );
}
