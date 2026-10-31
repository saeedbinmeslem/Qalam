/**
 * @file lesson.ts
 * @description كيان الدرس (Lesson Entity)
 *
 * الدرس يمثّل محتوى تعليمياً مصغّراً (مقطع فيديو يوتيوب موثّق + ملخص)،
 * ويتبع كورسًا (ومنه مفهومه)، مع الالتزام التام بذكر المصدر وقناة اليوتيوب.
 */

import type { LessonId } from '../value-objects/identifiers.js';
import { VideoSegment } from '../value-objects/video-segment.js';

export interface LessonProps {
  id: LessonId;
  /** عنوان الدرس بالعربية */
  title: string;
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
  /**
   * ملاحظات المالك عن محتوى الدرس (لا تُعرض للمتعلم). هي المصدر الوحيد الذي يُبنى عليه توليد
   * الأسئلة بالذكاء الاصطناعي، لأننا لا نفترض توفر النص المفرّغ للفيديو.
   */
  notes?: string;
  /**
   * رابط فيديو رفعه المالك إلى Cloudinary (نص فقط؛ لا نخزّن الفيديو عندنا). عند وجوده يُعرض بمشغّل
   * HTML بدل تضمين يوتيوب، ويكون `sourceUrl` هو نفسه.
   */
  mediaUrl?: string;
  /** ملخص للقراءة بدل المشاهدة (يُنشأ بالذكاء الاصطناعي من الملاحظات ويراجعه المالك)، ومنه ملف PDF */
  studyGuide?: string;
}

export class Lesson {
  readonly id: LessonId;
  readonly title: string;
  readonly segment: VideoSegment;
  readonly sourceUrl: string;
  readonly channelName: string;
  readonly language: string;
  readonly summary?: string;
  readonly reviewedByHuman: boolean;
  readonly notes?: string;
  readonly mediaUrl?: string;
  readonly studyGuide?: string;

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
    this.segment = props.segment;
    this.sourceUrl = props.sourceUrl.trim();
    this.channelName = props.channelName.trim();
    this.language = props.language ?? 'ar';
    this.summary = props.summary?.trim();
    this.reviewedByHuman = props.reviewedByHuman ?? false;
    const notes = props.notes?.trim();
    if (notes) this.notes = notes;
    const mediaUrl = props.mediaUrl?.trim();
    if (mediaUrl) this.mediaUrl = mediaUrl;
    const studyGuide = props.studyGuide?.trim();
    if (studyGuide) this.studyGuide = studyGuide;
  }

  /** نسخة جديدة بالتعديلات (الكيان غير قابل للتعديل). المعرّف لا يتغيّر. */
  update(changes: Partial<Omit<LessonProps, 'id'>>): Lesson {
    return new Lesson({
      id: this.id,
      title: this.title,
      segment: this.segment,
      sourceUrl: this.sourceUrl,
      channelName: this.channelName,
      language: this.language,
      summary: this.summary,
      reviewedByHuman: this.reviewedByHuman,
      notes: this.notes,
      mediaUrl: this.mediaUrl,
      studyGuide: this.studyGuide,
      ...changes,
    });
  }
}
