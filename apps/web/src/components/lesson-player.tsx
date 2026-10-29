/**
 * @file lesson-player.tsx
 * @description يختار المشغّل المناسب للدرس: فيديو Cloudinary المرفوع (HTML video) أو تضمين يوتيوب الرسمي.
 * عرض بحت بلا منطق عمل.
 */
import type { Lesson } from '@qalam/domain';
import { YouTubePlayer } from './youtube-player';

export function LessonPlayer({ lesson }: { lesson: Lesson }) {
  if (!lesson.mediaUrl) {
    return (
      <YouTubePlayer
        embedUrl={lesson.segment.toEmbedUrl()}
        title={lesson.title}
        channelName={lesson.channelName}
        sourceUrl={lesson.sourceUrl}
      />
    );
  }
  // #t=بداية,نهاية: مقطع زمني بمعيار Media Fragments، يعمل مع ملف Cloudinary مباشرة
  const src = `${lesson.mediaUrl}#t=${lesson.segment.startSeconds},${lesson.segment.endSeconds}`;
  return (
    <figure>
      <div className="aspect-video overflow-hidden rounded-lg bg-ink">
        <video src={src} controls preload="metadata" className="h-full w-full" aria-label={lesson.title} />
      </div>
      <figcaption className="mt-3 text-sm text-muted">
        المصدر: <span className="font-medium text-ink">{lesson.channelName}</span>
      </figcaption>
    </figure>
  );
}
