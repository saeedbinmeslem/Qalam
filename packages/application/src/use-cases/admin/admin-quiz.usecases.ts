/**
 * @file admin-quiz.usecases.ts
 * @description أسئلة الاختبارات في لوحة التحكم. الذكاء الاصطناعي يولّد «مسودات» مبنية على ملاحظات
 * المالك عن الدرس فقط (لا نفترض نصًا مفرّغًا)، ولا يصل أي سؤال للمتعلم إلا بعد اعتماد المالك.
 */

import {
  QuizQuestion,
  createCourseId,
  createLessonId,
  createModuleId,
  createQuestionId,
  type LearningPath,
  type LessonId,
} from '@qalam/domain';
import { NotFoundError } from '../../errors.js';
import type { LlmClient } from '../../ports/llm-client.port.js';
import type { QuestionRepositoryPort } from '../../ports/question-repository.port.js';
import { loadPath, persistLesson, requireAdmin, type AdminDeps, type AdminRequest } from './admin-deps.js';
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
- لا تذكر في نص السؤال أو خياراته عبارات مثل «وفقًا للمصدر» أو «حسب الملاحظات» أو «بحسب الدرس» أو «في النص»؛ اكتب السؤال مباشرة.
- أسئلة تقيس الفهم لا الحفظ الحرفي.
- نص عادي فقط: بلا LaTeX ولا رموز $ ولا Markdown (اكتب الأسس هكذا: 2^0).`;

export class GenerateQuestionsUseCase {
  constructor(private readonly deps: QuizAdminDeps) {}

  async execute(
    request: AdminRequest & { pathId: string; lessonId: string; count: number },
  ): Promise<{ created: number }> {
    requireAdmin(this.deps.policy, request.actor);
    const path = await loadPath(this.deps.paths, request.pathId);
    const found = path.findLesson(createLessonId(request.lessonId));
    if (!found) throw new NotFoundError('الدرس');
    const { lesson, course } = found;

    if (!lesson.notes) {
      throw new Error('اكتب ملاحظات عن محتوى الدرس أولًا: هي المصدر الوحيد الذي تُبنى عليه الأسئلة');
    }
    const count = Math.min(Math.max(Math.trunc(request.count) || 3, 1), MAX_QUESTIONS_PER_REQUEST);
    const concept = await this.deps.concepts.findById(course.conceptId);

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
          conceptId: course.conceptId,
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

const NOTES_INSTRUCTIONS = `شاهد هذا المقطع التعليمي واكتب «ملاحظات مصدر» بالعربية لتُبنى عليها أسئلة اختبار.

