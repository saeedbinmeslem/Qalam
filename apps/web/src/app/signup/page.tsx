/**
 * @file page.tsx
 * @description صفحة إنشاء الحساب: البريد وكلمة المرور، ثم رمز تأكيد من 6 أرقام يصل إلى البريد.
 */
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@qalam/domain';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuth } from '../../composition/auth';
import { AuthCodeStep } from '../../components/auth-code-step';
import { QalamMark } from '../../components/brand';
import { signUpAction } from '../auth/actions';
import { PENDING_EMAIL_COOKIE } from '../auth/pending-email';
import { safeRedirectPath } from '../auth/safe-redirect';

export const dynamic = 'force-dynamic';

const errors: Record<string, string> = {
  invalid: 'اكتب بريدًا إلكترونيًا صحيحًا، مثل name@example.com.',
  weak: `كلمة المرور ضعيفة: اكتب ${PASSWORD_MIN_LENGTH} أحرف على الأقل، تشمل حرفًا ورقمًا.`,
  exists: 'هذا البريد مسجَّل مسبقًا. جرّب تسجيل الدخول.',
  failed: 'تعذّر إنشاء الحساب. حاول مرة أخرى بعد قليل.',
  code: 'الرمز غير صحيح أو انتهت صلاحيته. تأكد من الأرقام الستة أو اطلب رمزًا جديدًا.',
};

export default async function SignUpPage({
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
      <h1 className="mt-5 font-display text-display text-on-surface">إنشاء حساب في قلم</h1>

      {awaitingCode && pendingEmail ? (
        <AuthCodeStep flow="signup" email={pendingEmail} next={target} error={errorText} />
      ) : (
        <form action={signUpAction} className="mt-6 space-y-4">
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
              aria-describedby={error ? 'signup-error' : undefined}
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
              minLength={PASSWORD_MIN_LENGTH}
              maxLength={PASSWORD_MAX_LENGTH}
              autoComplete="new-password"
              dir="ltr"
              className="field"
              aria-describedby={error ? 'signup-error' : 'password-hint'}
            />
            <span id="password-hint" className="field-hint">
              {PASSWORD_MIN_LENGTH} أحرف على الأقل، تشمل حرفًا ورقمًا.
            </span>
            {errorText ? (
              <p id="signup-error" role="alert" className="mt-2 text-sm text-error">
                {errorText}
              </p>
            ) : null}
          </div>
          <button type="submit" className="btn-filled">
            أنشئ الحساب
          </button>
          <p className="text-sm text-on-surface-variant">
            {auth.mode === 'dev'
              ? 'وضع التطوير: يُنشأ الحساب ويتم الدخول مباشرة دون بريد.'
              : 'سنرسل رمزًا من 6 أرقام إلى بريدك لتأكيده قبل تفعيل الحساب.'}
          </p>
          <p className="text-sm text-on-surface-variant">
            لديك حساب؟{' '}
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
