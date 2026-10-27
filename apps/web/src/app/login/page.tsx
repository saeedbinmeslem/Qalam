/**
 * @file page.tsx
 * @description صفحة الدخول بالبريد (رابط سحري). بلا كلمات مرور.
 */
import { redirect } from 'next/navigation';
import { getAuth } from '../../composition/auth';
import { requestSignInAction } from '../auth/actions';
import { safeRedirectPath } from '../auth/safe-redirect';

export const dynamic = 'force-dynamic';

const errors: Record<string, string> = {
  invalid: 'اكتب بريدًا إلكترونيًا صحيحًا، مثل name@example.com.',
  failed: 'تعذّر إرسال رابط الدخول. حاول مرة أخرى بعد قليل.',
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

  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <h1 className="font-display text-3xl font-extrabold text-ink">الدخول إلى قلم</h1>

      {sent ? (
        <p role="status" className="mt-6 rounded-lg border border-sea bg-sheet p-5 text-ink">
          أرسلنا رابط الدخول إلى بريدك. افتحه من هذا الجهاز لتكمل. لم يصلك شيء؟ تفقّد مجلد الرسائل
          غير المرغوبة، أو أعد المحاولة.
        </p>
      ) : (
        <form action={requestSignInAction} className="mt-6 space-y-4">
          <input type="hidden" name="next" value={target} />
          <div>
            <label htmlFor="email" className="block font-medium text-ink">
              البريد الإلكتروني
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              dir="ltr"
              className="mt-2 w-full rounded-lg border border-rule bg-sheet px-4 py-3 text-start"
              aria-describedby={error ? 'email-error' : undefined}
            />
            {error ? (
              <p id="email-error" role="alert" className="mt-2 text-sm text-red-700">
                {errors[error] ?? errors.failed}
              </p>
            ) : null}
          </div>
          <button
            type="submit"
            className="rounded-lg bg-ink px-6 py-3 font-medium text-white transition-colors hover:bg-ink-soft"
          >
            أرسل رابط الدخول
          </button>
          <p className="text-sm text-muted">
            {auth.mode === 'dev'
              ? 'وضع التطوير: يتم الدخول مباشرة دون بريد.'
              : 'لا كلمة مرور: نرسل لك رابطًا يفتح حسابك مباشرة.'}
          </p>
        </form>
      )}
    </div>
  );
}
