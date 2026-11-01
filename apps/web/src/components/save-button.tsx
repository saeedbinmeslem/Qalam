'use client';

/**
 * @file save-button.tsx
 * @description زر «حفظ» لنماذج التعديل: لا يظهر إلا بعد أن يتغير شيء في النموذج عمّا كان عليه عند التحميل،
 * ويختفي إن أُعيدت القيم كما كانت أو بعد انتهاء الحفظ. يوضَع داخل النموذج مكان زر الإرسال العادي.
 * يقارن لقطة من قيم النموذج (FormData نصوصًا فقط) بلقطة الأصل، ويستمع لـinput/change وتغيّر `value` في الحقول المخفية
 * (حقل الغلاف ورابط الفيديو المرفوع يتغيران من حالة React بلا أحداث). نماذج الإنشاء تُبقي زرها الدائم.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';

/** حدث يرسله حقل حُفظت قيمته على الخادم بنفسه (الغلاف بعد الرفع الخلفي) فتصير هي الأصل لا تعديلًا */
export const REBASE_EVENT = 'qalam:rebase';

type Snapshot = Map<string, string>;

function snapshot(form: HTMLFormElement): Snapshot {
  const values: Snapshot = new Map();
  for (const [name, value] of new FormData(form)) {
    if (typeof value !== 'string') continue;
    values.set(name, values.has(name) ? `${values.get(name)}\u0000${value}` : value);
  }
  return values;
}

function same(a: Snapshot, b: Snapshot): boolean {
  return a.size === b.size && [...a].every(([name, value]) => b.get(name) === value);
}

export function SaveButton({ children, className }: { children: React.ReactNode; className: string }) {
  const { pending } = useFormStatus();
  const anchor = useRef<HTMLSpanElement>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const baseline = useRef<Snapshot>(new Map());
  const [dirty, setDirty] = useState(false);
  const wasPending = useRef(false);

  const recompute = useCallback(() => {
    if (formRef.current) setDirty(!same(baseline.current, snapshot(formRef.current)));
  }, []);

  useEffect(() => {
    const form = anchor.current?.closest('form') ?? null;
    if (!form) return;
    formRef.current = form;
    baseline.current = snapshot(form);

    const onRebase = (event: Event) => {
      const { name, value } = (event as CustomEvent<{ name: string; value: string }>).detail;
      baseline.current.set(name, value);
      recompute();
    };
    const observer = new MutationObserver(recompute);
    observer.observe(form, { subtree: true, attributes: true, attributeFilter: ['value'] });
    form.addEventListener('input', recompute);
    form.addEventListener('change', recompute);
    form.addEventListener(REBASE_EVENT, onRebase);
    return () => {
      observer.disconnect();
      form.removeEventListener('input', recompute);
      form.removeEventListener('change', recompute);
      form.removeEventListener(REBASE_EVENT, onRebase);
    };
  }, [recompute]);

  // انتهى الإرسال: ما في النموذج الآن هو المحفوظ، فيصير الأصل ويختفي الزر
  useEffect(() => {
    if (wasPending.current && !pending && formRef.current) {
      baseline.current = snapshot(formRef.current);
      setDirty(false);
    }
    wasPending.current = pending;
  }, [pending]);

  return (
    <>
      <span ref={anchor} hidden />
      {dirty || pending ? (
        <button type="submit" className={className} disabled={pending}>
          {children}
        </button>
      ) : null}
    </>
  );
}
