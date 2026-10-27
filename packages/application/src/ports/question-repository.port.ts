/**
 * @file question-repository.port.ts
 * @description منفذ مستودع أسئلة الاختبارات.
 */

import type { LessonId, QuestionId, QuizQuestion } from '@qalam/domain';

export interface QuestionRepositoryPort {
  save(question: QuizQuestion): Promise<void>;
  findById(id: QuestionId): Promise<QuizQuestion | null>;
  /** كل أسئلة الدرس (مسودات ومعتمدة) بترتيب الإنشاء */
  findByLesson(lessonId: LessonId): Promise<QuizQuestion[]>;
  delete(id: QuestionId): Promise<void>;
}
