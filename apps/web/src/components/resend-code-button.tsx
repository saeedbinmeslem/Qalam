'use client';

/**
 * @file resend-code-button.tsx
 * @description زر «أعد إرسال الرمز» مع عدّاد تنازلي. يبدأ العدّ عند ظهور الصفحة،
 * فلا يضغط المتعلم قبل انتهاء الفاصل الذي يفرضه Supabase (smtp_max_frequency).
 */
import { useEffect, useState } from 'react';

/** يجب أن يساوي أو يزيد عن smtp_max_frequency في إعدادات Supabase */
const COOLDOWN_SECONDS = 30;

export function ResendCodeButton({
  action,
  next,
  flow,
}: {
  action: (formData: FormData) => Promise<void>;
  next: string;
  flow: 'login' | 'signup' | 'forgot';
}) {
  const [remaining, setRemaining] = useState(COOLDOWN_SECONDS);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setTimeout(() => setRemaining((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  return (
    <form action={action}>
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="flow" value={flow} />
      <button
        type="submit"
        disabled={remaining > 0}
        className="text-sm text-on-surface-variant underline underline-offset-4 disabled:cursor-not-allowed disabled:no-underline disabled:opacity-60"
      >
        {remaining > 0 ? `أعد إرسال الرمز بعد ${remaining} ثانية` : 'أعد إرسال الرمز'}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {remaining === 0 ? 'يمكنك الآن إعادة إرسال الرمز' : ''}
      </span>
    </form>
  );
}
