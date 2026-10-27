/**
 * @file lesson.ts
 * @description كيان الدرس (Lesson Entity)
 *
 * الدرس يمثّل محتوى تعليمياً مصغّراً (مقطع فيديو يوتيوب موثّق + ملخص)،
 * ويرتبط بمفهوم محدد، مع الالتزام التام بذكر المصدر وقناة اليوتيوب.
 */

import type { ConceptId, LessonId } from '../value-objects/identifiers.js';
import { VideoSegment } from '../value-objects/video-segment.js';

export interface LessonProps {
  id: LessonId;
  /** عنوان الدرس بالعربية */
  title: string;
  /** معرّف المفهوم الذي يغطيه هذا الدرس */
  conceptId: ConceptId;
  /** المقطع الزمني المحدد من الفيديو */
  segment: VideoSegment;
  /** رابط الفيديو الأصلي على يوتيوب */
  sourceUrl: string;
  /** اسم قناة يوتيوب صاحبة المحتوى (إلزامي للحقوق) */
  channelName: string;
  /** لغة الشرح في الفيديو (ar / en) */
  language?: string;
  /** ملخص الدرس وأبرز النقاط المستخلصة منه */
  summary?: string;
  /** هل تمت مراجعة الدرس واعتماده بشرياً لضمان الجودة؟ */
  reviewedByHuman?: boolean;
}

export class Lesson {
  readonly id: LessonId;
  readonly title: string;
  readonly conceptId: ConceptId;
  readonly segment: VideoSegment;
  readonly sourceUrl: string;
  readonly channelName: string;
  readonly language: string;
  readonly summary?: string;
  readonly reviewedByHuman: boolean;

  constructor(props: LessonProps) {
    if (!props.title || props.title.trim().length === 0) {
      throw new Error('عنوان الدرس مطلوب ولا يمكن أن يكون فارغاً');
    }

    if (!props.channelName || props.channelName.trim().length === 0) {
      throw new Error('اسم قناة يوتيوب مطلوب لحفظ حقوق صانع المحتوى');
    }

    if (!props.sourceUrl || props.sourceUrl.trim().length === 0) {
      throw new Error('رابط المصدر مطلوب');
    }

    this.id = props.id;
    this.title = props.title.trim();
    this.conceptId = props.conceptId;
    this.segment = props.segment;
    this.sourceUrl = props.sourceUrl.trim();
    this.channelName = props.channelName.trim();
    this.language = props.language ?? 'ar';
    this.summary = props.summary?.trim();
    this.reviewedByHuman = props.reviewedByHuman ?? false;
  }

  /** نسخة جديدة بالتعديلات (الكيان غير قابل للتعديل). المعرّف لا يتغيّر. */
  update(changes: Partial<Omit<LessonProps, 'id'>>): Lesson {
    return new Lesson({
      id: this.id,
      title: this.title,
      conceptId: this.conceptId,
      segment: this.segment,
      sourceUrl: this.sourceUrl,
      channelName: this.channelName,
      language: this.language,
      summary: this.summary,
      reviewedByHuman: this.reviewedByHuman,
      ...changes,
    });
  }
}
