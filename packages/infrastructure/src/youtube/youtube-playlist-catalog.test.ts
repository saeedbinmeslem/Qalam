import { describe, expect, it } from 'vitest';
import { YouTubePlaylistCatalog, parseIsoDuration } from './youtube-playlist-catalog.js';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe('parseIsoDuration', () => {
  it('يحوّل صيغة ISO 8601 إلى ثوانٍ', () => {
    expect(parseIsoDuration('PT1H2M3S')).toBe(3723);
    expect(parseIsoDuration('PT45S')).toBe(45);
    expect(parseIsoDuration('PT10M')).toBe(600);
    expect(parseIsoDuration('P0D')).toBe(0);
    expect(parseIsoDuration('')).toBe(0);
  });
});

describe('YouTubePlaylistCatalog', () => {
  it('يقرأ الصفحات ويحافظ على الترتيب ويُسقط المحذوف', async () => {
    const urls: string[] = [];
    const fetchImpl = (async (input: string) => {
      urls.push(input);
      if (input.includes('/playlistItems') && !input.includes('pageToken')) {
        return json({ nextPageToken: 'P2', items: [{ contentDetails: { videoId: 'aaaaaaaaaaa' } }, { contentDetails: { videoId: 'gone0000000' } }] });
      }
      if (input.includes('/playlistItems')) return json({ items: [{ contentDetails: { videoId: 'bbbbbbbbbbb' } }] });
      return json({
        items: [
          { id: 'bbbbbbbbbbb', snippet: { title: 'ب', channelTitle: 'ق' }, contentDetails: { duration: 'PT2M' } },
          { id: 'aaaaaaaaaaa', snippet: { title: 'أ', channelTitle: 'ق', description: 'د' }, contentDetails: { duration: 'PT1M' } },
        ],
      });
    }) as unknown as typeof fetch;

    const videos = await new YouTubePlaylistCatalog('KEY', fetchImpl).listVideos('PL1');
    expect(videos.map((v) => [v.videoId, v.title, v.durationSeconds])).toEqual([
      ['aaaaaaaaaaa', 'أ', 60],
      ['bbbbbbbbbbb', 'ب', 120],
    ]);
    expect(urls.every((u) => u.includes('key=KEY'))).toBe(true);
  });

  it('يفشل برسائل عربية: بلا مفتاح، ومرفوض، وقائمة غير موجودة', async () => {
    await expect(new YouTubePlaylistCatalog(undefined).listVideos('PL1')).rejects.toThrow('YOUTUBE_API_KEY');
    const reply = (status: number) => (async () => json({}, status)) as unknown as typeof fetch;
    await expect(new YouTubePlaylistCatalog('K', reply(403)).listVideos('PL1')).rejects.toThrow('رفض يوتيوب');
    await expect(new YouTubePlaylistCatalog('K', reply(404)).listVideos('PL1')).rejects.toThrow('غير موجودة');
  });
});
