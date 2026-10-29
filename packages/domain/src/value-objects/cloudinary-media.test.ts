import { describe, expect, it } from 'vitest';
import { parseCloudinaryVideoUrl } from './cloudinary-media.js';

describe('parseCloudinaryVideoUrl', () => {
  it('يقبل رابط فيديو مرفوعًا ويستخرج المعرّف', () => {
    const result = parseCloudinaryVideoUrl('https://res.cloudinary.com/demo/video/upload/v1700000000/qalam/lesson-1.mp4');
    expect(result.publicId).toBe('lesson-1');
    expect(result.url).toContain('res.cloudinary.com/demo/video/upload');
  });

  it('يرفض http والنطاقات الأخرى', () => {
    expect(() => parseCloudinaryVideoUrl('http://res.cloudinary.com/demo/video/upload/a.mp4')).toThrow();
    expect(() => parseCloudinaryVideoUrl('https://evil.example.com/demo/video/upload/a.mp4')).toThrow();
  });

  it('يرفض الصور والروابط الفارغة أو التالفة', () => {
    expect(() => parseCloudinaryVideoUrl('https://res.cloudinary.com/demo/image/upload/a.png')).toThrow();
    expect(() => parseCloudinaryVideoUrl('https://res.cloudinary.com/demo/video/upload/')).toThrow();
    expect(() => parseCloudinaryVideoUrl('not a url')).toThrow();
  });
});
