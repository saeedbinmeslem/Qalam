/**
 * @file admin-title-translation.usecases.ts
 * @description عناوين الدروس بالعربية: عناوين يوتيوب تأتي بلغة القناة (غالبًا الإنجليزية) والمنصة عربية أولًا،
 * فنترجم العناوين التي ليس فيها حرف عربي، ونُبقي المصطلحات التقنية المعروفة كما هي. الترجمة تحسين لا شرط:
 * إن فشل النموذج بقيت العناوين الأصلية ولا يتعطل الاستيراد. تُستعمل عند الاستيراد، وللكورسات المستوردة سابقًا.
 */

import { createCourseId } from '@qalam/domain';
import { NotFoundError } from '../../errors.js';
import type { LlmClient } from '../../ports/llm-client.port.js';
import { loadPath, persistLesson, requireAdmin, type AdminDeps, type AdminRequest } from './admin-deps.js';

const ARABIC = /[؀-ۿ]/;
const LATIN = /[A-Za-z]/;
/** عناوين الدفعة الواحدة: تحفظ حجم الطلب والردّ صغيرين مهما طالت القائمة */
const BATCH = 40;

/** عنوان بلا حرف عربي وفيه حروف لاتينية (الأرقام والرموز وحدها لا تحتاج ترجمة) */
export const needsArabicTitle = (title: string): boolean => !ARABIC.test(title) && LATIN.test(title);

const SYSTEM_PROMPT = `أنت مترجم عناوين دروس تعليمية إلى العربية.
ترجم كل عنوان إلى عربية واضحة وموجزة تناسب عنوان درس.
قواعد: أبقِ المصطلحات التقنية المتعارف عليها بحروفها اللاتينية (مثل Python وC++ وAPI وGit) ولا تترجمها حرفيًا؛ احذف الإيموجي وأرقام الحلقات الزائدة واسم القناة؛ لا تضف معلومة غير موجودة في العنوان؛ نص عادي بلا Markdown.
شكل الناتج: {"titles":[{"index":0,"title":"..."}]} مع index كما أُعطي، وعنصر لكل عنوان.`;

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['titles'],
  properties: {
    titles: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['index', 'title'],
        properties: { index: { type: 'integer' }, title: { type: 'string' } },
      },
    },
  },
};

/**
 * يترجم ما يحتاج منها فقط ويعيد خريطة (رقم العنوان ← العنوان العربي). دفعة تفشل تُهمل وتبقى عناوينها كما هي.
 */
export async function translateTitles(llm: LlmClient, titles: readonly string[]): Promise<Map<number, string>> {
  const pending = titles.flatMap((title, index) => (needsArabicTitle(title) ? [index] : []));
  const result = new Map<number, string>();
  for (let start = 0; start < pending.length; start += BATCH) {
    const chunk = pending.slice(start, start + BATCH);
    try {
      const raw = (await llm.generateJson({
        system: SYSTEM_PROMPT,
        schema: SCHEMA,
        user: chunk.map((index) => `${index}. ${titles[index]}`).join('\n'),
      })) as { titles?: unknown };
      if (!Array.isArray(raw?.titles)) continue;
      for (const item of raw.titles as Array<{ index?: unknown; title?: unknown }>) {
        const title = typeof item?.title === 'string' ? item.title.trim() : '';
        // نقبل الردّ إن كان لهذه الدفعة وفيه عربية فعلًا (وإلا بقي الأصلي)
        if (Number.isInteger(item?.index) && chunk.includes(item.index as number) && ARABIC.test(title)) {
          result.set(item.index as number, title);
        }
      }
    } catch {
      // الترجمة تحسين لا شرط
    }
  }
  return result;
}

export interface TitleTranslationDeps extends AdminDeps {
  llm: LlmClient;
}

/** يترجم عناوين الدروس الإنجليزية في كورس (أو في المسار كله) لكورسات استُوردت قبل هذه الميزة */
export class TranslateLessonTitlesUseCase {
  constructor(private readonly deps: TitleTranslationDeps) {}

  async execute(request: AdminRequest & { pathId: string; courseId?: string }): Promise<{ translated: number; remaining: number }> {
    requireAdmin(this.deps.policy, request.actor);
    const path = await loadPath(this.deps.paths, request.pathId);
    let modules = path.modules;
    if (request.courseId) {
      const course = path.findCourse(createCourseId(request.courseId));
      if (!course) throw new NotFoundError('الكورس');
      modules = course.modules;
    }
    const lessons = modules.flatMap((m) => m.lessons);
    const pending = lessons.filter((l) => needsArabicTitle(l.title));
    const translations = await translateTitles(this.deps.llm, pending.map((l) => l.title));

    let translated = 0;
    for (const [i, lesson] of pending.entries()) {
      const title = translations.get(i);
      if (!title) continue;
      // الكورس الذي قد يكون عدّله المالك في الأثناء: نقرأ الحديث ونحفظ صف الدرس وحده
      const fresh = await loadPath(this.deps.paths, request.pathId);
      const found = fresh.findLesson(lesson.id);
      if (!found || found.lesson.title !== lesson.title) continue;
      const updated = found.lesson.update({ title });
      found.module.replaceLesson(updated);
      await persistLesson(this.deps.paths, fresh, updated.id);
      translated += 1;
    }
    return { translated, remaining: pending.length - translated };
  }
}
