/**
 * @file cover-art.tsx
 * @description أغلفة «الورقة والحبر» المولَّدة (docs/design-system.md القسم 10): سطح مسطح بلون من أربعة أدوار،
 * الحرف الأول من العنوان بخط كبير مقصوص عند الحافة، وضربة حبر واحدة. SVG مضمّن بلا طلب شبكة.
 * اللون ثابت لكل معرّف (تجزئة)، والكورس يمرّر معرّف مساره ليرث لونه. بحت للعرض.
 */
import type { ReactNode } from 'react';

const NUM_TONES = 4;

/** يحدد نغمة الغلاف (0..3) من معرّف ثابت؛ الفئات `cover-N` معرّفة في globals.css */
export function coverTone(seed: string): number {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + (ch.codePointAt(0) ?? 0)) >>> 0;
  return hash % NUM_TONES;
}

/** الحرف الأول من العنوان بعد تجاوز «ال» التعريف والرموز، ويرجع «ق» إن لم يوجد حرف */
export function coverLetter(title: string): string {
  const letters = title.replace(/[^\p{L}]/gu, '');
  const bare = letters.startsWith('ال') && letters.length > 3 ? letters.slice(2) : letters;
  return [...bare][0] ?? 'ق';
}

/** ضربة الحبر: مسار متموّج بسمك ثابت مهما تغيّر قياس الغلاف */
const INK_CARD = 'M20 138 C 70 108 110 156 168 128 S 262 118 300 136';
const INK_BANNER = 'M0 296 C 200 268 360 318 560 290 S 900 280 1200 298';

const fontStyle = { fontFamily: 'var(--font-display)' } as const;

/**
 * يضيف تحويل Cloudinary (قصّ 16:9، صيغة وجودة تلقائيتان، عرض محدد) لرابط الصورة المرفوعة،
 * فلا يُحمَّل الأصل الكبير أبدًا. الروابط الأخرى تُرجَع كما هي.
 */
export function coverImageSrc(url: string, width: number): string {
  const marker = '/image/upload/';
  const at = url.indexOf(marker);
  if (at === -1) return url;
  const head = url.slice(0, at + marker.length);
  return `${head}f_auto,q_auto,c_fill,ar_16:9,w_${width}/${url.slice(head.length)}`;
}

interface CoverArtProps {
  /** معرّف يحدد اللون: معرّف المسار للمسار وكورساته */
  seed: string;
  title: string;
  className?: string;
  /** صورة الغلاف المرفوعة؛ إن غابت يظهر غلاف الحرف */
  imageUrl?: string | undefined;
}

