/**
 * @file brand.tsx
 * @description عناصر هوية «قلم» البصرية: العلامة (قلم قصب بسنّ مائل يترك خطًّا ذهبيًا)،
 * والشعار الكامل، ومؤشر التحميل المتحرك. تفاصيل الهوية في docs/BRAND.md.
 *
 * الفكرة: القلم يكتب من اليمين إلى اليسار كاتجاه العربية، والخط الذهبي الذي يتركه هو
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

/** العلامة وحدها: مربع بلون primary (كحلي) بقلم أبيض وخط بلون highlighter (ذهبي). */
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
        <polygon points={NIB_POINTS} fill="var(--color-on-primary)" strokeLinejoin="round" stroke="var(--color-on-primary)" strokeWidth="1.5" />
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
 * مؤشر التحميل: القلم يكتب سطرًا من اليمين إلى اليسار على مسار خافت، ثم تظهر النقطة العنبرية
 * ويتلاشى كل شيء ويعيد الكرّة. الحركة بـSMIL (أصلية في SVG) لا بـCSS: لا تتعطل بإعداد
 * «تقليل الحركة» في النظام، فهي ردّ فعل أساسي يُفهم منه أن الصفحة تعمل وليست معلّقة.
 * الدورة 2.4 ثانية؛ المقاطع الزمنية: كتابة 0–62%، نقطة 62–74%، ثبات حتى 88%، تلاشٍ حتى 100%.
 */
export function QalamLoader({ label = 'جارٍ التحميل…', scale = 1 }: { label?: string; scale?: number }) {
  const dur = '2.4s';
  const ease = '0.45 0 0.25 1';
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center gap-4">
      <svg width={120 * scale} height={64 * scale} viewBox="0 0 120 64" fill="none" aria-hidden="true" overflow="visible">
        {/* المسار الخافت: يوحي بالسطر الذي سيُكتب */}
        <path d={QALAM_TRACE_PATH} stroke="var(--color-outline-variant)" strokeWidth="5" strokeLinecap="round" opacity="0.45" strokeDasharray="1 9" pathLength="1" />
        <g>
          <animate attributeName="opacity" values="1;1;0" keyTimes="0;0.88;1" dur={dur} repeatCount="indefinite" />
          <path d={QALAM_TRACE_PATH} pathLength="1" stroke="var(--color-highlighter)" strokeWidth="5" strokeLinecap="round" strokeDasharray="1" strokeDashoffset="1">
            <animate attributeName="stroke-dashoffset" values="1;0;0" keyTimes="0;0.62;1" calcMode="spline" keySplines={`${ease};0 0 1 1`} dur={dur} repeatCount="indefinite" />
          </path>
          <circle cx="64" cy="14" fill="var(--color-primary)" r="0">
            <animate attributeName="r" values="0;0;5;4;4" keyTimes="0;0.6;0.68;0.74;1" dur={dur} repeatCount="indefinite" />
          </circle>
          <g>
            <animateMotion dur={dur} repeatCount="indefinite" path={QALAM_TRACE_PATH} keyPoints="0;1;1" keyTimes="0;0.62;1" calcMode="spline" keySplines={`${ease};0 0 1 1`} />
            <g transform="translate(0 -36)">
              <polygon points={NIB_POINTS} fill="var(--color-primary)" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M7.7 26.8 L1 35" stroke="var(--color-surface)" strokeWidth="1.6" strokeLinecap="round" />
              <circle cx="11.6" cy="22.2" r="1.9" fill="var(--color-surface)" />
            </g>
          </g>
        </g>
      </svg>
      <p className="text-label text-on-surface-variant">{label}</p>
    </div>
  );
}
