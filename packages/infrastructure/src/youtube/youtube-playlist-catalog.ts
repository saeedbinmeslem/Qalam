/**
 * @file youtube-playlist-catalog.ts
 * @description قراءة قائمة تشغيل عبر YouTube Data API v3 (مفتاح مجاني YOUTUBE_API_KEY):
 * playlistItems للترتيب والعناوين، وvideos للمدة والقناة. بيانات وصفية فقط (لا نسخ للفيديو).
 * الفيديوهات الخاصة والمحذوفة تُهمل لأن واجهة يوتيوب لا تعيد لها بيانات.
 */
import type { PlaylistCatalogPort, PlaylistVideo } from '@qalam/application';

const API = 'https://www.googleapis.com/youtube/v3';
/** حد أمان فقط (لا حد عملي): الكورس يُستورد كاملًا مهما طال، ويوتيوب يعيد 50 عنصرًا في الصفحة */
const MAX_ITEMS = 2000;

type Fetch = typeof fetch;

interface PlaylistItemsResponse {
  nextPageToken?: string;
  items?: { contentDetails?: { videoId?: string } }[];
}

interface VideosResponse {
  items?: {
    id: string;
    snippet?: { title?: string; channelTitle?: string; description?: string };
    contentDetails?: { duration?: string };
  }[];
}

/** «PT1H2M3S» ← ISO 8601 إلى ثوانٍ */
export function parseIsoDuration(iso: string): number {
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!m) return 0;
  const [, d, h, min, s] = m.map((x) => Number(x ?? 0));
  return (d ?? 0) * 86400 + (h ?? 0) * 3600 + (min ?? 0) * 60 + (s ?? 0);
}

export class YouTubePlaylistCatalog implements PlaylistCatalogPort {
  constructor(
    private readonly apiKey: string | undefined,
    private readonly fetchImpl: Fetch = fetch,
  ) {}

  async listVideos(playlistId: string): Promise<PlaylistVideo[]> {
    if (!this.apiKey) throw new Error('استيراد القوائم غير مفعّل: أضف YOUTUBE_API_KEY (مجاني من Google Cloud)');

    const ids: string[] = [];
    let pageToken = '';
    while (ids.length < MAX_ITEMS) {
      const page = await this.get<PlaylistItemsResponse>('playlistItems', {
        part: 'contentDetails',
        playlistId,
        maxResults: '50',
        pageToken,
      });
      for (const item of page.items ?? []) {
        const id = item.contentDetails?.videoId;
        if (id) ids.push(id);
      }
      if (!page.nextPageToken) break;
      pageToken = page.nextPageToken;
    }
    if (ids.length === 0) throw new Error('القائمة فارغة أو خاصة. اجعلها «غير مدرجة» أو عامة');

    const byId = new Map<string, PlaylistVideo>();
    for (let i = 0; i < ids.length; i += 50) {
      const data = await this.get<VideosResponse>('videos', {
        part: 'snippet,contentDetails',
        id: ids.slice(i, i + 50).join(','),
      });
      for (const v of data.items ?? []) {
        byId.set(v.id, {
          videoId: v.id,
          title: v.snippet?.title ?? '',
          channelName: v.snippet?.channelTitle ?? '',
          description: v.snippet?.description ?? '',
          durationSeconds: parseIsoDuration(v.contentDetails?.duration ?? ''),
        });
      }
    }
    // نحافظ على ترتيب القائمة ونُسقط المحذوف/الخاص (لا يعيده videos)
    return ids.flatMap((id) => byId.get(id) ?? []);
  }

  private async get<T>(resource: string, params: Record<string, string>): Promise<T> {
    const query = new URLSearchParams({ ...params, key: this.apiKey as string });
    if (!params.pageToken) query.delete('pageToken');
    const response = await this.fetchImpl(`${API}/${resource}?${query.toString()}`);
    if (response.status === 404) throw new Error('القائمة غير موجودة أو خاصة');
    if (response.status === 403) throw new Error('رفض يوتيوب الطلب: تحقق من YOUTUBE_API_KEY وتفعيل YouTube Data API أو من انتهاء الحصة اليومية');
    if (!response.ok) throw new Error(`تعذّر قراءة القائمة من يوتيوب (${response.status})`);
    return (await response.json()) as T;
  }
}
