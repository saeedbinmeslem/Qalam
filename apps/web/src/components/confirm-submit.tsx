'use client';

/**
 * @file confirm-submit.tsx
 * @description زر إرسال يطلب تأكيدًا قبل الإجراءات المدمّرة (حذف). الحماية الفعلية في الخادم.
 */
import type { ReactNode } from 'react';

export function ConfirmSubmit({
  message,
  className,
  children,
}: {
  message: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
