/**
 * @file page.tsx
 * @description صفحة الدخول: خطوتان، البريد وكلمة المرور ثم رمز من 6 أرقام يصل إلى البريد.
 */
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuth } from '../../composition/auth';
import { AuthCodeStep } from '../../components/auth-code-step';
import { QalamMark } from '../../components/brand';
import { requestSignInAction } from '../auth/actions';
import { PENDING_EMAIL_COOKIE } from '../auth/pending-email';
import { safeRedirectPath } from '../auth/safe-redirect';

export const dynamic = 'force-dynamic';

const errors: Record<string, string> = {
  invalid: 'اكتب بريدًا إلكترونيًا صحيحًا، مثل name@example.com.',
  credentials: 'البريد أو كلمة المرور غير صحيحة.',
  failed: 'تعذّر إرسال رمز الدخول. حاول مرة أخرى بعد قليل.',
  code: 'الرمز غير صحيح أو انتهت صلاحيته. تأكد من الأرقام الستة أو اطلب رمزًا جديدًا.',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; sent?: string; error?: string; reset?: string }>;
}) {
  const { next, sent, error, reset } = await searchParams;
  const target = safeRedirectPath(next);
  const auth = await getAuth();

  if (await auth.getCurrentUser.execute()) redirect(target);

  const pendingEmail = (await cookies()).get(PENDING_EMAIL_COOKIE)?.value;
  const awaitingCode = Boolean(sent && pendingEmail);
  const errorText = error ? (errors[error] ?? errors.failed) : undefined;

  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <QalamMark size={56} />
      <h1 className="mt-5 font-display text-display text-on-surface">الدخول إلى قلم</h1>

      {awaitingCode && pendingEmail ? (
        <AuthCodeStep flow="login" email={pendingEmail} next={target} error={errorText} />
      ) : (
        <form action={requestSignInAction} className="mt-6 space-y-4">
          <input type="hidden" name="next" value={target} />
          {reset ? (
            <p role="status" className="rounded-lg border border-primary bg-surface-container-lowest p-4 text-on-surface">
              غُيّرت كلمة المرور. سجّل الدخول بها الآن.
            </p>
          ) : null}
          <div>
            <label htmlFor="email" className="block font-medium text-on-surface">
              البريد الإلكتروني
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              dir="ltr"
              className="field"
              aria-describedby={error ? 'login-error' : undefined}
            />
          </div>
          <div>
            <label htmlFor="password" className="block font-medium text-on-surface">
              كلمة المرور
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              dir="ltr"
              className="field"
              aria-describedby={error ? 'login-error' : undefined}
            />
            {errorText ? (
              <p id="login-error" role="alert" className="mt-2 text-sm text-error">
                {errorText}
              </p>
            ) : null}
          </div>
          <button type="submit" className="btn-filled">
            {auth.mode === 'dev' ? 'ادخل' : 'تابع'}
          </button>
          <p className="text-sm text-on-surface-variant">
            {auth.mode === 'dev'
              ? 'وضع التطوير: يتم الدخول مباشرة دون كلمة مرور أو بريد.'
              : 'بعد التحقق من كلمة المرور نرسل لك رمزًا من 6 أرقام إلى بريدك لتكمل الدخول.'}
          </p>
          <p className="text-sm text-on-surface-variant">
            <Link
              href={`/forgot-password?next=${encodeURIComponent(target)}`}
              className="text-primary underline underline-offset-4"
            >
              نسيت كلمة المرور؟
            </Link>
          </p>
          <p className="text-sm text-on-surface-variant">
            ليس لديك حساب؟{' '}
            <Link
              href={`/signup?next=${encodeURIComponent(target)}`}
              className="text-primary underline underline-offset-4"
            >
              أنشئ حسابًا
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}