قواعد صارمة:
- اكتب ما قيل في المقطع فقط. لا تضف معلومة من خارجه ولو كانت صحيحة.
- نقاط قصيرة مرقمة: التعريفات الدقيقة، الحقائق، الأرقام، الأمثلة التي ذُكرت.
- إن كان مقطعًا غير واضح أو بلا محتوى تعليمي فاكتب ذلك بدل اختلاق شيء.
- لا مقدمات ولا خاتمة؛ النقاط فقط.
- نص عادي فقط: بلا LaTeX ولا رموز $ ولا Markdown (اكتب الأسس هكذا: 2^0).`;

/**
 * يقرأ مقطع الدرس عبر المزوّد ويحفظ «مسودة ملاحظات» تُراجَع. الملاحظات تُبنى على ما قيل في الفيديو فقط
 * (لا نص مفرّغ)، وأي سؤال يُولَّد منها يبقى مسودة حتى يعتمده المالك بعد المشاهدة.
 */
export class DraftLessonNotesUseCase {
  constructor(private readonly deps: QuizAdminDeps) {}

  async execute(request: AdminRequest & { pathId: string; lessonId: string }): Promise<void> {
    requireAdmin(this.deps.policy, request.actor);
    if (!this.deps.llm.describeVideo) throw new Error('المزوّد الحالي لا يقرأ الفيديو. استخدم Gemini أو اكتب الملاحظات بنفسك');

    const path = await loadPath(this.deps.paths, request.pathId);
    const found = path.findLesson(createLessonId(request.lessonId));
    if (!found) throw new NotFoundError('الدرس');
    const { lesson } = found;
    if (lesson.notes) throw new Error('للدرس ملاحظات بالفعل. امسحها أولًا إن أردت توليد مسودة جديدة');
    // المزوّد يقرأ روابط يوتيوب العامة فقط؛ الفيديو المرفوع (Cloudinary) تكتب ملاحظاته بنفسك
    if (lesson.mediaUrl) throw new Error('الفيديو المرفوع لا يقرؤه النموذج تلقائيًا. اكتب ملاحظاته بنفسك في «بيانات الدرس»');

    const text = (
      await this.deps.llm.describeVideo({
        videoUrl: lesson.sourceUrl,
        startSeconds: lesson.segment.startSeconds,
        endSeconds: lesson.segment.endSeconds,
        instructions: NOTES_INSTRUCTIONS,
      })
    ).trim();
    if (!text) throw new Error('لم يُرجع النموذج ملاحظات لهذا المقطع');

    // الاستدعاء بطيء وقد يعدّل المالك المسار خلاله: نعيد قراءته الآن ونطبّق الملاحظات على الحالة الحديثة
    // (وإلا كتبنا نسخة قديمة فوق تعديلاته). إن حُذف الدرس في الأثناء يُهمل الناتج.
    const fresh = await loadPath(this.deps.paths, request.pathId);
    const current = fresh.findLesson(createLessonId(request.lessonId));
    if (!current) throw new NotFoundError('الدرس');
    // حفظ الملاحظات يسحب «المراجعة البشرية» كأي تعديل على المحتوى (قاعدة الجودة)
    const updated = current.lesson.update({ notes: text, reviewedByHuman: false });
    current.module.replaceLesson(updated);
    await persistLesson(this.deps.paths, fresh, updated.id);
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
      conceptId: found.course.conceptId,
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

/** اعتماد كل مسودات أسئلة الدرس دفعة واحدة (بعد أن يراجعها المالك)؛ يعيد عدد ما اعتُمد */
export class ApproveLessonQuestionsUseCase {
  constructor(private readonly deps: QuizAdminDeps) {}

  async execute(request: AdminRequest & { lessonId: string }): Promise<{ approved: number }> {
    requireAdmin(this.deps.policy, request.actor);
    const drafts = (await this.deps.questions.findByLesson(createLessonId(request.lessonId))).filter(
      (q) => !q.isApproved,
    );
    for (const question of drafts) await this.deps.questions.save(question.approve());
    return { approved: drafts.length };
  }
}

/** نطاق الاعتماد الجماعي: كل كورس (`courseId`) أو كل وحدة (`moduleId`) */
type BatchScope = { courseId: string } | { moduleId: string };

function lessonIdsInScope(path: LearningPath, scope: BatchScope): LessonId[] {
  let modules;
  if ('courseId' in scope) {
    const course = path.findCourse(createCourseId(scope.courseId));
    if (!course) throw new NotFoundError('الكورس');
    modules = course.modules;
  } else {
    const module = path.findModule(createModuleId(scope.moduleId));
    if (!module) throw new NotFoundError('الوحدة');
    modules = [module];
  }
  return modules.flatMap((m) => m.lessons.map((l) => l.id));
}

/** عدد الأسئلة المسودّة (غير المعتمدة) لكل درس في الكورس أو الوحدة؛ تُبنى عليه أزرار «اعتماد الاختبارات» */
export class CountDraftQuestionsUseCase {
  constructor(private readonly deps: QuizAdminDeps) {}

  async execute(
    request: AdminRequest & { pathId: string } & BatchScope,
  ): Promise<Record<string, number>> {
    requireAdmin(this.deps.policy, request.actor);
    const path = await loadPath(this.deps.paths, request.pathId);
    const counts: Record<string, number> = {};
    for (const lessonId of lessonIdsInScope(path, request)) {
      const drafts = (await this.deps.questions.findByLesson(lessonId)).filter((q) => !q.isApproved).length;
      if (drafts > 0) counts[lessonId] = drafts;
    }
    return counts;
  }
}

/**
 * اعتماد مسودات أسئلة كل دروس كورس أو وحدة دفعة واحدة. قرار المالك كاعتماد الدرس نفسه؛
 * يعيد عدد الأسئلة التي اعتُمدت فعلًا.
 */
export class ApproveQuizzesUseCase {
  constructor(private readonly deps: QuizAdminDeps) {}

  async execute(request: AdminRequest & { pathId: string } & BatchScope): Promise<{ approved: number }> {
    requireAdmin(this.deps.policy, request.actor);
    const path = await loadPath(this.deps.paths, request.pathId);
    let approved = 0;
    for (const lessonId of lessonIdsInScope(path, request)) {
      for (const question of await this.deps.questions.findByLesson(lessonId)) {
        if (question.isApproved) continue;
        await this.deps.questions.save(question.approve());
        approved += 1;
      }
    }
    return { approved };
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
