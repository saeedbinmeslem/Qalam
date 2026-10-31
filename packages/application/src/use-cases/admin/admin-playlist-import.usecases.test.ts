import { describe, expect, it } from 'vitest';
import {
  AdminPolicy,
  Concept,
  createConceptId,
  createPathId,
  type ConceptId,
  type LearningPath,
  type PathId,
} from '@qalam/domain';
import { ForbiddenError, NotFoundError } from '../../errors.js';
import type { ConceptRepositoryPort } from '../../ports/concept-repository.port.js';
import type { LlmClient, LlmJsonRequest } from '../../ports/llm-client.port.js';
import type { PlaylistVideo } from '../../ports/playlist-catalog.port.js';
import { CreatePathUseCase } from './admin-paths.usecases.js';
import { ImportPlaylistUseCase, parsePlaylistStructure, type PlaylistImportDeps } from './admin-playlist-import.usecases.js';

class Paths {
  store = new Map<string, LearningPath>();
  save = async (p: LearningPath) => void this.store.set(p.id, p);
  delete = async (id: PathId) => void this.store.delete(id);
  findById = async (id: PathId) => this.store.get(id) ?? null;
  findBySubject = async () => [...this.store.values()];
  findAll = async () => [...this.store.values()];
}

class Concepts implements ConceptRepositoryPort {
  store = new Map<string, Concept>();
  async save(c: Concept) {
    this.store.set(c.id, c);
  }
  async findById(id: ConceptId) {
    return this.store.get(id) ?? null;
  }
  async findAll() {
    return [...this.store.values()];
  }
  async findByPath(pathId: PathId) {
    return [...this.store.values()].filter((c) => c.pathId === pathId);
  }
  async delete(id: ConceptId) {
    this.store.delete(id);
  }
}

const admin = { id: 'u1', email: 'owner@qalam.dev' };
const video = (n: number, over: Partial<PlaylistVideo> = {}): PlaylistVideo => ({
  videoId: `vid${String(n).padStart(8, '0')}`,
  title: `فيديو ${n} 🔥`,
  channelName: 'قناة',
  durationSeconds: 600 + n,
  description: 'وصف',
  ...over,
});

const lesson = (index: number, over = {}) => ({ index, title: `درس ${index}`, summary: 'ملخص', language: 'ar', ...over });
const concept = (over = {}) => ({ existingId: '', name: 'أنظمة العد', description: 'وصف', level: 2, prerequisites: [] as string[], ...over });
const answer = (over = {}) => ({
  concept: concept(),
  courseTitle: 'النظام الثنائي',
  courseDescription: 'وصف الكورس',
  modules: [{ title: 'الأساسيات', description: 'و', lessons: [lesson(0), lesson(1, { language: 'en' })] }],
  ...over,
});

async function setup(videos: PlaylistVideo[], reply: unknown) {
  let n = 0;
  const calls: LlmJsonRequest[] = [];
  const llm: LlmClient = {
    generateJson: async (request) => {
      calls.push(request);
      if (reply instanceof Error) throw reply;
      return reply;
    },
  };
  const deps: PlaylistImportDeps = {
    paths: new Paths(),
    concepts: new Concepts(),
    ids: { next: (prefix) => `${prefix}-${++n}` },
    policy: AdminPolicy.fromList('owner@qalam.dev'),
    playlists: { listVideos: async () => videos },
    llm,
  };
  const { pathId } = await new CreatePathUseCase(deps).execute({ actor: admin, title: 'م', description: '', targetGoal: 'هدف', subject: 'ع' });
  const request = { actor: admin, pathId, playlistUrl: 'PLxyzABC1234567890_-abcdefghijk' };
  return { deps, calls, pathId, request };
}

const pathOf = async (deps: PlaylistImportDeps, pathId: string) => (await deps.paths.findById(pathId as PathId))!;
const conceptsOf = (deps: PlaylistImportDeps) => [...(deps.concepts as Concepts).store.values()];

