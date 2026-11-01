/**
 * @file auth-code-step.tsx
 * @description خطوة «اكتب الرمز» المشتركة بين صفحتي الدخول وإنشاء الحساب.
 */
import {
  resendCodeAction,
  resetSignInAction,
  verifyCodeAction,
} from '../app/auth/actions';
import { ResendCodeButton } from './resend-code-button';

export function AuthCodeStep({
  flow,
  email,
  next,
  error,
}: {
  flow: 'login' | 'signup';
  email: string;
  next: string;
  error?: string;
}) {
  return (
    <div className="mt-6 space-y-4">
      <p role="status" className="rounded-lg border border-primary bg-surface-container-lowest p-5 text-on-surface">
        أرسلنا رمزًا من 6 أرقام إلى <bdi dir="ltr" className="font-medium">{email}</bdi>. اكتبه هنا
        {flow === 'signup' ? ' لتأكيد بريدك وتفعيل حسابك' : ' لتدخل'}. لم يصلك شيء؟ تفقّد مجلد الرسائل غير المرغوبة.
      </p>
      <form action={verifyCodeAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="flow" value={flow} />
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
            aria-describedby={error ? 'code-error' : undefined}
          />
          {error ? (
            <p id="code-error" role="alert" className="mt-2 text-sm text-error">
              {error}
            </p>
          ) : null}
        </div>
        <button type="submit" className="btn-filled">
          {flow === 'signup' ? 'فعّل الحساب' : 'ادخل'}
        </button>
      </form>
      <ResendCodeButton action={resendCodeAction} next={next} flow={flow} />
      <form action={resetSignInAction}>
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="flow" value={flow} />
        <button type="submit" className="text-sm text-on-surface-variant underline underline-offset-4">
          رجوع وتغيير البيانات
        </button>
      </form>
    </div>
  );
}
