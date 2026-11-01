'use client';
/**
 * @file admin-nav.tsx
 * @description تنقل لوحة التحكم: شريط جانبي على الشاشات العريضة وشريط أفقي على الصغيرة،
 * مع aria-current للقسم الحالي. مكوّن عميل لأن المسار الحالي لا يعرفه الخادم داخل الهيكل.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/admin', label: 'المسارات', match: (p: string) => p === '/admin' || p.startsWith('/admin/paths') },
  { href: '/admin/concepts', label: 'المفاهيم', match: (p: string) => p.startsWith('/admin/concepts') },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="أقسام اللوحة" className="admin-nav">
      {items.map((item) => (
        <Link key={item.href} href={item.href} className="admin-nav-item" aria-current={item.match(pathname) ? 'page' : undefined}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
