/**
 * @file transcript.ts
 * @description مقطع من النص المفرّغ لفيديو (الكلام المكتوب بزمنه). يُستعمل مصدرًا داخليًا لتوليد ملاحظات الدرس
 * عند إعداده في لوحة التحكم فقط؛ لا يُعرض للمتعلم ولا يُفترض توفره (قد لا يملك الفيديو ترجمة).
 */

export interface TranscriptSegment {
  /** ثانية بدء المقطع من أول الفيديو */
  startSeconds: number;
  text: string;
}

/** حد أمان لطول النص المرسل للنموذج في طلب واحد */
export const MAX_TRANSCRIPT_CHARS = 80_000;

/**
 * نص الفترة [start, end] من المقاطع مرتبًا بالزمن. يحتفظ بالمقطع الذي يبدأ داخل الفترة،
 * ويقصّ الناتج عند MAX_TRANSCRIPT_CHARS. يعيد نصًا فارغًا إن لم يقع شيء في الفترة.
 */
export function transcriptTextForRange(
  segments: readonly TranscriptSegment[],
  startSeconds: number,
  endSeconds: number,
): string {
  const text = segments
    .filter((s) => s.startSeconds >= startSeconds && s.startSeconds < endSeconds)
    .sort((a, b) => a.startSeconds - b.startSeconds)
    .map((s) => s.text.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(' ');
  return text.length > MAX_TRANSCRIPT_CHARS ? text.slice(0, MAX_TRANSCRIPT_CHARS) : text;
}
