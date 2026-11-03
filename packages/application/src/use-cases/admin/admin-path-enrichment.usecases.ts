/**
 * @file admin-path-enrichment.usecases.ts
 * @description يكمل دروس المسار تلقائيًا بعد الاستيراد: ملاحظات المصدر ← ملخص القراءة ← مسودات أسئلة،
 * بتركيب use cases الموجودة (فلا تتكرر قواعد الجودة). كل مخرجاته مسودات: الدرس يبقى «بانتظار المراجعة»
 * والأسئلة `draft` حتى يعتمدها المالك. العمل متسلسل وبميزانية زمن لأن مزوّد الفيديو (Gemini) بطيء ومحدود الحصة؛
 * ما لم يكتمل يعيده الاستدعاء التالي من حيث توقف.
 */

import type { Lesson } from '@qalam/domain';
import { requireAdmin, loadPath, type AdminRequest } from './admin-deps.js';
import { DraftLessonNotesUseCase, GenerateQuestionsUseCase, ListLessonQuestionsUseCase, type QuizAdminDeps } from './admin-quiz.usecases.js';
import { GenerateStudyGuideUseCase } from './admin-study-guide.usecases.js';

export const DEFAULT_ENRICH_BUDGET_MS = 240_000;
export const QUESTIONS_PER_LESSON = 4;
/**
 * عدد الدروس التي تُعالَج معًا: الانتظار كله على الشبكة (قراءة الفيديو ثم Groq) فتتداخل بأمان، ويقسم الزمن تقريبًا
 * على هذا العدد. حفظ الدرس صفًّا واحدًا (persistLesson) يمنع تزاحم الكتابة على المسار.
 */
export const ENRICH_CONCURRENCY = 3;
/** توقف مبكر إن فشلت هذه العدد من الدروس متتالية (حصة منتهية أو مفتاح خاطئ) بدل استنزاف الوقت */
const MAX_CONSECUTIVE_FAILURES = 3;

export interface EnrichmentResult {
  /** دروس اكتملت في هذا التشغيل */
  completed: number;
  /** دروس ما زالت بلا ملاحظات أو ملخص (تحتاج تشغيلًا آخر) */
  remaining: number;
  failures: { title: string; message: string }[];
}

/** الفيديو المرفوع لا يقرؤه النموذج، فلا يدخل المعالجة التلقائية */
const needsText = (lesson: Lesson) => !lesson.mediaUrl && (!lesson.notes || !lesson.studyGuide);

export class EnrichPathUseCase {
  private readonly notes: DraftLessonNotesUseCase;
  private readonly guide: GenerateStudyGuideUseCase;
  private readonly questions: GenerateQuestionsUseCase;
  private readonly listQuestions: ListLessonQuestionsUseCase;

  constructor(
    private readonly deps: QuizAdminDeps,
    private readonly now: () => number = () => Date.now(),
  ) {
    this.notes = new DraftLessonNotesUseCase(deps);
    this.guide = new GenerateStudyGuideUseCase(deps);
    this.questions = new GenerateQuestionsUseCase(deps);
    this.listQuestions = new ListLessonQuestionsUseCase(deps);
  }

  /** `courseId` يحصر العمل في كورس واحد؛ بدونه يشمل المسار كله */
  async execute(request: AdminRequest & { pathId: string; courseId?: string; budgetMs?: number }): Promise<EnrichmentResult> {
    requireAdmin(this.deps.policy, request.actor);
    const deadline = this.now() + (request.budgetMs ?? DEFAULT_ENRICH_BUDGET_MS);
    const base = { actor: request.actor, pathId: request.pathId };
    const scopeLessons = (path: Awaited<ReturnType<typeof loadPath>>): Lesson[] => {
      const modules = request.courseId
        ? (path.courses.find((c) => c.id === request.courseId)?.modules ?? [])
        : path.modules;
      return modules.flatMap((m) => m.lessons);
    };

    const path = await loadPath(this.deps.paths, request.pathId);
    const targets = scopeLessons(path).filter(needsText);
    const result: EnrichmentResult = { completed: 0, remaining: 0, failures: [] };
    let consecutive = 0;
    let cursor = 0;

    // عمّال متوازون يسحبون الدروس من الطابور؛ كل عامل يتوقف عند نفاد الزمن أو توالي الإخفاق
    const worker = async () => {
      while (this.now() < deadline && consecutive < MAX_CONSECUTIVE_FAILURES) {
        const target = targets[cursor++];
        if (!target) return;
        const lessonId = target.id;
        try {
          // نعيد قراءة الدرس في كل خطوة لأن كل use case يحفظ حالته بنفسه
          const current = async () => (await loadPath(this.deps.paths, request.pathId)).findLesson(lessonId)?.lesson;

          if (!(await current())?.notes) await this.notes.execute({ ...base, lessonId });
          // الملخص والأسئلة يعتمدان على الملاحظات فقط ويحفظان في مخزنين مختلفين، فيجريان معًا ويختصران زمن الدرس.
          // allSettled: إن فشل أحدهما يُنهي الآخر عمله (فلا يبقى طلب معلّق) ثم نرمي أول خطأ.
          const settled = await Promise.allSettled([
            (async () => {
              if (!(await current())?.studyGuide) await this.guide.execute({ ...base, lessonId });
            })(),
            (async () => {
              const existing = await this.listQuestions.execute({ actor: request.actor, lessonId });
              if (existing.length === 0) await this.questions.execute({ ...base, lessonId, count: QUESTIONS_PER_LESSON });
            })(),
          ]);
          const rejected = settled.find((s): s is PromiseRejectedResult => s.status === 'rejected');
          if (rejected) throw rejected.reason;
          result.completed += 1;
          consecutive = 0;
        } catch (error) {
          consecutive += 1;
          result.failures.push({ title: target.title, message: error instanceof Error ? error.message : 'خطأ غير معروف' });
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(ENRICH_CONCURRENCY, targets.length) }, worker));

    const after = await loadPath(this.deps.paths, request.pathId);
    result.remaining = scopeLessons(after).filter(needsText).length;
    return result;
  }
}
