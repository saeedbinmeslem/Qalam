import Link from 'next/link';
import { QalamLogo } from './brand';

const columns = [
  {
    title: 'تعلّم',
    links: [
      { href: '/paths', label: 'المسارات' },
      { href: '/library', label: 'مكتبة الدروس' },
      { href: '/concepts', label: 'خريطة المفاهيم' },
      { href: '/practice', label: 'التمارين العملية' },
    ],
  },
  {
    title: 'حسابك',
    links: [
      { href: '/dashboard', label: 'تعلّمي' },
      { href: '/review', label: 'المراجعة' },
      { href: '/profile', label: 'حسابي' },
      { href: '/login', label: 'تسجيل الدخول' },
    ],
  },
  {
    title: 'عن قلم',
    links: [
      { href: '/about', label: 'كيف يعمل قلم' },
      { href: '/about#sources', label: 'المصادر والحقوق' },
      { href: '/about#privacy', label: 'الخصوصية' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-outline-variant bg-surface-container-low">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-12 md:grid-cols-[1.4fr_repeat(3,1fr)] md:px-8">
        <div>
          <QalamLogo size={40} />
          <p className="mt-3 max-w-xs text-sm text-on-surface-variant">
            منصة تعليمية عربية تنظّم الدروس المجانية في مسارات، وتقيس فهمك فعليًا، وتعدّل خطتك بحسب أدائك.
          </p>
        </div>
        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <p className="text-label text-on-surface">{col.title}</p>
            <ul className="mt-3 space-y-2 text-sm">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-on-surface-variant hover:text-primary hover:underline">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-outline-variant">
        <p className="mx-auto w-full max-w-6xl px-5 py-5 text-xs text-on-surface-variant md:px-8">
          الفيديوهات تُعرض عبر مشغّل يوتيوب الرسمي، وحقوقها لأصحاب القنوات المذكورين عند كل درس.
        </p>
      </div>
    </footer>
  );
}
