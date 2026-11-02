'use client';

/**
 * @file navigation-progress.tsx
 * @description مؤشر انتقال بين الصفحات. loading.tsx لا يظهر عند الانتقال داخل نفس الهيكل (مثل دخول كورس من صفحة المسار
 * أو الرجوع للخلف)، فيبدو الموقع معلّقًا. هنا نرصد النقر على الروابط الداخلية والرجوع، فيظهر فورًا شريط علوي،
 * وبعد 600ms شارة «جارٍ التحميل…»، ويختفيان حين يتغير العنوان فعلًا.
 */
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { QalamLoader } from './brand';

const SLOW_AFTER_MS = 600;
/** أقصى مدة نُبقي فيها المؤشر لو لم يتغير العنوان (فشل الانتقال) */
const GIVE_UP_MS = 15000;

function Progress() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [active, setActive] = useState(false);
  const [slow, setSlow] = useState(false);
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  // اكتمل الانتقال: العنوان تغيّر
  useEffect(() => {
    clear();
    setActive(false);
    setSlow(false);
  }, [pathname, search]);

  useEffect(() => {
    const start = () => {
      clear();
      setActive(true);
      setSlow(false);
      timers.current = [setTimeout(() => setSlow(true), SLOW_AFTER_MS), setTimeout(() => { setActive(false); setSlow(false); }, GIVE_UP_MS)];
    };

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // نفس الصفحة أو قفزة داخلها: لا انتقال فعلي
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      start();
    };

    document.addEventListener('click', onClick, true);
    window.addEventListener('popstate', start);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('popstate', start);
      clear();
    };
  }, []);

  if (!active) return null;
  return (
    <>
      <div className="nav-progress" role="progressbar" aria-label="جارٍ التحميل" />
      {slow ? (
        <div className="nav-progress-pill">
          <QalamLoader scale={0.7} />
        </div>
      ) : null}
    </>
  );
}

export function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <Progress />
    </Suspense>
  );
}
