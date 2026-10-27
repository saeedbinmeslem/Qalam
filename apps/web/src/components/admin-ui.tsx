/**
 * @file admin-ui.tsx
 * @description عناصر واجهة مشتركة للوحة التحكم (حقول، أزرار، رسائل). عرض بحت بلا منطق عمل.
 */
import type { ReactNode } from 'react';

export const inputClass =
  'mt-1.5 w-full rounded-lg border border-rule bg-sheet px-3 py-2 text-start focus:border-sea';
export const primaryButton =
  'rounded-lg bg-ink px-5 py-2 font-medium text-white transition-colors hover:bg-ink-soft';
export const ghostButton =
  'rounded-lg border border-rule bg-sheet px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-ink';
export const dangerButton =
  'rounded-lg border border-red-200 bg-sheet px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:border-red-600';

interface FieldProps {
  label: string;
  name: string;
  defaultValue?: string | number;
  required?: boolean;
  /** اتجاه الإدخال: ltr للروابط والتوقيتات */
  dir?: 'ltr' | 'rtl';
  hint?: string;
  rows?: number;
  placeholder?: string;
  type?: 'text' | 'number';
}

export function Field({ label, name, defaultValue, required, dir, hint, rows, placeholder, type = 'text' }: FieldProps) {
  // الوسم يلفّ الحقل (ربط ضمني) فلا تتعارض المعرّفات عند تكرار النموذج في الصفحة
  return (
    <label className="block">
      <span className="block text-sm font-medium text-ink">
        {label}
        {required ? <span className="text-red-700"> *</span> : null}
      </span>
      {rows ? (
        <textarea name={name} rows={rows} defaultValue={defaultValue} dir={dir} placeholder={placeholder} className={inputClass} />
      ) : (
        <input
          name={name}
          type={type}
          defaultValue={defaultValue}
          required={required}
          dir={dir}
          placeholder={placeholder}
          min={type === 'number' ? 1 : undefined}
          className={inputClass}
        />
      )}
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export function ErrorBanner({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
      {message}
    </p>
  );
}

export function Card({ title, children, actions }: { title?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="rounded-lg border border-rule bg-sheet p-5">
      {title || actions ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {title ? <h2 className="font-display text-lg font-semibold text-ink">{title}</h2> : <span />}
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function ReviewBadge({ reviewed }: { reviewed: boolean }) {
  return reviewed ? (
    <span className="rounded-full bg-sea/10 px-2.5 py-0.5 text-xs font-medium text-sea-dark">مراجَع</span>
  ) : (
    <span className="rounded-full bg-highlighter/25 px-2.5 py-0.5 text-xs font-medium text-ink">بانتظار المراجعة</span>
  );
}
