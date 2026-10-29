'use client';
/**
 * @file theme-toggle.tsx
 * @description اختيار مظهر الموقع: فاتح / داكن / مثل الجهاز (الأصل).
 * "مثل الجهاز" يزيل السمة data-theme فيتولى prefers-color-scheme في globals.css الأمر؛
 * الاختيار اليدوي يُحفظ في localStorage (يبقى بعد إغلاق المتصفح) ويُطبَّق قبل الرسم عبر THEME_INIT_SCRIPT (انظر layout.tsx).
 */
import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

export const THEME_STORAGE_KEY = 'qalam-theme';

/** سكربت يعمل قبل أول رسم كي لا يومض الموقع بالمظهر الخاطئ. */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}`;

const OPTIONS: { value: Theme; label: string; icon: string }[] = [
  { value: 'light', label: 'الوضع الفاتح', icon: 'M12 4V2m0 20v-2m8-8h2M2 12h2m13.66-5.66 1.41-1.41M4.93 19.07l1.41-1.41m0-11.32L4.93 4.93m14.14 14.14-1.41-1.41M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z' },
  { value: 'system', label: 'مثل الجهاز', icon: 'M4 5h16v11H4zM9 20h6M12 16v4' },
  { value: 'dark', label: 'الوضع الداكن', icon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z' },
];

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
  try {
    if (theme === 'system') localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // التخزين قد يكون محجوبًا (وضع التصفح الخاص)؛ يبقى الاختيار لهذه الجلسة فقط.
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system');

  // نقرأ الحالة بعد التحميل (لا أثناء الرسم الأول) كي يتطابق HTML الخادم مع العميل.
  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme');
    setTheme(current === 'light' || current === 'dark' ? current : 'system');
  }, []);

  function choose(next: Theme) {
    setTheme(next);
    applyTheme(next);
  }

  return (
    <div role="radiogroup" aria-label="مظهر الموقع" className="inline-flex rounded-full border border-outline-variant p-0.5">
      {OPTIONS.map((o) => {
        const active = theme === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={o.label}
            title={o.label}
            onClick={() => choose(o.value)}
            className={`grid size-8 cursor-pointer place-items-center rounded-full transition-colors ${
              active
                ? 'bg-secondary-container text-on-secondary-container'
                : 'text-on-surface-variant hover:bg-on-surface/10'
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={o.icon} />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
