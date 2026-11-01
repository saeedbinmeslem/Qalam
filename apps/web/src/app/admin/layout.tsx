/**
 * @file layout.tsx
 * @description هيكل لوحة التحكم: يرفض غير المسجَّل (إلى الدخول) وغير المدير (صفحة منع)،
 * ويعرض تنبيهًا في وضع الذاكرة لأن التعديلات لا تُحفظ بعد إعادة تشغيل الخادم.
 */
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { AdminNav } from '../../components/admin-nav';
import { BackgroundJobs } from '../../components/background-jobs';
import { getAdminContainer } from '../../composition/admin';
import { isSupabaseConfigured } from '../../composition/auth';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await getAdminContainer();
  if (!admin.actor) redirect('/login?next=/admin');

  if (!admin.checkAdmin.execute({ actor: admin.actor })) {
    return (
      <div className="mx-auto max-w-xl px-5 py-20 text-center">
        <h1 className="font-display text-headline text-on-surface">هذه الصفحة لمديري المنصة</h1>
        <p className="mt-3 text-on-surface-variant">
          حسابك <span dir="ltr">{admin.actor.email}</span> ليس في قائمة المديرين (ADMIN_EMAILS).
        </p>
        <Link href="/" className="mt-6 inline-block text-primary underline underline-offset-2">
          العودة للرئيسية
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-8 md:px-8 lg:grid-cols-[14rem_1fr] lg:gap-10">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <p className="mb-3 hidden px-4 text-label text-on-surface-variant lg:block">لوحة التحكم</p>
        <AdminNav />
      </aside>
      <div className="min-w-0">
        {isSupabaseConfigured() ? null : (
          <p className="mb-6 rounded-md bg-tertiary-container p-3 text-sm text-on-tertiary-container">
            وضع التطوير: التعديلات تُحفظ في ذاكرة الخادم وتُفقد عند إعادة تشغيله. اربط Supabase لحفظها دائمًا.
          </p>
        )}
        <BackgroundJobs />
        {children}
      </div>
    </div>
  );
}
