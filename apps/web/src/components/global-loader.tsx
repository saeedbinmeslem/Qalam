'use client';

/**
 * @file global-loader.tsx
 * @description شاشة التحميل لكل عملية تعمل في الخلفية، لا للتنقل بين الصفحات فقط (ذاك تتكفل به loading.tsx):
 * تسجيل الدخول والخروج، تسليم الاختبارات، التلخيص، بناء الخطة، حفظ لوحة التحكم... كلها «إجراءات خادم».
 * نرصدها من طلب fetch الذي تُرسله Next (ترويسة Next-Action) فلا نعدّل كل نموذج على حدة.
 * - لا تظهر قبل 150ms كي لا تومض في العمليات السريعة.
 * - إذا ردّ الخادم بتوجيه (x-action-redirect) بقيت حتى يتغير العنوان فعلًا، فلا تُرى صفحة قديمة بعد النجاح.
 */
import { useEffect, useRef, useState } from 'react';
import { QalamLoader } from './brand';

const SHOW_DELAY_MS = 150;
const REDIRECT_WAIT_MS = 8000;
/** المدة بين إرسال نموذج inline وانطلاق طلب الإجراء الذي نتجاوزه */
const INLINE_SKIP_WINDOW_MS = 1500;

function isServerAction(input: RequestInfo | URL, init?: RequestInit): boolean {
  const headers = init?.headers ?? (typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined);
  if (!headers) return false;
  if (headers instanceof Headers) return headers.has('next-action');
  if (Array.isArray(headers)) return headers.some(([name]) => name.toLowerCase() === 'next-action');
  return Object.keys(headers).some((name) => name.toLowerCase() === 'next-action');
}

export function GlobalLoader() {
  const [visible, setVisible] = useState(false);
  const busy = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const begin = () => {
      busy.current += 1;
      if (!timer.current) timer.current = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    };
    const end = () => {
      busy.current = Math.max(0, busy.current - 1);
      if (busy.current === 0) {
        if (timer.current) clearTimeout(timer.current);
        timer.current = null;
        setVisible(false);
      }
    };
    /** يُبقي الشاشة حتى يتغير العنوان (التوجيه بعد النجاح) أو تنتهي المهلة */
    const holdUntilUrlChanges = (startHref: string) => {
      begin();
      const startedAt = Date.now();
      const poll = setInterval(() => {
        if (window.location.href !== startHref || Date.now() - startedAt > REDIRECT_WAIT_MS) {
          clearInterval(poll);
          end();
        }
      }, 100);
    };

    // نماذج تعرض مؤشرها بنفسها (data-inline-loader): نتجاوز شاشتنا الكاملة لأول إجراء بعد إرسالها
    let skipUntil = 0;
    const onSubmit = (event: Event) => {
      if (event.target instanceof HTMLFormElement && event.target.hasAttribute('data-inline-loader')) {
        skipUntil = Date.now() + INLINE_SKIP_WINDOW_MS;
      }
    };
    document.addEventListener('submit', onSubmit, true);

    const original = window.fetch;
    window.fetch = async (input, init) => {
      if (!isServerAction(input, init)) return original(input, init);
      if (Date.now() < skipUntil) {
        skipUntil = 0;
        return original(input, init);
      }
      const startHref = window.location.href;
      begin();
      try {
        const response = await original(input, init);
        if (response.headers.get('x-action-redirect')) holdUntilUrlChanges(startHref);
        return response;
      } finally {
        end();
      }
    };
    return () => {
      document.removeEventListener('submit', onSubmit, true);
      window.fetch = original;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-surface/80 backdrop-blur-sm" aria-busy="true">
      <QalamLoader label="القلم يعمل على طلبك…" />
    </div>
  );
}