describe('ImportPlaylistUseCase (استيراد قائمة يوتيوب ككورس)', () => {
  it('القائمة كورس واحد تحت مفهوم جديد في المسار، بوحداته ودروسه، والمدة والقناة من يوتيوب', async () => {
    const videos = [video(1), video(2)];
    const { deps, pathId, request } = await setup(videos, answer());
    const result = await new ImportPlaylistUseCase(deps).execute(request);
    expect(result).toEqual({
      courseTitle: 'النظام الثنائي', conceptName: 'أنظمة العد', newConcept: true, modules: 1, lessons: 2, skipped: 0,
    });

    const [created] = conceptsOf(deps);
    expect(created).toMatchObject({ name: 'أنظمة العد', pathId, level: 2 });

    const path = await pathOf(deps, pathId);
    expect(path.courses).toHaveLength(1);
    const course = path.courses[0]!;
    expect(course).toMatchObject({ title: 'النظام الثنائي', conceptId: created!.id, orderIndex: 1 });
    expect(course.modules.map((m) => m.title)).toEqual(['الأساسيات']);

    const lessons = course.modules[0]!.lessons;
    expect(lessons.map((l) => [l.title, l.language, l.reviewedByHuman, l.summary])).toEqual([
      ['درس 0', 'ar', false, 'ملخص'],
      ['درس 1', 'en', false, 'ملخص'],
    ]);
    expect(lessons[0]?.segment.endSeconds).toBe(601);
    expect(lessons[0]?.channelName).toBe('قناة');
    expect(lessons[0]?.sourceUrl).toContain(videos[0]!.videoId);
    expect(path.conceptIdOfLesson(lessons[1]!.id)).toBe(created!.id);
  });

  it('القائمة الطويلة (أكثر من 50) تُستورد كاملة دفعة واحدة بنطاقات وحدات، وتبقى عناوين يوتيوب', async () => {
    const videos = Array.from({ length: 120 }, (_, i) => video(i + 1, { title: i % 2 ? `Lesson ${i}` : `درس ${i}` }));
    const reply = {
      concept: concept(),
      courseTitle: 'كورس طويل',
      courseDescription: 'و',
      modules: [
        { title: 'أ', description: '', firstIndex: 0, lastIndex: 59 },
        { title: 'ب', description: '', firstIndex: 55, lastIndex: 100 }, // تداخل يُتجاهل
      ],
    };
    const { deps, calls, pathId, request } = await setup(videos, reply);
    const result = await new ImportPlaylistUseCase(deps).execute(request);
    expect(result).toMatchObject({ lessons: 120, skipped: 0, modules: 3 });
    expect(calls).toHaveLength(1);

    const course = (await pathOf(deps, pathId)).courses[0]!;
    expect(course.modules.map((m) => m.lessonsCount)).toEqual([60, 41, 19]);
    expect(course.modules[2]!.title).toBe('دروس إضافية');
    const first = course.modules[0]!.lessons;
    expect(first[0]!.title).toBe('درس 0');
    expect(first[1]!.language).toBe('en');
  });

  it('إكمال كورس موجود: يضيف الناقص فقط في وحدة تكملة بلا نموذج ولا تكرار', async () => {
    const videos = Array.from({ length: 5 }, (_, i) => video(i + 1));
    const { deps, calls, pathId, request } = await setup(videos.slice(0, 3), answer({ modules: [{ title: 'م', description: '', lessons: [lesson(0), lesson(1), lesson(2)] }] }));
    await new ImportPlaylistUseCase(deps).execute(request);
    const courseId = (await pathOf(deps, pathId)).courses[0]!.id;

    (deps as { playlists: unknown }).playlists = { listVideos: async () => videos };
    const result = await new ImportPlaylistUseCase(deps).execute({ ...request, courseId });
    expect(result).toMatchObject({ lessons: 2, modules: 1, skipped: 3, newConcept: false });
    expect(calls).toHaveLength(1);

    const course = (await pathOf(deps, pathId)).courses[0]!;
    expect(course.modules.map((m) => m.title)).toEqual(['م', 'تكملة القائمة']);
    expect(course.lessonsCount).toBe(5);
    await expect(new ImportPlaylistUseCase(deps).execute({ ...request, courseId })).rejects.toThrow('مكتمل');
    await expect(new ImportPlaylistUseCase(deps).execute({ ...request, courseId: 'nope' })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('يعيد استعمال مفهوم المسار بالمعرّف أو بالاسم، ولا يرى مفاهيم مسار آخر', async () => {
    const { deps, pathId, request } = await setup([video(1), video(2), video(3)], null);
    const existing = new Concept({ id: createConceptId('c1'), pathId: createPathId(pathId), name: 'النظام الثنائي', description: '', level: 1 });
    const foreign = new Concept({ id: createConceptId('x1'), pathId: createPathId('other'), name: 'غريب', description: '', level: 1 });
    await deps.concepts.save(existing);
    await deps.concepts.save(foreign);

    const byId = new ImportPlaylistUseCase({ ...deps, llm: { generateJson: async () => answer({ concept: concept({ existingId: 'c1', name: '' }) }) } });
    expect(await byId.execute(request)).toMatchObject({ conceptName: 'النظام الثنائي', newConcept: false });

    const byName = new ImportPlaylistUseCase({
      ...deps,
      playlists: { listVideos: async () => [video(7)] },
      llm: { generateJson: async () => answer({ concept: concept({ name: ' النظام الثنائي ' }), modules: [{ title: 'و', description: '', lessons: [lesson(0)] }] }) },
    });
    expect(await byName.execute(request)).toMatchObject({ newConcept: false });

    // معرّف مفهوم من مسار آخر لا يُقبل: يُنشأ مفهوم جديد باسمه
    const viaForeignId = new ImportPlaylistUseCase({
      ...deps,
      playlists: { listVideos: async () => [video(8)] },
      llm: { generateJson: async () => answer({ concept: concept({ existingId: 'x1', name: 'جديد' }), modules: [{ title: 'و', description: '', lessons: [lesson(0)] }] }) },
    });
    expect(await viaForeignId.execute(request)).toMatchObject({ conceptName: 'جديد', newConcept: true });

    expect(conceptsOf(deps).filter((c) => c.pathId === pathId).map((c) => c.name).sort()).toEqual(['النظام الثنائي', 'جديد']);
    expect((await pathOf(deps, pathId)).courses.map((c) => c.orderIndex)).toEqual([1, 2, 3]);
  });

  it('متطلبات المفهوم الجديد من مفاهيم المسار فقط', async () => {
    const { deps, pathId, request } = await setup([video(1)], null);
    await deps.concepts.save(new Concept({ id: createConceptId('c1'), pathId: createPathId(pathId), name: 'أساس', description: '', level: 1 }));
    await deps.concepts.save(new Concept({ id: createConceptId('x1'), pathId: createPathId('other'), name: 'غريب', description: '', level: 1 }));
    const useCase = new ImportPlaylistUseCase({
      ...deps,
      llm: { generateJson: async () => answer({ concept: concept({ prerequisites: ['c1', 'x1', 'مجهول'] }), modules: [{ title: 'و', description: '', lessons: [lesson(0)] }] }) },
    });
    await useCase.execute(request);
    const created = conceptsOf(deps).find((c) => c.name === 'أنظمة العد')!;
    expect(created.prerequisiteIds).toEqual(['c1']);
  });

  it('لا يضيّع فيديو لم يسنده النموذج: يدخل وحدة «دروس إضافية» داخل الكورس', async () => {
    const { deps, pathId, request } = await setup([video(1), video(2), video(3)], {
      ...answer(),
      modules: [{ title: 'و', description: '', lessons: [lesson(0), lesson(0), lesson(9)] }],
    });
    await new ImportPlaylistUseCase(deps).execute(request);
    const modules = (await pathOf(deps, pathId)).courses[0]!.modules;
    expect(modules.map((m) => [m.title, m.orderIndex, m.lessons.length])).toEqual([['و', 1, 1], ['دروس إضافية', 2, 2]]);
    expect(modules[1]?.lessons.map((l) => l.title)).toEqual(['فيديو 2 🔥', 'فيديو 3 🔥']);
  });

  it('يتجاوز المكرر والفيديو بلا مدة، وإعادة الاستيراد لا تضاعف الدروس', async () => {
    const { deps, request } = await setup([video(1), video(2, { durationSeconds: 0 })], answer({ modules: [{ title: 'و', description: '', lessons: [lesson(0)] }] }));
    const useCase = new ImportPlaylistUseCase(deps);
    expect(await useCase.execute(request)).toMatchObject({ lessons: 1, skipped: 1 });
    await expect(useCase.execute(request)).rejects.toThrow('لا فيديوهات جديدة');
  });

  it('يعيد المحاولة مرة واحدة عند JSON أو بنية تالفة فقط', async () => {
    const run = async (fails: number, error: Error) => {
      const { deps, request } = await setup([video(1)], null);
      let calls = 0;
      const useCase = new ImportPlaylistUseCase({
        ...deps,
        llm: {
          generateJson: async () => {
            if (calls++ < fails) throw error;
            return answer({ modules: [{ title: 'و', description: '', lessons: [lesson(0)] }] });
          },
        },
      });
      const outcome = await useCase.execute(request).then((r) => r, (e: Error) => e);
      return { outcome, calls };
    };

    const recovered = await run(1, new Error('ردّ النموذج ليس JSON صالحًا'));
    expect(recovered.outcome).toMatchObject({ lessons: 1 });
    expect(recovered.calls).toBe(2);

    const giveUp = await run(2, new Error('ردّ النموذج ليس JSON صالحًا'));
    expect(giveUp.outcome).toBeInstanceOf(Error);
    expect((giveUp.outcome as Error).message).toContain('تعذّر ترتيب');
    expect(giveUp.calls).toBe(2);

    const rateLimited = await run(1, new Error('429'));
    expect((rateLimited.outcome as Error).message).toContain('429');
    expect(rateLimited.calls).toBe(1);
  });

  it('يفشل برسالة واضحة إن تعذّر النموذج أو لم يحدد مفهومًا، ولا يحفظ شيئًا', async () => {
    const down = await setup([video(1)], new Error('429'));
    await expect(new ImportPlaylistUseCase(down.deps).execute(down.request)).rejects.toThrow('تعذّر ترتيب القائمة');
    expect((await pathOf(down.deps, down.pathId)).courses).toHaveLength(0);

    const noConcept = await setup([video(1)], answer({ concept: concept({ name: '' }) }));
    await expect(new ImportPlaylistUseCase(noConcept.deps).execute(noConcept.request)).rejects.toThrow('المفهوم');
    expect(conceptsOf(noConcept.deps)).toHaveLength(0);
  });

  it('يمنع غير المدير ولا يستدعي النموذج، ويرفض رابطًا خاطئًا ومسارًا مجهولًا', async () => {
    const { deps, calls, request } = await setup([video(1)], answer());
    const useCase = new ImportPlaylistUseCase(deps);
    await expect(useCase.execute({ ...request, actor: { id: 'u2', email: 'x@x.com' } })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(useCase.execute({ ...request, playlistUrl: 'https://youtu.be/qTVRs1wTwho' })).rejects.toThrow('قائمة');
    await expect(useCase.execute({ ...request, pathId: 'nope' })).rejects.toBeInstanceOf(NotFoundError);
    expect(calls).toHaveLength(0);
  });
});

describe('parsePlaylistStructure', () => {
  it('يُهمل العنصر المعيب ويرفض ردًّا بلا مفهوم أو وحدات', () => {
    const parsed = parsePlaylistStructure({
      concept: { name: 'أ', level: 99, prerequisites: ['a', 3] },
      courseTitle: 'ك',
      modules: [{ title: 'و', lessons: [{ index: 'x' }, lesson(1, { language: 'fr' })] }, { title: 'فارغة', lessons: [] }],
    });
    expect(parsed.concept).toMatchObject({ name: 'أ', level: 10, prerequisites: ['a'] });
    expect(parsed.modules).toHaveLength(1);
    expect(parsed.modules[0]?.lessons[0]?.language).toBe('ar');
    expect(() => parsePlaylistStructure({ concept: {}, modules: [] })).toThrow('غير صالح');
    expect(() => parsePlaylistStructure({})).toThrow('غير صالح');
  });
});
