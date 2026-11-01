/**
 * @file page.tsx
 * @description استعادة كلمة المرور: البريد، ثم رمز يصل إليه مع كلمة المرور الجديدة.
 */
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@qalam/domain';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuth } from '../../composition/auth';
import { QalamMark } from '../../components/brand';
import { ResendCodeButton } from '../../components/resend-code-button';
import {
  requestPasswordResetAction,
  resendCodeAction,
  resetPasswordAction,
  resetSignInAction,
} from '../auth/actions';
import { PENDING_EMAIL_COOKIE } from '../auth/pending-email';
import { safeRedirectPath } from '../auth/safe-redirect';

export const dynamic = 'force-dynamic';

const errors: Record<string, string> = {
  invalid: 'اكتب بريدًا إلكترونيًا صحيحًا، مثل name@example.com.',
  failed: 'تعذّر إرسال الرمز. حاول مرة أخرى بعد قليل.',
  weak: `كلمة المرور ضعيفة: اكتب ${PASSWORD_MIN_LENGTH} أحرف على الأقل، تشمل حرفًا ورقمًا.`,
  code: 'الرمز غير صحيح أو انتهت صلاحيته. تأكد من الأرقام الستة أو اطلب رمزًا جديدًا.',
};

export default async function ForgotPasswordPage({
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
  const errorText = error ? (errors[error] ?? errors.failed) : undefined;

  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <QalamMark size={56} />
      <h1 className="mt-5 font-display text-display text-on-surface">استعادة كلمة المرور</h1>

      {awaitingCode ? (
        <div className="mt-6 space-y-4">
          <p role="status" className="rounded-lg border border-primary bg-surface-container-lowest p-5 text-on-surface">
            إن كان <bdi dir="ltr" className="font-medium">{pendingEmail}</bdi> مسجَّلًا لدينا فقد أرسلنا إليه رمزًا من 6
            أرقام. اكتبه مع كلمة المرور الجديدة. لم يصلك شيء؟ تفقّد مجلد الرسائل غير المرغوبة.
          </p>
          <form action={resetPasswordAction} className="space-y-4">
            <input type="hidden" name="next" value={target} />
            <div>
              <label htmlFor="code" className="block font-medium text-on-surface">
                رمز التحقق
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
              />
            </div>
            <div>
              <label htmlFor="password" className="block font-medium text-on-surface">
                كلمة المرور الجديدة
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={PASSWORD_MIN_LENGTH}
                maxLength={PASSWORD_MAX_LENGTH}
                autoComplete="new-password"
                dir="ltr"
                className="field"
                aria-describedby={errorText ? 'reset-error' : 'password-hint'}
              />
              <span id="password-hint" className="field-hint">
                {PASSWORD_MIN_LENGTH} أحرف على الأقل، تشمل حرفًا ورقمًا.
              </span>
              {errorText ? (
                <p id="reset-error" role="alert" className="mt-2 text-sm text-error">
                  {errorText}
                </p>
              ) : null}
            </div>
            <button type="submit" className="btn-filled">
              غيّر كلمة المرور
            </button>
          </form>
          <ResendCodeButton action={resendCodeAction} next={target} flow="forgot" />
          <form action={resetSignInAction}>
            <input type="hidden" name="next" value={target} />
            <input type="hidden" name="flow" value="forgot" />
            <button type="submit" className="text-sm text-on-surface-variant underline underline-offset-4">
              رجوع وتغيير البريد
            </button>
          </form>
        </div>
      ) : (
        <form action={requestPasswordResetAction} className="mt-6 space-y-4">
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
              aria-describedby={errorText ? 'forgot-error' : undefined}
            />
            {errorText ? (
              <p id="forgot-error" role="alert" className="mt-2 text-sm text-error">
                {errorText}
              </p>
            ) : null}
          </div>
          <button type="submit" className="btn-filled">
            أرسل رمز الاستعادة
          </button>
          {auth.mode === 'dev' ? (
            <p className="text-sm text-on-surface-variant">وضع التطوير: لا كلمات مرور ولا بريد.</p>
          ) : null}
          <p className="text-sm text-on-surface-variant">
            تذكّرتها؟{' '}
            <Link
              href={`/login?next=${encodeURIComponent(target)}`}
              className="text-primary underline underline-offset-4"
            >
              سجّل الدخول
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}
