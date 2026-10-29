'use server';

/**
 * @file actions.ts
 * @description إجراءات الخادم للدخول والخروج: تحوّل الطلب إلى حالات الاستخدام فقط.
 * البريد المنتظر رمزه يُحفظ في ملف ارتباط قصير العمر (لا في الرابط، فلا يظهر في السجلات والتاريخ).
 */
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuth } from '../../composition/auth';
import { safeRedirectPath } from './safe-redirect';

import { PENDING_EMAIL_COOKIE } from './pending-email';

const PENDING_EMAIL_TTL_SECONDS = 10 * 60;

export async function requestSignInAction(formData: FormData): Promise<void> {
  const email = String(formData.get('email') ?? '');
  const next = safeRedirectPath(String(formData.get('next') ?? ''));
  const auth = await getAuth();

  let signedIn: boolean;
  try {
    ({ signedIn } = await auth.requestSignIn.execute({ email }));
  } catch (error) {
    const invalid = error instanceof Error && error.message.includes('غير صالح');
    redirect(`/login?error=${invalid ? 'invalid' : 'failed'}&next=${encodeURIComponent(next)}`);
  }

  if (signedIn) redirect(next);

  (await cookies()).set(PENDING_EMAIL_COOKIE, email.trim().toLowerCase(), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: PENDING_EMAIL_TTL_SECONDS,
  });
  redirect(`/login?sent=1&next=${encodeURIComponent(next)}`);
}

/** «أعد إرسال الرمز»: يعيد الطلب للبريد المحفوظ في ملف الارتباط دون أن يكتبه المتعلم ثانية */
export async function resendCodeAction(formData: FormData): Promise<void> {
  const next = safeRedirectPath(String(formData.get('next') ?? ''));
  const store = await cookies();
  const email = store.get(PENDING_EMAIL_COOKIE)?.value;
  if (!email) redirect(`/login?next=${encodeURIComponent(next)}`);

  const auth = await getAuth();
  try {
    await auth.requestSignIn.execute({ email });
  } catch {
    redirect(`/login?sent=1&error=failed&next=${encodeURIComponent(next)}`);
  }

  // نجدّد مدة صلاحية البريد المنتظر مع الرمز الجديد
  store.set(PENDING_EMAIL_COOKIE, email, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: PENDING_EMAIL_TTL_SECONDS,
  });
  redirect(`/login?sent=1&next=${encodeURIComponent(next)}`);
}

export async function verifyCodeAction(formData: FormData): Promise<void> {
  const code = String(formData.get('code') ?? '');
  const next = safeRedirectPath(String(formData.get('next') ?? ''));
  const store = await cookies();
  const email = store.get(PENDING_EMAIL_COOKIE)?.value;
  // انتهت صلاحية الخطوة الأولى: نعود لطلب رمز جديد
  if (!email) redirect(`/login?next=${encodeURIComponent(next)}`);

  const auth = await getAuth();
  try {
    await auth.verifySignInCode.execute({ email, code });
  } catch {
    redirect(`/login?sent=1&error=code&next=${encodeURIComponent(next)}`);
  }

  store.delete(PENDING_EMAIL_COOKIE);
  redirect(next);
}

/** «غيّر البريد»: ينسى البريد المنتظر ويعود لخطوة إدخال البريد */
export async function resetSignInAction(formData: FormData): Promise<void> {
  const next = safeRedirectPath(String(formData.get('next') ?? ''));
  (await cookies()).delete(PENDING_EMAIL_COOKIE);
  redirect(`/login?next=${encodeURIComponent(next)}`);
}

export async function signOutAction(): Promise<void> {
  const auth = await getAuth();
  await auth.signOut.execute();
  redirect('/');
}
