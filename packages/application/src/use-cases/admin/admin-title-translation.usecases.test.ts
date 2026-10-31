import { AdminPolicy, type Concept, type ConceptId, type LearningPath, type PathId } from '@qalam/domain';
import { describe, expect, it } from 'vitest';
import { ForbiddenError, NotFoundError } from '../../errors.js';
import type { LlmClient, LlmJsonRequest } from '../../ports/llm-client.port.js';
import { seedPathWithModule } from '../../test-support/admin-seed.js';
import { AddLessonUseCase } from './admin-lessons.usecases.js';
import { TranslateLessonTitlesUseCase, needsArabicTitle, translateTitles } from './admin-title-translation.usecases.js';

class Paths {
  store = new Map<string, LearningPath>();
  save = async (p: LearningPath) => void this.store.set(p.id, p);
  delete = async (id: PathId) => void this.store.delete(id);
  findById = async (id: PathId) => this.store.get(id) ?? null;
  findBySubject = async () => [...this.store.values()];
  findAll = async () => [...this.store.values()];
}

const admin = { id: 'u1', email: 'owner@qalam.dev' };

/** مستودع مفاهيم بالذاكرة (البذرة تحفظ فيه المفهوم الذي تتطلبه الدروس) */
function concepts() {
  const store = new Map<string, Concept>();
  return {
    save: async (c: Concept) => void store.set(c.id, c),
    findById: async (id: ConceptId) => store.get(id) ?? null,
    findAll: async () => [...store.values()],
    findByPath: async (pathId: PathId) => [...store.values()].filter((c) => c.pathId === pathId),
    delete: async (id: ConceptId) => void store.delete(id),
  };
}

const llmFrom = (answer: (r: LlmJsonRequest) => unknown): LlmClient => ({ generateJson: async (r) => answer(r) });

async function setup(titles: string[], llm: LlmClient) {
  let n = 0;
  const deps = {
    paths: new Paths(),
    concepts: concepts(),
    ids: { next: (p: string) => `${p}-${++n}` },
    policy: AdminPolicy.fromList('owner@qalam.dev'),
    llm,
  };
  const { pathId, moduleId } = await seedPathWithModule(deps as never, admin);
  for (const [i, title] of titles.entries()) {
    await new AddLessonUseCase(deps as never).execute({
      actor: admin, pathId, moduleId, title, videoUrl: `vid${String(i).padStart(8, "0")}`, start: '0', end: '300',
      channelName: 'ق', language: 'en', summary: '',
    });
  }
  return { deps, pathId };
}

describe('ترجمة العناوين', () => {
  it('تحتاج ترجمة العناوين اللاتينية فقط', () => {
    expect(needsArabicTitle('Intro to C++')).toBe(true);
    expect(needsArabicTitle('مقدمة في C++')).toBe(false);
    expect(needsArabicTitle('123 - 45')).toBe(false);
  });

  it('translateTitles يرفض ما ليس فيه عربية ويتجاوز ما لا يحتاج ويصمد أمام فشل الدفعة', async () => {
    const ok = await translateTitles(llmFrom(() => ({ titles: [{ index: 0, title: 'مقدمة' }, { index: 5, title: 'خارج الدفعة' }] })), ['Intro', 'درس']);
    expect([...ok]).toEqual([[0, 'مقدمة']]);
    const failed = await translateTitles(llmFrom(() => { throw new Error('x'); }), ['Intro']);
    expect(failed.size).toBe(0);
  });

  it('TranslateLessonTitlesUseCase يترجم دروس الكورس الإنجليزية ويحفظ كل درس', async () => {
    const llm = llmFrom((r) => ({ titles: r.user.split('\n').map((line) => ({ index: Number(line.split('.')[0]), title: 'عنوان معرَّب' })) }));
    const { deps, pathId } = await setup(['Variables', 'دروس عربية', 'Loops'], llm);
    const path = (await deps.paths.findById(pathId as PathId))!;
    const courseId = path.courses[0]!.id;

    const result = await new TranslateLessonTitlesUseCase(deps as never).execute({ actor: admin, pathId, courseId });
    expect(result).toEqual({ translated: 2, remaining: 0 });
    const titles = (await deps.paths.findById(pathId as PathId))!.modules.flatMap((m) => m.lessons).map((l) => l.title);
    expect(titles).toEqual(['عنوان معرَّب', 'دروس عربية', 'عنوان معرَّب']);

    await expect(new TranslateLessonTitlesUseCase(deps as never).execute({ actor: admin, pathId, courseId: 'nope' })).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      new TranslateLessonTitlesUseCase(deps as never).execute({ actor: { id: 'x', email: 'x@x.com' }, pathId }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
