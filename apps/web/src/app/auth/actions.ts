'use server';

/**
 * @file actions.ts
 * @description إجراءات الخادم لإنشاء الحساب والدخول والخروج: تحوّل الطلب إلى حالات الاستخدام فقط.
 * الدخول خطوتان: البريد وكلمة المرور، ثم رمز البريد. البريد المنتظر رمزه يُحفظ في ملف ارتباط قصير العمر
 * (لا في الرابط، فلا يظهر في السجلات والتاريخ)، وكلمة المرور لا تُحفظ في أي مكان بعد الخطوة الأولى.
 */
import { EmailAlreadyRegisteredError, InvalidCredentialsError, type CodePurpose } from '@qalam/application';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuth } from '../../composition/auth';
import { safeRedirectPath } from './safe-redirect';

import { PENDING_EMAIL_COOKIE } from './pending-email';

const PENDING_EMAIL_TTL_SECONDS = 10 * 60;

/** المسارين اللذين يمرّان بخطوة الرمز: صفحة الدخول وصفحة إنشاء الحساب */
type Flow = 'login' | 'signup' | 'forgot';

function flowOf(formData: FormData): Flow {
  const flow = formData.get('flow');
  return flow === 'signup' || flow === 'forgot' ? flow : 'login';
}

function pageUrl(flow: Flow, params: Record<string, string>): string {
  const query = new URLSearchParams(params).toString();
  const path = { login: 'login', signup: 'signup', forgot: 'forgot-password' }[flow];
  return `/${path}?${query}`;
}

async function rememberPendingEmail(email: string): Promise<void> {
  (await cookies()).set(PENDING_EMAIL_COOKIE, email.trim().toLowerCase(), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: PENDING_EMAIL_TTL_SECONDS,
  });
}

/** يحوّل استثناء الخطوة الأولى إلى رمز خطأ تعرضه الصفحة */
function errorCodeOf(error: unknown): string {
  if (error instanceof InvalidCredentialsError) return 'credentials';
  if (error instanceof EmailAlreadyRegisteredError) return 'exists';
  const message = error instanceof Error ? error.message : '';
  if (message.includes('البريد الإلكتروني غير صالح')) return 'invalid';
  if (message.includes('كلمة المرور غير صالحة')) return 'weak';
  return 'failed';
}

export async function signUpAction(formData: FormData): Promise<void> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const next = safeRedirectPath(String(formData.get('next') ?? ''));
  const auth = await getAuth();

  let signedIn: boolean;
  try {
    ({ signedIn } = await auth.signUp.execute({ email, password }));
  } catch (error) {
    redirect(pageUrl('signup', { error: errorCodeOf(error), next }));
  }

  if (signedIn) redirect(next);

  await rememberPendingEmail(email);
  redirect(pageUrl('signup', { sent: '1', next }));
}

export async function requestSignInAction(formData: FormData): Promise<void> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const next = safeRedirectPath(String(formData.get('next') ?? ''));
  const auth = await getAuth();

  let signedIn: boolean;
  try {
    ({ signedIn } = await auth.requestSignIn.execute({ email, password }));
  } catch (error) {
    redirect(pageUrl('login', { error: errorCodeOf(error), next }));
  }

  if (signedIn) redirect(next);

  await rememberPendingEmail(email);
  redirect(pageUrl('login', { sent: '1', next }));
}

export async function requestPasswordResetAction(formData: FormData): Promise<void> {
  const email = String(formData.get('email') ?? '');
  const next = safeRedirectPath(String(formData.get('next') ?? ''));
  const auth = await getAuth();

  try {
    await auth.requestPasswordReset.execute({ email });
  } catch (error) {
    redirect(pageUrl('forgot', { error: errorCodeOf(error), next }));
  }

  await rememberPendingEmail(email);
  redirect(pageUrl('forgot', { sent: '1', next }));
}

/** رمز الاستعادة وكلمة المرور الجديدة معًا؛ عند النجاح يعود المتعلم للدخول الكامل */
export async function resetPasswordAction(formData: FormData): Promise<void> {
  const code = String(formData.get('code') ?? '');
  const newPassword = String(formData.get('password') ?? '');
  const next = safeRedirectPath(String(formData.get('next') ?? ''));
  const store = await cookies();
  const email = store.get(PENDING_EMAIL_COOKIE)?.value;
  if (!email) redirect(pageUrl('forgot', { next }));

  const auth = await getAuth();
  try {
    await auth.resetPassword.execute({ email, code, newPassword });
  } catch (error) {
    const weak = error instanceof Error && error.message.includes('كلمة المرور غير صالحة');
    redirect(pageUrl('forgot', { sent: '1', error: weak ? 'weak' : 'code', next }));
  }

  store.delete(PENDING_EMAIL_COOKIE);
  redirect(pageUrl('login', { reset: '1', next }));
}

/** «أعد إرسال الرمز»: يعيد الطلب للبريد المحفوظ في ملف الارتباط دون أن يكتبه المتعلم ثانية */
export async function resendCodeAction(formData: FormData): Promise<void> {
  const flow = flowOf(formData);
  const next = safeRedirectPath(String(formData.get('next') ?? ''));
  const store = await cookies();
  const email = store.get(PENDING_EMAIL_COOKIE)?.value;
  if (!email) redirect(pageUrl(flow, { next }));

  const auth = await getAuth();
  try {
    const purposes: Record<Flow, CodePurpose> = { login: 'signin', signup: 'signup', forgot: 'recovery' };
    const purpose = purposes[flow];
    await auth.resendCode.execute({ email, purpose });
  } catch {
    redirect(pageUrl(flow, { sent: '1', error: 'failed', next }));
  }

  // نجدّد مدة صلاحية البريد المنتظر مع الرمز الجديد
  await rememberPendingEmail(email);
  redirect(pageUrl(flow, { sent: '1', next }));
}

export async function verifyCodeAction(formData: FormData): Promise<void> {
  const flow = flowOf(formData);
  const code = String(formData.get('code') ?? '');
  const next = safeRedirectPath(String(formData.get('next') ?? ''));
  const store = await cookies();
  const email = store.get(PENDING_EMAIL_COOKIE)?.value;
  // انتهت صلاحية الخطوة الأولى: نعود لطلب رمز جديد
  if (!email) redirect(pageUrl(flow, { next }));

  const auth = await getAuth();
  try {
    const verify = flow === 'signup' ? auth.verifySignUpCode : auth.verifySignInCode;
    await verify.execute({ email, code });
  } catch {
    redirect(pageUrl(flow, { sent: '1', error: 'code', next }));
  }

  store.delete(PENDING_EMAIL_COOKIE);
  redirect(next);
}

/** «غيّر البريد»: ينسى البريد المنتظر ويعود لخطوة إدخال البريد */
export async function resetSignInAction(formData: FormData): Promise<void> {
  const flow = flowOf(formData);
  const next = safeRedirectPath(String(formData.get('next') ?? ''));
  (await cookies()).delete(PENDING_EMAIL_COOKIE);
  redirect(pageUrl(flow, { next }));
}

export async function signOutAction(): Promise<void> {
  const auth = await getAuth();
  await auth.signOut.execute();
  redirect('/');
}
