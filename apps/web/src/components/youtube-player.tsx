/**
 * @file youtube-player.tsx
 * @description مشغّل يوتيوب المضمّن للمقطع المحدد فقط (start/end). لا نسخ ولا إعادة استضافة:
 * الفيديو يُعرض عبر المشغّل الرسمي، مع اسم القناة ورابط المصدر ظاهرين دائمًا.
 */
interface YouTubePlayerProps {
  /** رابط التضمين الجاهز من Domain (VideoSegment.toEmbedUrl) */
  embedUrl: string;
  title: string;
  channelName: string;
  sourceUrl: string;
}

export function YouTubePlayer({ embedUrl, title, channelName, sourceUrl }: YouTubePlayerProps) {
  return (
    <figure>
      <div className="aspect-video overflow-hidden rounded-xl bg-black">
        <iframe
          src={embedUrl}
          title={title}
          className="h-full w-full"
          loading="lazy"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
      <figcaption className="mt-3 text-sm text-on-surface-variant">
        القناة: <span className="font-medium text-on-surface">{channelName}</span> ·{' '}
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 hover:text-secondary-strong"
        >
          شاهد الفيديو الأصلي على يوتيوب
        </a>
      </figcaption>
    </figure>
  );
}
