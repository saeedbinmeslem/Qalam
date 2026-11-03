import { describe, expect, it } from 'vitest';
import { MAX_TRANSCRIPT_CHARS, transcriptTextForRange } from './transcript.js';

const segments = [
  { startSeconds: 30, text: 'ثالثا' },
  { startSeconds: 0, text: 'أولا' },
  { startSeconds: 10, text: '  ثانيا \n هنا ' },
];

describe('transcriptTextForRange', () => {
  it('يرتّب بالزمن وينظّف المسافات', () => {
    expect(transcriptTextForRange(segments, 0, 100)).toBe('أولا ثانيا هنا ثالثا');
  });

  it('يأخذ ما يبدأ داخل الفترة فقط (النهاية غير شاملة)', () => {
    expect(transcriptTextForRange(segments, 10, 30)).toBe('ثانيا هنا');
  });

  it('يعيد نصًا فارغًا إن لم يقع شيء في الفترة', () => {
    expect(transcriptTextForRange(segments, 100, 200)).toBe('');
  });

  it('يقصّ النص عند الحد الأقصى', () => {
    const long = [{ startSeconds: 0, text: 'ا'.repeat(MAX_TRANSCRIPT_CHARS + 50) }];
    expect(transcriptTextForRange(long, 0, 10)).toHaveLength(MAX_TRANSCRIPT_CHARS);
  });
});
