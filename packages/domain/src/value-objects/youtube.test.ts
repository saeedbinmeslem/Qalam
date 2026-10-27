import { describe, expect, it } from 'vitest';
import { formatTimecode, parseTimecode, parseYouTubeVideoId } from './youtube.js';

describe('parseYouTubeVideoId (استخراج معرّف الفيديو)', () => {
  const id = 'qTVRs1wTwho';

  it('يقبل المعرّف والروابط الشائعة', () => {
    expect(parseYouTubeVideoId(id)).toBe(id);
    expect(parseYouTubeVideoId(`https://www.youtube.com/watch?v=${id}&t=30s`)).toBe(id);
    expect(parseYouTubeVideoId(`https://youtu.be/${id}?si=x`)).toBe(id);
    expect(parseYouTubeVideoId(`https://www.youtube.com/embed/${id}`)).toBe(id);
    expect(parseYouTubeVideoId(`  https://m.youtube.com/shorts/${id} `)).toBe(id);
  });

  it('يرفض ما ليس رابط يوتيوب', () => {
    expect(() => parseYouTubeVideoId('https://example.com/watch?v=qTVRs1wTwho')).toThrow();
    expect(() => parseYouTubeVideoId('https://www.youtube.com/watch?v=قصير')).toThrow();
    expect(() => parseYouTubeVideoId('hello')).toThrow();
  });
});

describe('parseTimecode / formatTimecode (التوقيتات)', () => {
  it('يحوّل الصيغ المختلفة إلى ثوانٍ', () => {
    expect(parseTimecode('83')).toBe(83);
    expect(parseTimecode('1:23')).toBe(83);
    expect(parseTimecode('01:02:03')).toBe(3723);
  });

  it('يرفض الصيغ الخاطئة', () => {
    expect(() => parseTimecode('')).toThrow();
    expect(() => parseTimecode('1:xx')).toThrow();
    expect(() => parseTimecode('1:2:3:4')).toThrow();
    expect(() => parseTimecode('-5')).toThrow();
  });

  it('يعيد التنسيق إلى نص قابل للقراءة', () => {
    expect(formatTimecode(83)).toBe('1:23');
    expect(formatTimecode(3723)).toBe('1:02:03');
    expect(parseTimecode(formatTimecode(1609))).toBe(1609);
  });
});
