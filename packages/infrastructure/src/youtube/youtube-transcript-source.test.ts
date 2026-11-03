import { describe, expect, it } from 'vitest';
import { YoutubeTranscriptSource } from './youtube-transcript-source.js';

const named = (name: string) => Object.assign(new Error(name), { name });
const source = (impl: () => Promise<unknown>) => new YoutubeTranscriptSource(impl as never);

describe('YoutubeTranscriptSource', () => {
  it('يحوّل المقاطع إلى (ثانية البدء، النص) ويتجاهل الفارغ', async () => {
    const s = source(async () => [
      { text: 'مرحبا', offset: 1.5, duration: 2, lang: 'ar' },
      { text: '  ', offset: 4, duration: 1, lang: 'ar' },
    ]);
    expect(await s.fetch('aaaaaaaaaaa', 'ar')).toEqual([{ startSeconds: 1.5, text: 'مرحبا' }]);
  });

  it('يعيد null حين لا يوجد نص للفيديو', async () => {
    for (const name of ['YoutubeTranscriptDisabledError', 'YoutubeTranscriptNotAvailableError']) {
      const s = source(async () => { throw named(name); });
      expect(await s.fetch('aaaaaaaaaaa')).toBeNull();
    }
  });

  it('لا ينتظر طلبًا معلّقًا إلى الأبد', async () => {
    const hung = new YoutubeTranscriptSource((() => new Promise(() => undefined)) as never, 20);
    await expect(hung.fetch('aaaaaaaaaaa')).rejects.toThrow('انتهت مهلة');
  });

  it('يرمي رسالة عربية عند رفض يوتيوب للطلبات، ويمرّر غيره كما هو', async () => {
    const limited = source(async () => { throw named('YoutubeTranscriptTooManyRequestError'); });
    await expect(limited.fetch('aaaaaaaaaaa')).rejects.toThrow('يوتيوب رفض الطلبات');
    const other = source(async () => { throw new Error('شبكة'); });
    await expect(other.fetch('aaaaaaaaaaa')).rejects.toThrow('شبكة');
  });
});
