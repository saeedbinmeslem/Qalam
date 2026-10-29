'use client';
/**
 * @file nav-links.tsx
 * @description روابط التنقل الرئيسي مع حالة «الصفحة الحالية» (aria-current)، وقائمة منسدلة للجوال.
 * مكوّن عميل لأن مسار الصفحة الحالي لا يعرفه الخادم داخل الهيكل المشترك.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface NavItem {
  href: string;
  label: string;
  /** وسم قصير بجانب العنوان (مثل «قريبًا») */
  badge?: string;
}

function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const links = items.map((item) => (
    <Link
      key={item.href}
      href={item.href}
      aria-current={isActive(pathname, item.href) ? 'page' : undefined}
      className="nav-item gap-2"
    >
      {item.label}
      {item.badge ? <span className="chip chip-warn !px-2 !py-0 !text-[0.65rem]">{item.badge}</span> : null}
    </Link>
  ));

  return (
    <>
      <nav aria-label="التنقل الرئيسي" className="hidden items-center gap-1 lg:flex">
        {links}
      </nav>
      {/* الجوال: قائمة بلا JavaScript إضافي عبر details */}
      <details className="group relative lg:hidden">
        <summary className="nav-item cursor-pointer list-none gap-2 border border-outline-variant" aria-label="القائمة">
          <span aria-hidden="true">☰</span> القائمة
        </summary>
        <nav
          aria-label="التنقل الرئيسي (جوال)"
          className="absolute end-0 top-12 z-40 flex w-60 flex-col gap-1 rounded-lg border border-outline-variant bg-surface-container-lowest p-2 shadow-[var(--shadow-elevation-2)]"
        >
          {links}
        </nav>
      </details>
    </>
  );
}
