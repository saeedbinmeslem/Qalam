'use server';

/**
 * @file actions.ts
 * @description إجراءات الخادم للدخول والخروج: تحوّل الطلب إلى حالات الاستخدام فقط.
 */
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuth } from '../../composition/auth';
import { safeRedirectPath } from './safe-redirect';

async function siteOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export async function requestSignInAction(formData: FormData): Promise<void> {
  const email = String(formData.get('email') ?? '');
  const next = safeRedirectPath(String(formData.get('next') ?? ''));
  const auth = await getAuth();

  let signedIn: boolean;
  try {
    const redirectTo = `${await siteOrigin()}/auth/callback?next=${encodeURIComponent(next)}`;
    ({ signedIn } = await auth.requestSignIn.execute({ email, redirectTo }));
  } catch (error) {
    const invalid = error instanceof Error && error.message.includes('غير صالح');
    redirect(`/login?error=${invalid ? 'invalid' : 'failed'}&next=${encodeURIComponent(next)}`);
  }

  redirect(signedIn ? next : '/login?sent=1');
}

export async function signOutAction(): Promise<void> {
  const auth = await getAuth();
  await auth.signOut.execute();
  redirect('/');
}
