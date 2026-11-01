/**
 * @file page.tsx
 * @description صفحة الدخول بالبريد: خطوتان، إدخال البريد ثم إدخال رمز من 6 أرقام. بلا كلمات مرور.
 */
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuth } from '../../composition/auth';
import { QalamMark } from '../../components/brand';
import { ResendCodeButton } from '../../components/resend-code-button';
import {
  requestSignInAction,
  resendCodeAction,
  resetSignInAction,
  verifyCodeAction,
} from '../auth/actions';
import { PENDING_EMAIL_COOKIE } from '../auth/pending-email';
import { safeRedirectPath } from '../auth/safe-redirect';

export const dynamic = 'force-dynamic';

const errors: Record<string, string> = {
  invalid: 'اكتب بريدًا إلكترونيًا صحيحًا، مثل name@example.com.',
  failed: 'تعذّر إرسال رمز الدخول. حاول مرة أخرى بعد قليل.',
  code: 'الرمز غير صحيح أو انتهت صلاحيته. تأكد من الأرقام الستة أو اطلب رمزًا جديدًا.',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; sent?: string; error?: string }>;
}) {
  const { next, sent, error } = await searchParams;
  const target = safeRedirectPath(next);
  const auth = await getAuth();

  if (await auth.getCurrentUser.execute()) redirect(target);

  const pendingEmail = (await cookies()).get(PENDING_EMAIL_COOKIE)?.value;
  const awaitingCode = Boolean(sent && pendingEmail);

  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <QalamMark size={56} />
      <h1 className="mt-5 font-display text-display text-on-surface">الدخول إلى قلم</h1>

      {awaitingCode ? (
        <div className="mt-6 space-y-4">
          <p role="status" className="rounded-lg border border-primary bg-surface-container-lowest p-5 text-on-surface">
            أرسلنا رمزًا من 6 أرقام إلى <bdi dir="ltr" className="font-medium">{pendingEmail}</bdi>. اكتبه هنا
            لتدخل. لم يصلك شيء؟ تفقّد مجلد الرسائل غير المرغوبة.
          </p>
          <form action={verifyCodeAction} className="space-y-4">
            <input type="hidden" name="next" value={target} />
            <div>
              <label htmlFor="code" className="block font-medium text-on-surface">
                رمز الدخول
              </label>
              <input
                id="code"
                name="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                autoFocus
                autoComplete="one-time-code"
                dir="ltr"
                className="field text-center font-mono text-2xl tracking-[0.5em]"
                aria-describedby={error ? 'code-error' : undefined}
              />
              {error ? (
                <p id="code-error" role="alert" className="mt-2 text-sm text-error">
                  {errors[error] ?? errors.code}
                </p>
              ) : null}
            </div>
            <button
              type="submit"
              className="btn-filled"
            >
              ادخل
            </button>
          </form>
          <ResendCodeButton action={resendCodeAction} next={target} />
          <form action={resetSignInAction}>
            <input type="hidden" name="next" value={target} />
            <button type="submit" className="text-sm text-on-surface-variant underline underline-offset-4">
              غيّر البريد
            </button>
          </form>
        </div>
      ) : (
        <form action={requestSignInAction} className="mt-6 space-y-4">
          <input type="hidden" name="next" value={target} />
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
              aria-describedby={error ? 'email-error' : undefined}
            />
            {error ? (
              <p id="email-error" role="alert" className="mt-2 text-sm text-error">
                {errors[error] ?? errors.failed}
              </p>
            ) : null}
          </div>
          <button
            type="submit"
            className="btn-filled"
          >
            أرسل رمز الدخول
          </button>
          <p className="text-sm text-on-surface-variant">
            {auth.mode === 'dev'
              ? 'وضع التطوير: يتم الدخول مباشرة دون بريد.'
              : 'لا كلمة مرور: نرسل لك رمزًا من 6 أرقام لتدخل به.'}
          </p>
        </form>
      )}
    </div>
  );
}
