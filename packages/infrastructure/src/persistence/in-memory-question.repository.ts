/**
 * @file in-memory-question.repository.ts
 * @description مستودع أسئلة الاختبارات بالذاكرة (التطوير المحلي والاختبار). يحفظ ترتيب الإنشاء.
 */

import type { QuestionRepositoryPort } from '@qalam/application';
import type { LessonId, QuestionId, QuizQuestion } from '@qalam/domain';

export class InMemoryQuestionRepository implements QuestionRepositoryPort {
  private readonly questions = new Map<string, QuizQuestion>();

  constructor(private readonly onChange?: () => void) {}

  async save(question: QuizQuestion): Promise<void> {
    this.questions.set(question.id, question);
    this.onChange?.();
  }

  /** نسخة متزامنة من كل الأسئلة (للّقطة المحلية) */
  list(): QuizQuestion[] {
    return [...this.questions.values()];
  }

  async findById(id: QuestionId): Promise<QuizQuestion | null> {
    return this.questions.get(id) ?? null;
  }

  async findByLesson(lessonId: LessonId): Promise<QuizQuestion[]> {
    return [...this.questions.values()].filter((q) => q.lessonId === lessonId);
  }

  async delete(id: QuestionId): Promise<void> {
    this.questions.delete(id);
    this.onChange?.();
  }
}
