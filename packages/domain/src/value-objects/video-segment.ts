/**
 * @file video-segment.ts
 * @description كائن قيمة (Value Object) يمثّل مقطعاً زمنياً محدداً من فيديو يوتيوب
 *
 * كائنات القيمة (Value Objects) لا تملك هوية مستقلة، بل تتحدد قيمتها بمحتواها فقط.
 * كما أنها غير قابلة للتعديل (Immutable) وتتحقق من صحة بياناتها عند الإنشاء.
 */

export interface VideoSegmentProps {
  /** معرّف فيديو يوتيوب (مثال: dQw4w9WgXcQ) */
  videoId: string;
  /** وقت البداية بالثواني */
  startSeconds: number;
  /** وقت النهاية بالثواني */
  endSeconds: number;
}

export class VideoSegment {
  readonly videoId: string;
  readonly startSeconds: number;
  readonly endSeconds: number;

  constructor(props: VideoSegmentProps) {
    if (!props.videoId || props.videoId.trim().length === 0) {
      throw new Error('معرّف الفيديو مطلوب ولا يمكن أن يكون فارغاً');
    }

    if (props.startSeconds < 0) {
      throw new Error('وقت بداية المقطع لا يمكن أن يكون سالباً');
    }

    if (props.endSeconds <= props.startSeconds) {
      throw new Error(
        `وقت نهاية المقطع (${props.endSeconds} ثانية) يجب أن يكون أكبر من وقت البداية (${props.startSeconds} ثانية)`
      );
    }

    this.videoId = props.videoId.trim();
    this.startSeconds = Math.floor(props.startSeconds);
    this.endSeconds = Math.floor(props.endSeconds);
  }

  /**
   * مدة المقطع بالثواني
   */
  get durationSeconds(): number {
    return this.endSeconds - this.startSeconds;
  }

  /**
   * إنشاء رابط يوتيوب المضمّن مع البداية والنهاية
   */
  toEmbedUrl(): string {
    return `https://www.youtube.com/embed/${this.videoId}?start=${this.startSeconds}&end=${this.endSeconds}&autoplay=0`;
  }

  /**
   * مقارنة مقطعين للتأكد من تطابقهما
   */
  equals(other: VideoSegment): boolean {
    return (
      this.videoId === other.videoId &&
      this.startSeconds === other.startSeconds &&
      this.endSeconds === other.endSeconds
    );
  }
}
