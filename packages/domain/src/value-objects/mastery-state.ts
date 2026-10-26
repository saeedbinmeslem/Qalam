/**
 * @file mastery-state.ts
 * @description حالة إتقان المتعلّم لمفهوم تعليمي محدد
 */

export type MasteryLevel =
  | 'not_started' // لم يبدأ بعد
  | 'studying' // قيد الدراسة والمشاهدة
  | 'mastered' // متقن ومثبت باختبارات أو تمارين
  | 'needs_review'; // يحتاج إلى مراجعة دورية (Spaced Repetition)

export interface MasteryStateProps {
  level: MasteryLevel;
  /** درجة الثقة من 0.0 إلى 1.0 مبنية على أداء المتعلّم */
  confidenceScore: number;
  /** آخر تاريخ تم فيه اختبار أو مراجعة هذا المفهوم */
  lastReviewedAt?: Date;
  /** موعد المراجعة القادمة الموصى به (لحسابات Spaced Repetition) */
  nextReviewDue?: Date;
}

export class MasteryState {
  readonly level: MasteryLevel;
  readonly confidenceScore: number;
  readonly lastReviewedAt?: Date;
  readonly nextReviewDue?: Date;

  constructor(props: MasteryStateProps) {
    if (props.confidenceScore < 0 || props.confidenceScore > 1) {
      throw new Error('درجة الثقة يجب أن تكون بين 0.0 و 1.0');
    }

    this.level = props.level;
    this.confidenceScore = props.confidenceScore;
    this.lastReviewedAt = props.lastReviewedAt;
    this.nextReviewDue = props.nextReviewDue;
  }

  /**
   * إنشاء حالة أولية لمفهوم جديد لم يبدأ به المتعلّم
   */
  static initial(): MasteryState {
    return new MasteryState({
      level: 'not_started',
      confidenceScore: 0.0,
    });
  }

  /**
   * هل يحتاج المفهوم لمراجعة عاجلة؟
   */
  isReviewDue(now: Date = new Date()): boolean {
    if (this.level === 'needs_review') return true;
    if (!this.nextReviewDue) return false;
    return now.getTime() >= this.nextReviewDue.getTime();
  }
}
