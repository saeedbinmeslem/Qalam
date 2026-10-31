'use client';

/**
 * @file inline-pending.tsx
 * @description مؤشر انتظار داخل النموذج نفسه (تحت الزر أو السؤال) بدل شاشة التحميل الكاملة، فلا يُمنع التصفح
 * أثناء العمليات الطويلة (التلخيص و«اسأل قلم»). يُوضَع داخل `<form data-inline-loader>`، والـ GlobalLoader يتجاوز
 * هذا النموذج. يقرأ حالة الإرسال بـuseFormStatus فلا يحتاج الأب ليكون عميلًا.
 */
import { useFormStatus } from 'react-dom';
import { QalamLoader } from './brand';

/** زر إرسال يتعطل أثناء الانتظار لمنع الإرسال المزدوج */
export function PendingButton({ children, className }: { children: React.ReactNode; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {children}
    </button>
  );
}

export function InlinePending({ label }: { label: string }) {
  const { pending } = useFormStatus();
  if (!pending) return null;
  return (
    <div className="mt-4">
      <QalamLoader scale={0.6} label={label} />
    </div>
  );
}
