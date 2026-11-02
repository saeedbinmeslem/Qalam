'use client';
/**
 * @file nav-links.tsx
 * @description روابط التنقل الرئيسي مع حالة «الصفحة الحالية» (aria-current)، وقائمة جانبية منزلقة للجوال.
 * مكوّن عميل لأن مسار الصفحة الحالي وحالة فتح القائمة لا يعرفهما الخادم.
 * `children` يُمرَّر من الخادم (روابط الحساب ولوحة التحكم) ويظهر أسفل القائمة.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { QalamLogo } from './brand';

export interface NavItem {
  href: string;
  label: string;
  /** وسم قصير بجانب العنوان (مثل «قريبًا») */
  badge?: string;
}

function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLinks({ items, children }: { items: NavItem[]; children?: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // إغلاق القائمة عند الانتقال لصفحة أخرى
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Escape للإغلاق، ومنع تمرير الصفحة خلف القائمة
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <nav aria-label="التنقل الرئيسي" className="hidden items-center gap-1 lg:flex">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(pathname, item.href) ? 'page' : undefined}
            className="nav-item gap-2"
          >
            {item.label}
            {item.badge ? <span className="chip chip-warn !px-2 !py-0 !text-[0.65rem]">{item.badge}</span> : null}
          </Link>
        ))}
      </nav>

      <button
        type="button"
        className="menu-btn lg:hidden"
        aria-label={open ? 'إغلاق القائمة' : 'فتح القائمة'}
        aria-expanded={open}
        aria-controls="mobile-drawer"
        data-open={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="menu-btn-bar" />
        <span className="menu-btn-bar" />
        <span className="menu-btn-bar" />
      </button>

      <div className="drawer-root lg:hidden" data-open={open}>
        <div className="drawer-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />
        <aside
          id="mobile-drawer"
          className="drawer paper-dark"
          aria-label="القائمة"
          // inert يمنع التركيز على عناصر القائمة وهي مغلقة
          {...(open ? {} : { inert: true })}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('a')) setOpen(false);
          }}
        >
          <div className="drawer-head">
            <span className="drawer-brand">
              <QalamLogo size={32} />
            </span>
            <button type="button" className="drawer-close" aria-label="إغلاق القائمة" onClick={() => setOpen(false)}>
              <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <nav aria-label="التنقل الرئيسي (جوال)" className="drawer-links">
            {items.map((item, i) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(pathname, item.href) ? 'page' : undefined}
                className="drawer-item"
                style={{ '--i': i } as React.CSSProperties}
              >
                <span className="drawer-item-label">{item.label}</span>
                {item.badge ? <span className="drawer-badge">{item.badge}</span> : null}
              </Link>
            ))}
          </nav>

          {children ? (
            <div className="drawer-foot" style={{ '--i': items.length } as React.CSSProperties}>
              {children}
            </div>
          ) : null}
        </aside>
      </div>
    </>
  );
}
