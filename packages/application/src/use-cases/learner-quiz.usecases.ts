/**
 * @file learner-quiz.usecases.ts
 * @description الاختبار القصير للمتعلم: الأسئلة المعتمدة فقط، والتصحيح في الخادم (الواجهة لا ترى
 * الإجابة الصحيحة قبل الإرسال)، وتسجيل المحاولة كحدث `attempt_submitted` لقياس الأثر.
 */

import { LearningEvent, createLessonId, gradeQuiz, type QuizResult } from '@qalam/domain';
import type { ClockPort, EventRecorderPort } from '../ports/event-recorder.port.js';
import type { QuestionRepositoryPort } from '../ports/question-repository.port.js';

/** السؤال كما يراه المتعلم: بلا الإجابة الصحيحة */
export interface QuizQuestionView {
  id: string;
  prompt: string;
  choices: readonly string[];
}

async function approvedQuestions(questions: QuestionRepositoryPort, lessonId: string) {
  return (await questions.findByLesson(createLessonId(lessonId))).filter((q) => q.isApproved);
}

export class GetLessonQuizUseCase {
  constructor(private readonly questions: QuestionRepositoryPort) {}

  async execute(request: { lessonId: string }): Promise<QuizQuestionView[]> {
    return (await approvedQuestions(this.questions, request.lessonId)).map((q) => ({
      id: q.id,
      prompt: q.prompt,
      choices: q.choices,
    }));
  }
}

/** تصحيح بلا تسجيل (لصفحة النتيجة) */
export class GetQuizResultUseCase {
  constructor(private readonly questions: QuestionRepositoryPort) {}

  async execute(request: { lessonId: string; answers: Record<string, number> }): Promise<QuizResult> {
    const approved = await approvedQuestions(this.questions, request.lessonId);
    return gradeQuiz(approved, new Map(Object.entries(request.answers)));
  }
}

export class SubmitQuizUseCase {
  constructor(
    private readonly questions: QuestionRepositoryPort,
    private readonly recorder: EventRecorderPort,
    private readonly clock: ClockPort,
  ) {}

  async execute(request: {
    userId: string;
    pathId: string;
    lessonId: string;
    answers: Record<string, number>;
  }): Promise<QuizResult> {
    const approved = await approvedQuestions(this.questions, request.lessonId);
    if (approved.length === 0) throw new Error('لا يوجد اختبار معتمد لهذا الدرس');

    const result = gradeQuiz(approved, new Map(Object.entries(request.answers)));
    await this.recorder.record(
      new LearningEvent({
        userId: request.userId,
        type: 'attempt_submitted',
        payload: {
          kind: 'quiz',
          pathId: request.pathId,
          lessonId: request.lessonId,
          correct: result.correct,
          total: result.total,
          percent: result.percent,
          weakConceptIds: result.weakConceptIds,
        },
        occurredAt: this.clock.now(),
      }),
    );
    return result;
  }
}
