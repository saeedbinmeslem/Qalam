/**
 * @file learner.ts
 * @description كيان المتعلّم (Learner Entity)
 *
 * يمثّل المتعلّم داخل المنصة، مع معلومات هدفه التعليمي،
 * ووقته المتاح أسبوعياً، ومستواه الحالي.
 */

import { LearnerId, PathId } from '../value-objects/identifiers.js';

export type LearnerLevel = 'beginner' | 'intermediate' | 'advanced';

export interface LearnerProps {
  id: LearnerId;
  /** الاسم المعروض للمتعلم */
  name: string;
  /** البريد الإلكتروني (يستخدم أيضاً للتذكيرات والتقارير عبر Resend) */
  email: string;
  /** الهدف الشخصي للمتعلم (مثال: اجتياز مادة البرمجة بالجامعة) */
  learningGoal?: string;
  /** عدد الساعات المتاحة أسبوعياً للتعلم */
  weeklyAvailableHours?: number;
  /** المستوى الحالي المقدر */
  currentLevel?: LearnerLevel;
  /** معرّف المسار الحالي النشط */
  activePathId?: PathId;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Learner {
  readonly id: LearnerId;
  readonly name: string;
  readonly email: string;
  readonly learningGoal: string;
  readonly weeklyAvailableHours: number;
  readonly currentLevel: LearnerLevel;
  readonly activePathId?: PathId;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: LearnerProps) {
    if (!props.name || props.name.trim().length === 0) {
      throw new Error('اسم المتعلم مطلوب ولا يمكن أن يكون فارغاً');
    }

    if (!props.email || !props.email.includes('@')) {
      throw new Error('البريد الإلكتروني غير صالح');
    }

    this.id = props.id;
    this.name = props.name.trim();
    this.email = props.email.trim().toLowerCase();
    this.learningGoal = props.learningGoal?.trim() ?? '';
    this.weeklyAvailableHours = Math.max(1, props.weeklyAvailableHours ?? 5);
    this.currentLevel = props.currentLevel ?? 'beginner';
    this.activePathId = props.activePathId;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }
}
