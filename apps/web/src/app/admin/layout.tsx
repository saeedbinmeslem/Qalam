/**
 * @file layout.tsx
 * @description هيكل لوحة التحكم: يرفض غير المسجَّل (إلى الدخول) وغير المدير (صفحة منع)،
 * ويعرض تنبيهًا في وضع الذاكرة لأن التعديلات لا تُحفظ بعد إعادة تشغيل الخادم.
 */
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
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
        <h1 className="font-display text-2xl font-extrabold text-ink">هذه الصفحة لمديري المنصة</h1>
        <p className="mt-3 text-muted">
          حسابك <span dir="ltr">{admin.actor.email}</span> ليس في قائمة المديرين (ADMIN_EMAILS).
        </p>
        <Link href="/" className="mt-6 inline-block text-sea underline underline-offset-2">
          العودة للرئيسية
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-outline-variant pb-4">
        <p className="font-display text-headline text-on-surface">لوحة التحكم</p>
        <nav aria-label="أقسام اللوحة" className="flex gap-2">
          <Link href="/admin" className="nav-item">
            المسارات
          </Link>
          <Link href="/admin/concepts" className="nav-item">
            المفاهيم
          </Link>
        </nav>
      </div>
      {isSupabaseConfigured() ? null : (
        <p className="mb-6 rounded-md bg-tertiary-container p-3 text-sm text-on-tertiary-container">
          وضع التطوير: التعديلات تُحفظ في ذاكرة الخادم وتُفقد عند إعادة تشغيله. اربط Supabase لحفظها دائمًا.
        </p>
      )}
      <BackgroundJobs />
      {children}
    </div>
  );
}
