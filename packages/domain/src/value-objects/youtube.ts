/**
 * @file youtube.ts
 * @description تحليل روابط يوتيوب والتوقيتات المكتوبة يدويًا من لوحة التحكم.
 * دوال نقية بلا I/O: تستخرج معرّف الفيديو من أي صيغة رابط شائعة، وتحوّل «ساعة:دقيقة:ثانية» إلى ثوانٍ.
 */

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com']);

/** يقبل المعرّف مباشرة أو روابط watch وyoutu.be وembed وshorts */
export function parseYouTubeVideoId(input: string): string {
  const text = input.trim();
  if (VIDEO_ID.test(text)) return text;

  let url: URL;
  try {
    url = new URL(text);
  } catch {
    throw new Error('رابط يوتيوب غير صالح');
  }

  let candidate: string | null = null;
  if (url.hostname === 'youtu.be') {
    candidate = url.pathname.split('/')[1] ?? null;
  } else if (YOUTUBE_HOSTS.has(url.hostname)) {
    const [, kind, id] = url.pathname.split('/');
    candidate = kind === 'embed' || kind === 'shorts' ? (id ?? null) : url.searchParams.get('v');
  }

  if (!candidate || !VIDEO_ID.test(candidate)) {
    throw new Error('رابط يوتيوب غير صالح');
  }
  return candidate;
}

/** الرابط الأصلي القياسي للفيديو (يُعرض مع اسم القناة دائمًا) */
export function toWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/** يقبل «83» أو «1:23» أو «01:02:03» ويعيد الثواني */
export function parseTimecode(input: string): number {
  const parts = input.trim().split(':');
  if (parts.length < 1 || parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) {
    throw new Error(`توقيت غير صالح: «${input}». استخدم صيغة مثل 83 أو 1:23 أو 1:02:03`);
  }
  return parts.reduce((total, part) => total * 60 + Number(part), 0);
}

/** عكس parseTimecode لعرض الثواني في الحقول */
export function formatTimecode(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const two = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${m}:${two(s)}`;
}
