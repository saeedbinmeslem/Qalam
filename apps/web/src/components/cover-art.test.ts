import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CoverArt, CoverBanner, LessonThumb, coverImageSrc, coverLetter, coverTone, youtubeThumbnailSrc } from './cover-art';

describe('coverImageSrc', () => {
  it('يضيف تحويل القصّ والصيغة والعرض بعد image/upload ويبقي الباقي', () => {
    expect(coverImageSrc('https://res.cloudinary.com/demo/image/upload/v1/qalam/covers/a.jpg', 640)).toBe(
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_fill,ar_16:9,w_640/v1/qalam/covers/a.jpg',
    );
  });

  it('يعيد أي رابط آخر كما هو', () => {
    expect(coverImageSrc('https://example.com/a.jpg', 640)).toBe('https://example.com/a.jpg');
  });
});

describe('coverTone', () => {
  it('ثابت لنفس المعرّف وضمن 0..3', () => {
    for (const seed of ['path-1', 'path-2', 'x', 'مسار']) {
      expect(coverTone(seed)).toBe(coverTone(seed));
      expect(coverTone(seed)).toBeGreaterThanOrEqual(0);
      expect(coverTone(seed)).toBeLessThanOrEqual(3);
    }
  });
});

describe('coverLetter', () => {
  it('يتجاوز «ال» التعريف ويتجاهل الرموز', () => {
    expect(coverLetter('الحاسوب')).toBe('ح');
    expect(coverLetter('«مدخل» إلى بايثون')).toBe('م');
    expect(coverLetter('Python')).toBe('P');
  });

  it('يرجع «ق» عند غياب الحروف', () => {
    expect(coverLetter('123 ---')).toBe('ق');
  });
});

describe('CoverArt / CoverBanner', () => {
  const image = 'https://res.cloudinary.com/demo/image/upload/v1/qalam/covers/a.jpg';

  it('مع صورة: img محسَّنة وكسولة بلا غلاف الحرف', () => {
    const html = renderToStaticMarkup(createElement(CoverArt, { seed: 'p', title: 'الحاسوب', imageUrl: image }));
    expect(html).toContain('<img');
    expect(html).toContain('f_auto,q_auto,c_fill,ar_16:9,w_640');
    expect(html).toContain('loading="lazy"');
    expect(html).not.toContain('<svg');
  });

  it('بلا صورة: غلاف الحرف SVG بلا طلب شبكة', () => {
    const html = renderToStaticMarkup(createElement(CoverArt, { seed: 'p', title: 'الحاسوب' }));
    expect(html).toContain('<svg');
    expect(html).toContain('ح');
    expect(html).not.toContain('<img');
  });

  it('الترويسة: مع صورة طبقة داكنة وصورة عريضة، وبدونها لون الغلاف', () => {
    const withImage = renderToStaticMarkup(createElement(CoverBanner, { seed: 'p', title: 'ت', imageUrl: image, children: 'محتوى' }));
    expect(withImage).toContain('w_1600');
    expect(withImage).toContain('محتوى');
    const plain = renderToStaticMarkup(createElement(CoverBanner, { seed: 'p', title: 'ت', children: 'محتوى' }));
    expect(plain).not.toContain('<img');
    expect(plain).toContain('var(--cover-bg)');
  });
});

describe('LessonThumb', () => {
  it('مصغّرة يوتيوب الرسمية بحجم القوائم وتحميل كسول', () => {
    expect(youtubeThumbnailSrc('abcdefghijk')).toBe('https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg');
    expect(youtubeThumbnailSrc('abcdefghijk', 'large')).toBe('https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg');
    const html = renderToStaticMarkup(createElement(LessonThumb, { videoId: 'abcdefghijk', seed: 'p', title: 'درس' }));
    expect(html).toContain('i.ytimg.com/vi/abcdefghijk/mqdefault.jpg');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('alt=""');
  });

  it('بلا معرّف يوتيوب (درس مرفوع) يظهر الغلاف المولَّد', () => {
    const html = renderToStaticMarkup(createElement(LessonThumb, { seed: 'p', title: 'درس' }));
    expect(html).toContain('<svg');
    expect(html).not.toContain('<img');
  });
});
