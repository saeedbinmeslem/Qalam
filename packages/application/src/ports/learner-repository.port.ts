/**
 * @file learner-repository.port.ts
 * @description منفذ مستودع بيانات المتعلّمين (Learner Repository Port)
 *
 * يحدد العمليات المطلوبة للتعامل مع بيانات المتعلّم واسترجاعها وحفظها.
 */

import { Learner, LearnerId } from '@qalam/domain';

export interface LearnerRepositoryPort {
  /**
   * حفظ أو تحديث بيانات متعلّم
   */
  save(learner: Learner): Promise<void>;

  /**
   * البحث عن متعلّم بواسطة معرّفه
   */
  findById(id: LearnerId): Promise<Learner | null>;

  /**
   * البحث عن متعلّم بواسطة بريده الإلكتروني
   */
  findByEmail(email: string): Promise<Learner | null>;
}
