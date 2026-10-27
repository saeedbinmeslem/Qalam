/**
 * @file quiz-grading.ts
 * @description تصحيح اختبار قصير. نقي بلا I/O. السؤال بلا إجابة يُحسب خاطئًا، والمفاهيم الضعيفة
 * هي مفاهيم الأسئلة الخاطئة (يبني عليها الوكيل قراراته لاحقًا).
 */

import type { QuizQuestion } from '../entities/quiz-question.js';
import type { ConceptId } from '../value-objects/identifiers.js';

export interface QuestionResult {
  questionId: string;
  prompt: string;
  choices: readonly string[];
  /** null إذا لم يُجب المتعلم */
  chosenIndex: number | null;
  correctIndex: number;
  isCorrect: boolean;
  explanation: string;
}

export interface QuizResult {
  total: number;
  correct: number;
  /** 0..100 */
  percent: number;
  results: QuestionResult[];
  weakConceptIds: ConceptId[];
}

/** answers: معرّف السؤال → رقم الخيار المختار */
export function gradeQuiz(
  questions: readonly QuizQuestion[],
  answers: ReadonlyMap<string, number>,
): QuizResult {
  const results: QuestionResult[] = questions.map((q) => {
    const chosen = answers.get(q.id);
    const chosenIndex = chosen !== undefined && Number.isInteger(chosen) && chosen >= 0 && chosen < q.choices.length ? chosen : null;
    return {
      questionId: q.id,
      prompt: q.prompt,
      choices: q.choices,
      chosenIndex,
      correctIndex: q.correctIndex,
      isCorrect: chosenIndex === q.correctIndex,
      explanation: q.explanation,
    };
  });

  const correct = results.filter((r) => r.isCorrect).length;
  const weak = new Set<ConceptId>();
  questions.forEach((q, i) => {
    if (!results[i]?.isCorrect) weak.add(q.conceptId);
  });

  return {
    total: questions.length,
    correct,
    percent: questions.length === 0 ? 0 : Math.round((correct / questions.length) * 100),
    results,
    weakConceptIds: [...weak],
  };
}
