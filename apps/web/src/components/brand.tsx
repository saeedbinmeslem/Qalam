/**
 * @file brand.tsx
 * @description عناصر هوية «قلم» البصرية: العلامة (قلم قصب بسنّ مائل يترك خطًّا عنبريًا)،
 * والشعار الكامل، ومؤشر التحميل المتحرك. تفاصيل الهوية في docs/BRAND.md.
 *
 * الفكرة: القلم يكتب من اليمين إلى اليسار كاتجاه العربية، والخط العنبري الذي يتركه هو
 * «قلم التمييز» نفسه المستخدم في خط التقدم داخل المسارات (.stroke-list)، فتتّحد الهوية والواجهة.
 */

/** إحداثيات السنّ داخل صندوق 32×36، رأس السنّ في الزاوية السفلية اليسرى. */
const NIB_POINTS = '22.4,0 31.6,7.7 14.9,27.6 0,36 5.7,19.9';

/** مسار الكتابة المشترك بين الخط المرسوم وحركة القلم (انظر .qalam-nib في globals.css). */
export const QALAM_TRACE_PATH = 'M108 42 C96 14 84 58 66 34 S36 24 12 44';

interface MarkProps {
  size?: number;
  className?: string;
}

/** العلامة وحدها: مربع أخضر بقلم أبيض وخط عنبري. */
export function QalamMark({ size = 36, className }: MarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="شعار قلم"
      className={className}
    >
      <rect width="64" height="64" rx="18" fill="var(--color-primary)" />
      <path
        d="M54 45 C47 33 37 55 27 45 C23 41 19 45 15 49"
        fill="none"
        stroke="var(--color-highlighter)"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <g transform="translate(15 11)">
        <polygon points={NIB_POINTS} fill="#fff" strokeLinejoin="round" stroke="#fff" strokeWidth="1.5" />
        <path d="M7.7 26.8 L1 35" stroke="var(--color-primary)" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="11.6" cy="22.2" r="1.9" fill="var(--color-primary)" />
      </g>
    </svg>
  );
}

/** الشعار الكامل: العلامة + كلمة «قلم». */
export function QalamLogo({ size = 36, className }: MarkProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ''}`}>
      <QalamMark size={size} />
      <span className="font-display font-black leading-none text-primary" style={{ fontSize: size * 0.78 }}>
        قلم
      </span>
    </span>
  );
}

/**
 * مؤشر التحميل: القلم يكتب سطرًا من اليمين إلى اليسار ثم تظهر النقطة العنبرية، ويعيد الكرّة.
 * الحركة بـCSS خالص (لا JS) فيعمل داخل loading.tsx كمكوّن خادم.
 */
export function QalamLoader({ label = 'جارٍ التحميل…', scale = 1 }: { label?: string; scale?: number }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center gap-4">
      <div style={{ width: 120 * scale, height: 64 * scale }}>
        <div className="qalam-loader" style={{ transform: `scale(${scale})` }} aria-hidden="true">
          <svg width="120" height="64" viewBox="0 0 120 64" fill="none">
            <path
              d={QALAM_TRACE_PATH}
              pathLength="1"
              className="qalam-trace"
              stroke="var(--color-highlighter)"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <circle cx="64" cy="14" r="4" className="qalam-dot" fill="var(--color-primary)" />
          </svg>
          <svg width="32" height="36" viewBox="0 0 32 36" className="qalam-nib">
            <polygon points={NIB_POINTS} fill="var(--color-primary)" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M7.7 26.8 L1 35" stroke="var(--color-surface)" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx="11.6" cy="22.2" r="1.9" fill="var(--color-surface)" />
          </svg>
        </div>
      </div>
      <p className="text-label text-on-surface-variant">{label}</p>
    </div>
  );
}
