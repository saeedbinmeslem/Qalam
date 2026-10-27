/**
 * @file admin-quiz.usecases.ts
 * @description أسئلة الاختبارات في لوحة التحكم. الذكاء الاصطناعي يولّد «مسودات» مبنية على ملاحظات
 * المالك عن الدرس فقط (لا نفترض نصًا مفرّغًا)، ولا يصل أي سؤال للمتعلم إلا بعد اعتماد المالك.
 */

import { QuizQuestion, createLessonId, createQuestionId } from '@qalam/domain';
import { NotFoundError } from '../../errors.js';
import type { LlmClient } from '../../ports/llm-client.port.js';
import type { QuestionRepositoryPort } from '../../ports/question-repository.port.js';
import { loadPath, requireAdmin, type AdminDeps, type AdminRequest } from './admin-deps.js';
import { GENERATED_QUESTIONS_SCHEMA, parseGeneratedQuestions } from './generated-questions.js';

export interface QuizAdminDeps extends AdminDeps {
  questions: QuestionRepositoryPort;
  llm: LlmClient;
}

export const MAX_QUESTIONS_PER_REQUEST = 8;

const SYSTEM_PROMPT = `أنت مساعد تعليمي يكتب أسئلة اختيار من متعدد بالعربية الفصحى المبسّطة لدرس فيديو.

قواعد صارمة:
- ابنِ كل سؤال على «ملاحظات المصدر» المعطاة فقط. لا تضف معلومة من خارجها ولو كانت صحيحة.
- إن لم تكفِ الملاحظات لعدد الأسئلة المطلوب فأعد عددًا أقل، ولا تختلق.
- لكل سؤال 4 خيارات، واحد صحيح فقط، والباقي مشتتات معقولة وخاطئة بوضوح.
- اجعل الصحيح في مواضع متنوعة بين الأسئلة (correctIndex يبدأ من 0).
- اكتب شرحًا موجزًا يبيّن لماذا الإجابة صحيحة اعتمادًا على الملاحظات.
- لا تذكر عبارة «الملاحظات» أو «النص» داخل السؤال نفسه.
- أسئلة تقيس الفهم لا الحفظ الحرفي.`;

export class GenerateQuestionsUseCase {
  constructor(private readonly deps: QuizAdminDeps) {}

  async execute(
    request: AdminRequest & { pathId: string; lessonId: string; count: number },
  ): Promise<{ created: number }> {
    requireAdmin(this.deps.policy, request.actor);
    const path = await loadPath(this.deps.paths, request.pathId);
    const found = path.findLesson(createLessonId(request.lessonId));
    if (!found) throw new NotFoundError('الدرس');
    const { lesson } = found;

    if (!lesson.notes) {
      throw new Error('اكتب ملاحظات عن محتوى الدرس أولًا: هي المصدر الوحيد الذي تُبنى عليه الأسئلة');
    }
    const count = Math.min(Math.max(Math.trunc(request.count) || 3, 1), MAX_QUESTIONS_PER_REQUEST);
    const concept = await this.deps.concepts.findById(lesson.conceptId);

    const raw = await this.deps.llm.generateJson({
      system: SYSTEM_PROMPT,
      schema: GENERATED_QUESTIONS_SCHEMA,
      user: [
        `عنوان الدرس: ${lesson.title}`,
        `المفهوم: ${concept?.name ?? ''}`,
        `القناة: ${lesson.channelName}`,
        `عدد الأسئلة المطلوب: ${count}`,
        '',
        'ملاحظات المصدر:',
        lesson.notes,
      ].join('\n'),
    });

    // التحقق بالمخطط ثم بقواعد Domain؛ أي مخالفة ترفض الدفعة كلها ولا يُحفظ شيء
    const generated = parseGeneratedQuestions(raw).slice(0, count);
    if (generated.length === 0) throw new Error('لم يتمكن النموذج من توليد أسئلة من هذه الملاحظات. وسّعها وأعد المحاولة');
    const questions = generated.map(
      (g) =>
        new QuizQuestion({
          id: createQuestionId(this.deps.ids.next('q')),
          lessonId: lesson.id,
          conceptId: lesson.conceptId,
          prompt: g.prompt,
          choices: g.choices,
          correctIndex: g.correctIndex,
          explanation: g.explanation,
          status: 'draft',
          origin: 'ai',
        }),
    );
    for (const question of questions) await this.deps.questions.save(question);
    return { created: questions.length };
  }
}

/** سؤال يكتبه المالك بنفسه (مسودة حتى يعتمده، كغيره) */
export class AddQuestionUseCase {
  constructor(private readonly deps: QuizAdminDeps) {}

  async execute(
    request: AdminRequest & {
      pathId: string;
      lessonId: string;
      prompt: string;
      choices: string[];
      correctIndex: number;
      explanation: string;
    },
  ): Promise<{ questionId: string }> {
    requireAdmin(this.deps.policy, request.actor);
    const path = await loadPath(this.deps.paths, request.pathId);
    const found = path.findLesson(createLessonId(request.lessonId));
    if (!found) throw new NotFoundError('الدرس');

    const question = new QuizQuestion({
      id: createQuestionId(this.deps.ids.next('q')),
      lessonId: found.lesson.id,
      conceptId: found.lesson.conceptId,
      prompt: request.prompt,
      choices: request.choices,
      correctIndex: request.correctIndex,
      explanation: request.explanation,
      status: 'draft',
      origin: 'manual',
    });
    await this.deps.questions.save(question);
    return { questionId: question.id };
  }
}

export class ListLessonQuestionsUseCase {
  constructor(private readonly deps: QuizAdminDeps) {}

  async execute(request: AdminRequest & { lessonId: string }): Promise<QuizQuestion[]> {
    requireAdmin(this.deps.policy, request.actor);
    return this.deps.questions.findByLesson(createLessonId(request.lessonId));
  }
}

async function loadQuestion(deps: QuizAdminDeps, questionId: string): Promise<QuizQuestion> {
  const question = await deps.questions.findById(createQuestionId(questionId));
  if (!question) throw new NotFoundError('السؤال');
  return question;
}

export class ApproveQuestionUseCase {
  constructor(private readonly deps: QuizAdminDeps) {}

  async execute(request: AdminRequest & { questionId: string }): Promise<void> {
    requireAdmin(this.deps.policy, request.actor);
    await this.deps.questions.save((await loadQuestion(this.deps, request.questionId)).approve());
  }
}

export class UpdateQuestionUseCase {
  constructor(private readonly deps: QuizAdminDeps) {}

  async execute(
    request: AdminRequest & {
      questionId: string;
      prompt: string;
      choices: string[];
      correctIndex: number;
      explanation: string;
    },
  ): Promise<void> {
    requireAdmin(this.deps.policy, request.actor);
    const question = await loadQuestion(this.deps, request.questionId);
    await this.deps.questions.save(question.edit(request));
  }
}

export class DeleteQuestionUseCase {
  constructor(private readonly deps: QuizAdminDeps) {}

  async execute(request: AdminRequest & { questionId: string }): Promise<void> {
    requireAdmin(this.deps.policy, request.actor);
    await loadQuestion(this.deps, request.questionId);
    await this.deps.questions.delete(createQuestionId(request.questionId));
  }
}
