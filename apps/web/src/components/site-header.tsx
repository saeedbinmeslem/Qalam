import Link from 'next/link';
import { signOutAction } from '../app/auth/actions';
import { isAdminUser } from '../composition/admin';
import { getAuth } from '../composition/auth';
import { QalamLogo } from './brand';
import { NavLinks, type NavItem } from './nav-links';
import { ThemeToggle } from './theme-toggle';

/** أقسام المنصة بالترتيب الذي يتعلم به المتعلم: اكتشف، ادرس، افهم، طبّق، تابع */
export const primaryNav: NavItem[] = [
  { href: '/paths', label: 'المسارات' },
  { href: '/library', label: 'مكتبة الدروس' },
  { href: '/concepts', label: 'خريطة المفاهيم' },
  { href: '/practice', label: 'التمارين', badge: 'قريبًا' },
  { href: '/plan', label: 'خطتي' },
  { href: '/dashboard', label: 'تعلّمي' },
];

export async function SiteHeader() {
  const auth = await getAuth();
  const user = await auth.getCurrentUser.execute();

  return (
    <header className="sticky top-0 z-30 border-b border-outline-variant bg-surface-container-lowest">
      <div className="relative mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-5 py-3 sm:gap-4 md:px-8">
        <div className="flex items-center gap-3 sm:gap-6">
          {/* الجوال: الشعار في منتصف الترويسة، وزر القائمة في البداية، وتبديل الوضع في النهاية */}
          <Link
            href="/"
            aria-label="قلم — الرئيسية"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 lg:static lg:translate-x-0 lg:translate-y-0"
          >
            <QalamLogo size={34} />
          </Link>
          <NavLinks items={primaryNav}>
            {/* حساب المتعلم وأدواته داخل قائمة الجوال (لوحة التحكم تظهر هنا للمدير) */}
            {user ? (
              <>
                <div className="drawer-user">
                  <span aria-hidden="true" className="drawer-avatar">
                    {user.email.charAt(0).toUpperCase()}
                  </span>
                  <span className="drawer-email" dir="ltr">
                    {user.email}
                  </span>
                </div>
                {isAdminUser(user) ? (
                  <Link href="/admin" className="drawer-action drawer-action-accent">
                    لوحة التحكم
                  </Link>
                ) : null}
                <Link href="/profile" className="drawer-action">
                  حسابي
                </Link>
                <form action={signOutAction}>
                  <button type="submit" className="drawer-action w-full">
                    تسجيل الخروج
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login" className="drawer-action drawer-action-accent">
                  دخول
                </Link>
                <Link href="/signup" className="drawer-action">
                  إنشاء حساب
                </Link>
              </>
            )}
          </NavLinks>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          {/* أدوات الحساب في الترويسة للشاشات الكبيرة فقط؛ في الجوال تعيش داخل القائمة */}
          <div className="hidden items-center gap-1 sm:gap-2 lg:flex">
          {user ? (
            <>
              {isAdminUser(user) ? (
                <Link href="/admin" className="btn-tonal btn-sm inline-flex">
                  لوحة التحكم
                </Link>
              ) : null}
              <Link href="/profile" className="btn-text btn-sm" aria-label="حسابي">
                <span
                  aria-hidden="true"
                  className="grid size-7 place-items-center rounded-full bg-primary-container text-sm font-bold text-on-primary-container"
                >
                  {user.email.charAt(0).toUpperCase()}
                </span>
                <span className="hidden sm:inline">حسابي</span>
              </Link>
              <form action={signOutAction}>
                <button type="submit" className="btn-text btn-sm hidden md:inline-flex">
                  خروج
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/signup" className="btn-text btn-sm hidden sm:inline-flex">
                إنشاء حساب
              </Link>
              <Link href="/login" className="btn-filled btn-sm">
                دخول
              </Link>
            </>
          )}
          </div>
        </div>
      </div>
    </header>
  );
}