/** غلاف بنسبة 16:9 للبطاقات: الصورة المرفوعة إن وُجدت، وإلا الحرف الأول بلون ثابت */
export function CoverArt({ seed, title, className = '', imageUrl }: CoverArtProps) {
  if (imageUrl) {
    return (
      <img
        src={coverImageSrc(imageUrl, 640)}
        alt=""
        width={640}
        height={360}
        loading="lazy"
        decoding="async"
        className={`${className} object-cover`}
      />
    );
  }
  return (
    <svg
      viewBox="0 0 320 180"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
      className={`cover-${coverTone(seed)} ${className}`}
    >
      <rect width="320" height="180" fill="var(--cover-bg)" />
      <text x="82" y="172" textAnchor="middle" fontSize="170" fontWeight="900" fill="var(--cover-fg)" opacity="0.16" style={fontStyle}>
        {coverLetter(title)}
      </text>
      <path d={INK_CARD} fill="none" stroke="var(--cover-ink)" strokeWidth="5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

const bannerWidth = 'mx-auto w-full max-w-6xl px-5 md:px-8';

/**
 * ترويسة بغلاف عريض لصفحتي المسار والكورس: لون مسطح، حرف كبير جهة النهاية، وضربة حبر كسطر كتابة في أسفلها.
 * نص المحتوى بلون `--cover-fg`؛ الأزرار وأشرطة التقدم تُوضع خارجها لأن لونها قد يطابق السطح.
 */
export function CoverBanner({
  seed,
  title,
  imageUrl,
  children,
}: {
  seed: string;
  title: string;
  imageUrl?: string | undefined;
  children: ReactNode;
}) {
  if (imageUrl) {
    // صورة مرفوعة: طبقة داكنة مسطحة فوقها تضمن تباين النص الأبيض، وضربة الحبر تبقى هوية
    return (
      <section className="cover-image relative overflow-hidden" style={{ background: 'var(--color-scrim)', color: 'var(--color-on-scrim)' }}>
        <img
          src={coverImageSrc(imageUrl, 1600)}
          alt=""
          width={1600}
          height={900}
          decoding="async"
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0" style={{ background: 'color-mix(in srgb, var(--color-scrim) 72%, transparent)' }} />
        <svg
          viewBox="0 0 1200 320"
          preserveAspectRatio="xMinYMax slice"
          aria-hidden="true"
          focusable="false"
          className="pointer-events-none absolute inset-0 h-full w-full"
        >
          <path d={INK_BANNER} fill="none" stroke="var(--color-secondary)" strokeWidth="5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className={`${bannerWidth} relative py-14 md:py-20`}>{children}</div>
      </section>
    );
  }
  return (
    <section
      className={`cover-${coverTone(seed)} relative overflow-hidden`}
      style={{ background: 'var(--cover-bg)', color: 'var(--cover-fg)' }}
    >
      <svg
        viewBox="0 0 1200 320"
        preserveAspectRatio="xMinYMax slice"
        aria-hidden="true"
        focusable="false"
        className="pointer-events-none absolute inset-0 h-full w-full"
      >
        <text x="170" y="330" textAnchor="middle" fontSize="440" fontWeight="900" fill="var(--cover-fg)" opacity="0.12" style={fontStyle}>
          {coverLetter(title)}
        </text>
        <path d={INK_BANNER} fill="none" stroke="var(--cover-ink)" strokeWidth="5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className={`${bannerWidth} relative py-14 md:py-20`}>{children}</div>
    </section>
  );
}

/** عنوان المصغّرة الرسمية من يوتيوب: mqdefault (320×180) للقوائم، hqdefault (480×360) للصفحة المفردة */
export function youtubeThumbnailSrc(videoId: string, size: 'list' | 'large' = 'list'): string {
  return `https://i.ytimg.com/vi/${videoId}/${size === 'large' ? 'hqdefault' : 'mqdefault'}.jpg`;
}

/**
 * غلاف الكورس: صورة أول درس فيه من يوتيوب (hqdefault للترويسة، mqdefault للبطاقات)؛ والصورة المرفوعة يدويًا
 * من لوحة التحكم تتقدّم عليها إن وُجدت. يرجع undefined إن لم يكن في الكورس درس من يوتيوب فيظهر غلاف الحرف.
 */
export function courseCoverUrl(
  course: { coverUrl?: string | undefined; modules: ReadonlyArray<{ lessons: ReadonlyArray<{ youtubeVideoId?: string | undefined }> }> },
  size: 'list' | 'large' = 'list',
): string | undefined {
  if (course.coverUrl) return course.coverUrl;
  const videoId = course.modules.flatMap((m) => m.lessons).find((l) => l.youtubeVideoId)?.youtubeVideoId;
  return videoId ? youtubeThumbnailSrc(videoId, size) : undefined;
}

/**
 * مصغّرة درس: صورة يوتيوب الرسمية إن كان الدرس منه (تُجلب من يوتيوب مباشرة ولا تُنسخ)، وإلا غلاف مولَّد بلون المسار.
 * العنوان مجاور لها دائمًا فالنص البديل فارغ. اسم القناة يُعرض بجوارها في الصفحات.
 */
export function LessonThumb({
  videoId,
  seed,
  title,
  className = '',
}: {
  videoId?: string | undefined;
  seed: string;
  title: string;
  className?: string;
}) {
  if (videoId) {
    return (
      <img
        src={youtubeThumbnailSrc(videoId)}
        alt=""
        width={320}
        height={180}
        loading="lazy"
        decoding="async"
        className={`${className} object-cover`}
      />
    );
  }
  return <CoverArt seed={seed} title={title} className={className} />;
}
