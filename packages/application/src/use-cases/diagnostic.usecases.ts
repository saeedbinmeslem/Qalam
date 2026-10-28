/**
 * @file diagnostic.usecases.ts
 * @description الاختبار التشخيصي للمتعلم: أسئلة معتمدة فقط (بلا الإجابات)، تصحيح في الخادم، ثم قرارات تخطٍّ
 * تُسجَّل كـ `plan_decision` بسببها (شفافية: «لماذا اقترحت هذا؟») مع حدث `diagnostic_completed`.
 */

import {
  LearningEvent,
  createPathId,
  gradeQuiz,
  planDiagnosticSkips,
  selectDiagnosticQuestions,
  type QuizResult,
} from '@qalam/domain';
import type { ConceptRepositoryPort } from '../ports/concept-repository.port.js';
import type { ClockPort, EventRecorderPort } from '../ports/event-recorder.port.js';
import type { PathRepositoryPort } from '../ports/path-repository.port.js';
import type { QuestionRepositoryPort } from '../ports/question-repository.port.js';
import type { QuizQuestionView } from './learner-quiz.usecases.js';

export interface DiagnosticDeps {
  paths: PathRepositoryPort;
  questions: QuestionRepositoryPort;
  concepts: ConceptRepositoryPort;
}

export interface DiagnosticOutcome {
  result: QuizResult;
  skippedLessons: Array<{ lessonId: string; title: string; reason: string }>;
}

async function prepare(deps: DiagnosticDeps, pathId: string) {
  const path = await deps.paths.findById(createPathId(pathId));
  if (!path) throw new Error('المسار غير موجود');
  const lessons = path.modules.flatMap((m) => m.lessons);
  const approved = (await Promise.all(lessons.map((l) => deps.questions.findByLesson(l.id)))).flat();
  return { path, questions: selectDiagnosticQuestions(path, approved) };
}

async function evaluate(deps: DiagnosticDeps, pathId: string, answers: Record<string, number>) {
  const { path, questions } = await prepare(deps, pathId);
  if (questions.length === 0) throw new Error('لا يوجد اختبار تشخيصي لهذا المسار بعد');
  const result = gradeQuiz(questions, new Map(Object.entries(answers)));
  const names = new Map((await deps.concepts.findAll()).map((c) => [c.id as string, c.name]));
  return { result, plan: planDiagnosticSkips(path, questions, result, names) };
}

const toOutcome = (result: QuizResult, plan: ReturnType<typeof planDiagnosticSkips>): DiagnosticOutcome => ({
  result,
  skippedLessons: plan.skips.map((s) => ({ lessonId: s.lesson.id, title: s.lesson.title, reason: s.reason })),
});

/** أسئلة التشخيصي (null عند غياب أسئلة معتمدة كافية، فلا يُعرض الزر) */
export class GetDiagnosticUseCase {
  constructor(private readonly deps: DiagnosticDeps) {}

  async execute(request: { pathId: string }): Promise<QuizQuestionView[]> {
    const { questions } = await prepare(this.deps, request.pathId);
    return questions.map((q) => ({ id: q.id, prompt: q.prompt, choices: q.choices }));
  }
}

/** تصحيح بلا تسجيل (لصفحة النتيجة) */
export class GetDiagnosticResultUseCase {
  constructor(private readonly deps: DiagnosticDeps) {}

  async execute(request: { pathId: string; answers: Record<string, number> }): Promise<DiagnosticOutcome> {
    const { result, plan } = await evaluate(this.deps, request.pathId, request.answers);
    return toOutcome(result, plan);
  }
}

export class SubmitDiagnosticUseCase {
  constructor(
    private readonly deps: DiagnosticDeps,
    private readonly recorder: EventRecorderPort,
    private readonly clock: ClockPort,
  ) {}

  async execute(request: {
    userId: string;
    pathId: string;
    answers: Record<string, number>;
  }): Promise<DiagnosticOutcome> {
    const { result, plan } = await evaluate(this.deps, request.pathId, request.answers);
    const at = this.clock.now();

    await this.recorder.record(
      new LearningEvent({
        userId: request.userId,
        type: 'diagnostic_completed',
        payload: {
          pathId: request.pathId,
          correct: result.correct,
          total: result.total,
          percent: result.percent,
          masteredConceptIds: plan.masteredConceptIds,
          weakConceptIds: result.weakConceptIds,
        },
        occurredAt: at,
      }),
    );
    for (const skip of plan.skips) {
      await this.recorder.record(
        new LearningEvent({
          userId: request.userId,
          type: 'plan_decision',
          payload: { decision: 'skip_lesson', pathId: request.pathId, lessonId: skip.lesson.id, reason: skip.reason },
          occurredAt: at,
        }),
      );
    }
    return toOutcome(result, plan);
  }
}
