/**
 * @file admin-ui.tsx
 * @description عناصر واجهة مشتركة للوحة التحكم (حقول، أزرار، رسائل). عرض بحت بلا منطق عمل.
 */
import type { ReactNode } from 'react';

export const inputClass = 'field';
export const primaryButton = 'btn-filled';
export const ghostButton = 'btn-outlined btn-sm';
export const dangerButton = 'btn-danger btn-sm';

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
      <span className="block text-label text-on-surface">
        {label}
        {required ? <span className="text-error"> *</span> : null}
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
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}

export function ErrorBanner({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mb-6 rounded-md bg-error-container p-4 text-on-error-container">
      {message}
    </p>
  );
}

export function Card({ title, children, actions }: { title?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="card-outlined p-5">
      {title || actions ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {title ? <h2 className="font-display text-title text-on-surface">{title}</h2> : <span />}
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function ReviewBadge({ reviewed }: { reviewed: boolean }) {
  return reviewed ? (
    <span className="chip chip-primary">مراجَع</span>
  ) : (
    <span className="chip chip-warn">بانتظار المراجعة</span>
  );
}
