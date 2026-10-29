import { describe, expect, it } from 'vitest';
import { formatStudyGuide, parseStudyGuide } from './study-guide.js';

describe('ملخص القراءة', () => {
  it('يذهب ويعود دون فقد: عناوين وفقرات ونقاط', () => {
    const text = formatStudyGuide([
      { heading: '', paragraphs: ['نظرة سريعة على الدرس.'] },
      { heading: 'البيانات', points: ['خام', 'بلا معنى وحدها'] },
      { heading: 'المعلومات', paragraphs: ['بيانات بعد معالجتها.'], points: ['لها سياق'] },
    ]);
    const sections = parseStudyGuide(text);
    expect(sections).toHaveLength(3);
    expect(sections[0]).toEqual({ heading: '', paragraphs: ['نظرة سريعة على الدرس.'], points: [] });
    expect(sections[1]?.points).toEqual(['خام', 'بلا معنى وحدها']);
    expect(sections[2]).toEqual({ heading: 'المعلومات', paragraphs: ['بيانات بعد معالجتها.'], points: ['لها سياق'] });
  });

  it('يتسامح مع الأسطر الفارغة والنص الحرّ ويتجاهل الفراغ', () => {
    expect(parseStudyGuide('')).toEqual([]);
    expect(parseStudyGuide('\n\n  \n')).toEqual([]);
    const sections = parseStudyGuide('فقرة بلا عنوان\n- نقطة\n\n## قسم\n- أخرى');
    expect(sections.map((s) => s.heading)).toEqual(['', 'قسم']);
    expect(sections[0]?.points).toEqual(['نقطة']);
  });

  it('format يحذف الأقسام الفارغة', () => {
    expect(formatStudyGuide([{ heading: ' ', points: ['  '] }])).toBe('');
  });
});
