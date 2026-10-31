/**
 * @file admin-study-guide.usecases.ts
 * @description «ملخص للقراءة» لمن يفضّل القراءة على المشاهدة (ومنه PDF). يولّده النموذج من «ملاحظات المالك»
 * فقط (لا نص مفرّغ ولا معلومة من خارجها)، ويكتبه المالك أو يعدّله ويراجعه. أي تغيير فيه يسحب المراجعة البشرية
 * للدرس كغيره من المحتوى الذي يراه المتعلم.
 */

import { createLessonId, formatStudyGuide, parseStudyGuide, type ConceptId, type Lesson } from '@qalam/domain';
import { NotFoundError } from '../../errors.js';
import type { ConceptRepositoryPort } from '../../ports/concept-repository.port.js';
import type { LlmClient } from '../../ports/llm-client.port.js';
import { loadPath, persistLesson, requireAdmin, type AdminRequest } from './admin-deps.js';
import type { QuizAdminDeps } from './admin-quiz.usecases.js';

const MAX_GUIDE_CHARS = 8000;

const SYSTEM_PROMPT = `أنت محرر تعليمي يلخّص درسًا للقراءة بالعربية الفصحى المبسّطة، لمتعلم يفضّل القراءة على المشاهدة.

قواعد صارمة:
- لخّص «ملاحظات المصدر» المعطاة فقط. لا تضف معلومة من خارجها ولو كانت صحيحة.
- overview: فقرة قصيرة (2-3 جمل) تقول عمّ يدور الدرس.
- sections: من 2 إلى 6 أقسام، لكل قسم عنوان قصير ونقاط واضحة (points) وجمل كاملة، وفقرة إن لزم (paragraphs).
- اشرح المصطلح عند أول ذكره بجملة، ولا تكرر ما في الملاحظات حرفيًا.
- لا مقدمات ولا خاتمة ولا إشارة إلى «الملاحظات» أو «المصدر».
- نص عادي فقط: بلا LaTeX ولا رموز $ ولا Markdown (اكتب الأسس هكذا: 2^0).`;

