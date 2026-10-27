import { describe, expect, it } from 'vitest';
import { QuizQuestion } from '../entities/quiz-question.js';
import { createConceptId, createLessonId, createQuestionId } from '../value-objects/identifiers.js';
import { gradeQuiz } from './quiz-grading.js';

const question = (id: string, concept: string, correctIndex = 1) =>
  new QuizQuestion({
    id: createQuestionId(id),
    lessonId: createLessonId('l'),
    conceptId: createConceptId(concept),
    prompt: `سؤال ${id}`,
    choices: ['أ', 'ب', 'ج', 'د'],
    correctIndex,
    explanation: 'شرح',
    status: 'approved',
  });

describe('QuizQuestion (سؤال الاختبار)', () => {
  const base = {
    id: createQuestionId('q'),
    lessonId: createLessonId('l'),
    conceptId: createConceptId('c'),
    prompt: 'سؤال',
    choices: ['أ', 'ب', 'ج'],
    correctIndex: 0,
    explanation: '',
  };

  it('يبدأ مسودة، ويعتمد بـ approve، ويعود مسودة عند التعديل', () => {
    const q = new QuizQuestion(base);
    expect(q.status).toBe('draft');
    const approved = q.approve();
    expect(approved.isApproved).toBe(true);
    expect(approved.edit({ prompt: 'جديد', choices: ['أ', 'ب', 'ج'], correctIndex: 1, explanation: '' }).status).toBe('draft');
  });

  it('يرفض البيانات غير الصالحة', () => {
    expect(() => new QuizQuestion({ ...base, prompt: ' ' })).toThrow('نص السؤال');
    expect(() => new QuizQuestion({ ...base, choices: ['أ', 'ب'] })).toThrow('عدد الخيارات');
    expect(() => new QuizQuestion({ ...base, choices: ['أ', 'أ', 'ب'] })).toThrow('تتكرر');
    expect(() => new QuizQuestion({ ...base, correctIndex: 5 })).toThrow('خارج نطاق');
    expect(() => new QuizQuestion({ ...base, choices: ['أ', ' ', 'ب'] })).toThrow('فارغة');
  });
});

describe('gradeQuiz (التصحيح)', () => {
  const questions = [question('q1', 'c1'), question('q2', 'c2'), question('q3', 'c2')];

  it('يحسب الدرجة والنسبة والمفاهيم الضعيفة بلا تكرار', () => {
    const result = gradeQuiz(questions, new Map([['q1', 1], ['q2', 0], ['q3', 3]]));
    expect(result).toMatchObject({ total: 3, correct: 1, percent: 33 });
    expect(result.weakConceptIds).toEqual(['c2']);
    expect(result.results[1]).toMatchObject({ chosenIndex: 0, isCorrect: false, correctIndex: 1 });
  });

  it('السؤال بلا إجابة أو بإجابة خارج النطاق يُحسب خاطئًا', () => {
    const result = gradeQuiz(questions, new Map([['q1', 1], ['q2', 99]]));
    expect(result.correct).toBe(1);
    expect(result.results[1]?.chosenIndex).toBeNull();
    expect(result.results[2]?.chosenIndex).toBeNull();
  });

  it('اختبار فارغ: صفر بلا قسمة على صفر', () => {
    expect(gradeQuiz([], new Map())).toMatchObject({ total: 0, correct: 0, percent: 0 });
  });

  it('كل الإجابات صحيحة: 100% بلا مفاهيم ضعيفة', () => {
    const result = gradeQuiz(questions, new Map([['q1', 1], ['q2', 1], ['q3', 1]]));
    expect(result.percent).toBe(100);
    expect(result.weakConceptIds).toEqual([]);
  });
});
