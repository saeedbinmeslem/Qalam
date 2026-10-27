import Link from 'next/link';
import { signOutAction } from '../app/auth/actions';
import { isAdminUser } from '../composition/admin';
import { getAuth } from '../composition/auth';

export async function SiteHeader() {
  const auth = await getAuth();
  const user = await auth.getCurrentUser.execute();

  return (
    <header className="border-b border-rule bg-sheet">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <Link href="/" className="font-display text-2xl font-extrabold text-ink">
          قلم
        </Link>
        <nav aria-label="التنقل الرئيسي" className="flex items-center gap-2">
          <Link
            href="/#paths"
            className="rounded-full px-4 py-2 text-sm font-medium text-ink hover:bg-paper"
          >
            المسارات
          </Link>
          {isAdminUser(user) ? (
            <Link
              href="/admin"
              className="rounded-full px-4 py-2 text-sm font-medium text-ink hover:bg-paper"
            >
              لوحة التحكم
            </Link>
          ) : null}
          {user ? (
            <form action={signOutAction} className="flex items-center gap-2">
              <span dir="ltr" className="hidden text-sm text-muted sm:inline">
                {user.email}
              </span>
              <button
                type="submit"
                className="rounded-full px-4 py-2 text-sm font-medium text-ink hover:bg-paper"
              >
                خروج
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink-soft"
            >
              دخول
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