export const STUDY_GUIDE_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['overview', 'sections'],
  properties: {
    overview: { type: 'string' },
    sections: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['heading', 'points'],
        properties: {
          heading: { type: 'string' },
          paragraphs: { type: 'array', items: { type: 'string' } },
          points: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
};

const fail = (detail: string): never => {
  throw new Error(`ردّ النموذج غير صالح: ${detail}`);
};

const isStrings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((v) => typeof v === 'string');

/** تحقق صارم من ناتج النموذج ثم تحويله إلى النص المخزَّن */
export function parseGeneratedStudyGuide(raw: unknown): string {
  const data = raw as { overview?: unknown; sections?: unknown } | null;
  if (!data || typeof data.overview !== 'string' || !Array.isArray(data.sections)) return fail('الملخص ناقص');
  const sections = data.sections.map((item: unknown, index: number) => {
    const s = item as { heading?: unknown; paragraphs?: unknown; points?: unknown } | null;
    if (!s || typeof s.heading !== 'string' || !isStrings(s.points)) return fail(`القسم ${index + 1} ناقص`);
    if (s.paragraphs !== undefined && !isStrings(s.paragraphs)) return fail(`فقرات القسم ${index + 1}`);
    return { heading: s.heading, paragraphs: s.paragraphs as string[] | undefined, points: s.points as string[] };
  });
  const text = formatStudyGuide([{ heading: '', paragraphs: [data.overview] }, ...sections]);
  if (parseStudyGuide(text).length === 0) return fail('الملخص فارغ');
  return text;
}

/** يولّد نص الملخص من ملاحظات الدرس فقط (مشترك بين المالك والمتعلم) */
export async function generateStudyGuideText(
  deps: { llm: LlmClient; concepts: ConceptRepositoryPort },
  lesson: Lesson,
  conceptId?: ConceptId,
): Promise<string> {
  if (!lesson.notes) throw new Error('لا توجد مادة كافية لتلخيص هذا الدرس بعد');
  const concept = conceptId ? await deps.concepts.findById(conceptId) : null;
  const raw = await deps.llm.generateJson({
    system: SYSTEM_PROMPT,
    schema: STUDY_GUIDE_SCHEMA,
    user: [`عنوان الدرس: ${lesson.title}`, `المفهوم: ${concept?.name ?? ''}`, '', 'ملاحظات المصدر:', lesson.notes].join('\n'),
  });
  return parseGeneratedStudyGuide(raw).slice(0, MAX_GUIDE_CHARS);
}

export class GenerateStudyGuideUseCase {
  constructor(private readonly deps: QuizAdminDeps) {}

  async execute(request: AdminRequest & { pathId: string; lessonId: string }): Promise<void> {
    requireAdmin(this.deps.policy, request.actor);
    const path = await loadPath(this.deps.paths, request.pathId);
    const found = path.findLesson(createLessonId(request.lessonId));
    if (!found) throw new NotFoundError('الدرس');
    const { lesson, course } = found;
    const guide = await generateStudyGuideText(this.deps, lesson, course.conceptId);
    // الاستدعاء بطيء وقد يعدّل المالك المسار خلاله: نطبّق الملخص على نسخة حديثة لا على القراءة القديمة
    const fresh = await loadPath(this.deps.paths, request.pathId);
    const current = fresh.findLesson(createLessonId(request.lessonId));
    if (!current) throw new NotFoundError('الدرس');
    const updated = current.lesson.update({ studyGuide: guide, reviewedByHuman: false });
    current.module.replaceLesson(updated);
    await persistLesson(this.deps.paths, fresh, updated.id);
  }
}

/**
 * زر «لخّص الدرس» للمتعلم: يولّد الملخص بالذكاء الاصطناعي عند الطلب فقط من ملاحظات الدرس، ويحفظه مرة واحدة
 * (ذاكرة مؤقتة) فلا يتكرر الاستدعاء ولا يتغير ما قرأه غيرك. لا يمسّ وسم المراجعة البشرية.
 */
export class SummarizeLessonUseCase {
  constructor(private readonly deps: Pick<QuizAdminDeps, 'paths' | 'concepts' | 'llm'>) {}

  async execute(request: { userId: string; pathId: string; lessonId: string }): Promise<{ text: string; created: boolean }> {
    const path = await loadPath(this.deps.paths, request.pathId);
    const found = path.findLesson(createLessonId(request.lessonId));
    if (!found) throw new NotFoundError('الدرس');
    const { module, lesson, course } = found;
    if (lesson.studyGuide) return { text: lesson.studyGuide, created: false };

    const text = await generateStudyGuideText(this.deps, lesson, course.conceptId);
    const updated = lesson.update({ studyGuide: text });
    module.replaceLesson(updated);
    // صف الدرس وحده: الاستدعاء بطيء فلا نكتب نسخة قديمة من بقية المسار فوق تعديلات المالك
    await persistLesson(this.deps.paths, path, updated.id);
    return { text, created: true };
  }
}

/** حفظ ملخص يكتبه المالك أو يعدّله؛ النص الفارغ يحذف الملخص */
export class SetStudyGuideUseCase {
  constructor(private readonly deps: QuizAdminDeps) {}

  async execute(request: AdminRequest & { pathId: string; lessonId: string; text: string }): Promise<void> {
    requireAdmin(this.deps.policy, request.actor);
    const path = await loadPath(this.deps.paths, request.pathId);
    const found = path.findLesson(createLessonId(request.lessonId));
    if (!found) throw new NotFoundError('الدرس');
    const text = request.text.trim().slice(0, MAX_GUIDE_CHARS);
    found.module.replaceLesson(found.lesson.update({ studyGuide: text === '' ? undefined : text, reviewedByHuman: false }));
    await this.deps.paths.save(path);
  }
}
