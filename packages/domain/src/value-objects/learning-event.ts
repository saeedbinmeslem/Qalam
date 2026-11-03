/**
 * @file learning-event.ts
 * @description حدث قياس الأثر (القسم 10 من SPEC): كل ما يلزم لحساب نسبة الإكمال والوقت والتقدم لاحقًا.
 * الحدث غير قابل للتعديل بعد إنشائه.
 */

export const LEARNING_EVENT_TYPES = [
  'lesson_opened',
  'lesson_completed',
  'attempt_submitted',
  'diagnostic_completed',
  'plan_decision',
  /** هدف المتعلم من التعارف: الشغف والمجال والمستوى والساعات والمسار المختار */
  'goal_set',
  /** خطة دراسة شخصية أُنشئت (أسابيع ودروس وأسبابها)؛ آخرها هو الحالية */
  'plan_created',
  /** حذف نسخة من سجل الخطط (الأحداث لا تُعدَّل فنسجّل الحذف): payload.planId = وقت إنشاء النسخة ISO */
  'plan_deleted',
] as const;

export type LearningEventType = (typeof LEARNING_EVENT_TYPES)[number];

export interface LearningEventProps {
  userId: string;
  type: LearningEventType;
  /** تفاصيل الحدث (معرّف الدرس، النتيجة، سبب قرار الخطة...) */
  payload?: Record<string, unknown>;
  occurredAt: Date;
}

export class LearningEvent {
  readonly userId: string;
  readonly type: LearningEventType;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly occurredAt: Date;

  constructor(props: LearningEventProps) {
    if (!props.userId || props.userId.trim().length === 0) {
      throw new Error('معرّف المستخدم مطلوب لتسجيل الحدث');
    }
    if (!LEARNING_EVENT_TYPES.includes(props.type)) {
      throw new Error(`نوع الحدث غير معروف: ${String(props.type)}`);
    }
    if (props.type === 'plan_decision' && typeof props.payload?.['reason'] !== 'string') {
      throw new Error('قرار الخطة يجب أن يتضمن سببه (reason) للشفافية');
    }

    this.userId = props.userId;
    this.type = props.type;
    this.payload = Object.freeze({ ...(props.payload ?? {}) });
    this.occurredAt = props.occurredAt;
  }
}
