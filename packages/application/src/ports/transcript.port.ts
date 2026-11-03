/**
 * @file transcript.port.ts
 * @description منفذا النص المفرّغ: المصدر (يجلبه من يوتيوب) والمخزن (يحفظه لنجلب مرة واحدة لكل فيديو).
 * النص مصدر داخلي لإعداد الدرس في لوحة التحكم فقط، واختياري: غيابه أو فشل الجلب لا يوقف شيئًا
 * بل تعود المنصة إلى قراءة الفيديو بالنموذج. التنفيذ في Infrastructure ولكل منفذ تنفيذ وهمي للاختبار.
 */

import type { TranscriptSegment } from '@qalam/domain';

export interface TranscriptSourcePort {
  /** مقاطع النص لفيديو يوتيوب، أو null إن لم يكن له نص. يرمي عند الرفض أو الحظر (للمستدعي أن يتجاوز) */
  fetch(videoId: string, language?: string): Promise<TranscriptSegment[] | null>;
}

export interface TranscriptStorePort {
  find(videoId: string): Promise<TranscriptSegment[] | null>;
  save(videoId: string, segments: TranscriptSegment[]): Promise<void>;
}
