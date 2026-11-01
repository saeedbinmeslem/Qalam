import { describe, expect, it } from 'vitest';
import { AdminPolicy, Concept, type ConceptId, type LearningPath, type PathId } from '@qalam/domain';
import { ForbiddenError } from '../../errors.js';
import type { ConceptRepositoryPort } from '../../ports/concept-repository.port.js';
import type { PlaylistVideo } from '../../ports/playlist-catalog.port.js';
import { CreatePathUseCase } from './admin-paths.usecases.js';
import { ImportVideosUseCase, type VideosImportDeps } from './admin-videos-import.usecases.js';

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
const ID_A = 'aaaaaaaaaaa';
const ID_B = 'bbbbbbbbbbb';
const media = 'https://res.cloudinary.com/demo/video/upload/v1700000000/qalam/clip.mp4';

const yt = (videoId: string, over: Partial<PlaylistVideo> = {}): PlaylistVideo => ({
  videoId,
  title: `درس ${videoId}`,
  channelName: 'قناة',
  durationSeconds: 300,
  description: '',
  ...over,
});

async function setup(catalog: PlaylistVideo[]) {
  let n = 0;
  const deps: VideosImportDeps = {
    paths: new Paths(),
    concepts: new Concepts(),
    ids: { next: (prefix) => `${prefix}-${++n}` },
    policy: AdminPolicy.fromList('owner@qalam.dev'),
    // الترتيب المعاكس عمدًا: يجب أن يحفظ الـuse case ترتيب المالك لا ترتيب يوتيوب
    videos: { getVideos: async () => [...catalog].reverse() },
    llm: { generateJson: async () => ({ titles: [] }) },
  };
  const { pathId } = await new CreatePathUseCase(deps).execute({ actor: admin, title: 'م', description: '', targetGoal: 'هدف', subject: 'ع' });
  return { deps, pathId };
}

describe('ImportVideosUseCase (فيديوهات مستقلة ككورس)', () => {
  it('يجمع روابط يوتيوب والمرفوع من الجهاز في كورس واحد بترتيب الإضافة ومفهوم جديد', async () => {
    const { deps, pathId } = await setup([yt(ID_A), yt(ID_B)]);
    const result = await new ImportVideosUseCase(deps).execute({
      actor: admin,
      pathId,
      courseTitle: 'كورس مختلط',
      items: [
        { kind: 'youtube', url: ID_B },
        { kind: 'upload', mediaUrl: media, title: 'من جهازي', durationSeconds: 61.2 },
        { kind: 'youtube', url: `https://youtu.be/${ID_A}` },
      ],
    });
    expect(result).toEqual({ courseTitle: 'كورس مختلط', conceptName: 'كورس مختلط', newConcept: true, lessons: 3 });

    const path = (await deps.paths.findById(pathId as PathId))!;
    const lessons = path.courses[0]!.modules[0]!.lessons;
    expect(lessons.map((l) => l.title)).toEqual([`درس ${ID_B}`, 'من جهازي', `درس ${ID_A}`]);
    expect(lessons[1]).toMatchObject({ mediaUrl: media, reviewedByHuman: false });
    expect(lessons[1]!.segment.endSeconds).toBe(62);
    expect(lessons[0]!.segment.endSeconds).toBe(300);
  });

  it('يستعمل مفهومًا موجودًا في المسار ويتجاوز المكرر', async () => {
    const { deps, pathId } = await setup([yt(ID_A)]);
    const uc = new ImportVideosUseCase(deps);
    await uc.execute({ actor: admin, pathId, courseTitle: 'الأول', items: [{ kind: 'youtube', url: ID_A }] });
    const [existing] = await deps.concepts.findByPath(pathId as PathId);

    const second = await uc.execute({
      actor: admin,
      pathId,
      courseTitle: 'الثاني',
      conceptId: existing!.id,
      items: [{ kind: 'youtube', url: ID_A }, { kind: 'upload', mediaUrl: media, title: 'ج', durationSeconds: 10 }],
    });
    expect(second).toMatchObject({ newConcept: false, lessons: 1 });
  });

  it('يرفض غير المدير وقائمة فارغة وعنوانًا فارغًا', async () => {
    const { deps, pathId } = await setup([]);
    const uc = new ImportVideosUseCase(deps);
    await expect(uc.execute({ actor: { id: 'x', email: 'a@b.c' }, pathId, courseTitle: 'ك', items: [] })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(uc.execute({ actor: admin, pathId, courseTitle: 'ك', items: [] })).rejects.toThrow();
    await expect(uc.execute({ actor: admin, pathId, courseTitle: ' ', items: [{ kind: 'youtube', url: ID_A }] })).rejects.toThrow();
  });
});
