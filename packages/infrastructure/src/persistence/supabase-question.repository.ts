/**
 * @file supabase-question.repository.ts
 * @description مستودع أسئلة الاختبارات على Supabase (جدول quiz_questions، هجرة 003).
 * الكتابة والقراءة الكاملة بمفتاح الخدمة (لوحة التحكم)؛ المتعلم يقرأ المعتمد فقط عبر سياسة RLS.
 */

import type { QuestionRepositoryPort } from '@qalam/application';
import {
  QuizQuestion,
  createConceptId,
  createLessonId,
  createQuestionId,
  type LessonId,
  type QuestionId,
} from '@qalam/domain';
import type { SupabaseDataClient } from './supabase-path.repository.js';

export interface QuestionRow {
  id: string;
  lesson_id: string;
  concept_id: string;
  prompt: string;
  choices: string[];
  correct_index: number;
  explanation: string | null;
  status: 'draft' | 'approved';
  origin: 'ai' | 'manual';
  created_at?: string;
}

export function mapQuestionRow(row: QuestionRow): QuizQuestion {
  return new QuizQuestion({
    id: createQuestionId(row.id),
    lessonId: createLessonId(row.lesson_id),
    conceptId: createConceptId(row.concept_id),
    prompt: row.prompt,
    choices: row.choices,
    correctIndex: row.correct_index,
    explanation: row.explanation ?? '',
    status: row.status,
    origin: row.origin,
  });
}

export class SupabaseQuestionRepository implements QuestionRepositoryPort {
  constructor(private readonly client: SupabaseDataClient) {}

  async save(question: QuizQuestion): Promise<void> {
    const { error } = await this.client.from('quiz_questions').upsert([
      {
        id: question.id,
        lesson_id: question.lessonId,
        concept_id: question.conceptId,
        prompt: question.prompt,
        choices: [...question.choices],
        correct_index: question.correctIndex,
        explanation: question.explanation,
        status: question.status,
        origin: question.origin,
      },
    ]);
    if (error) throw new Error(`تعذّر حفظ السؤال: ${error.message}`);
  }

  async findById(id: QuestionId): Promise<QuizQuestion | null> {
    const rows = await this.read(this.client.from('quiz_questions').select('*').eq('id', id));
    return rows[0] ? mapQuestionRow(rows[0]) : null;
  }

  async findByLesson(lessonId: LessonId): Promise<QuizQuestion[]> {
    const rows = await this.read(this.client.from('quiz_questions').select('*').eq('lesson_id', lessonId));
    return rows
      .sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''))
      .map(mapQuestionRow);
  }

  async delete(id: QuestionId): Promise<void> {
    const { error } = await this.client.from('quiz_questions').delete().eq('id', id);
    if (error) throw new Error(`تعذّر حذف السؤال: ${error.message}`);
  }

  private async read(query: PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>): Promise<QuestionRow[]> {
    const { data, error } = await query;
    if (error) throw new Error(`تعذّرت قراءة الأسئلة: ${error.message}`);
    return (data ?? []) as QuestionRow[];
  }
}
