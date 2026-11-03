import { describe, expect, it } from 'vitest';
import { AdminPolicy, type Concept, type LearningPath, type PathId, type TranscriptSegment } from '@qalam/domain';
import type { TranscriptSourcePort, TranscriptStorePort } from '../ports/transcript.port.js';
import { AddLessonUseCase } from './admin/admin-lessons.usecases.js';
import { seedPathWithModule } from '../test-support/admin-seed.js';
import { FetchTranscriptsUseCase } from './fetch-transcripts.usecases.js';

const admin = { id: 'u1', email: 'owner@qalam.dev' };
const seg: TranscriptSegment[] = [{ startSeconds: 0, text: 'نص' }];

class Paths {
  store = new Map<string, LearningPath>();
  save = async (p: LearningPath) => void this.store.set(p.id, p);
  delete = async (id: PathId) => void this.store.delete(id);
  findById = async (id: PathId) => this.store.get(id) ?? null;
  findBySubject = async () => [...this.store.values()];
  findAll = async () => [...this.store.values()];
}

async function setup(videoIds: string[]) {
  let n = 0;
  const concepts = new Map<string, Concept>();
  const deps = {
    paths: new Paths(),
    concepts: {
      save: async (c: Concept) => void concepts.set(c.id, c),
      findById: async (id: string) => concepts.get(id) ?? null,
      findAll: async () => [...concepts.values()],
      findByPath: async () => [...concepts.values()],
      delete: async (id: string) => void concepts.delete(id),
    } as never,
    ids: { next: (prefix: string) => `${prefix}-${++n}` },
    policy: AdminPolicy.fromList('owner@qalam.dev'),
  };
  const { pathId, moduleId } = await seedPathWithModule(deps, admin);
  for (const id of videoIds) {
    await new AddLessonUseCase(deps).execute({
      actor: admin, pathId, moduleId, title: id, videoUrl: id, start: '0', end: '300', channelName: 'ق', language: 'ar', summary: '',
    });
  }
  const saved = new Map<string, TranscriptSegment[]>();
  const store: TranscriptStorePort = {
    find: async (id) => saved.get(id) ?? null,
    save: async (id, s) => void saved.set(id, s),
  };
  return { paths: deps.paths, pathId, saved, store };
}

const noSleep = async () => undefined;

describe('FetchTranscriptsUseCase', () => {
  it('يجلب ويخزن، ويتخطى المحفوظ، ويبلّغ عن الفيديو بلا نص', async () => {
    const { paths, pathId, saved, store } = await setup(['aaaaaaaaaaa', 'bbbbbbbbbbb', 'ccccccccccc']);
    saved.set('aaaaaaaaaaa', seg);
    const source: TranscriptSourcePort = { fetch: async (id) => (id === 'bbbbbbbbbbb' ? seg : null) };
    const result = await new FetchTranscriptsUseCase({ paths, source, store }, noSleep).execute({ pathId });
    expect(result).toEqual({ fetched: 1, skipped: 1, unavailable: 1, failures: [], stoppedEarly: false });
    expect(saved.has('bbbbbbbbbbb')).toBe(true);
    expect(saved.has('ccccccccccc')).toBe(false);
  });

  it('يتوقف بعد 3 إخفاقات متتالية ولا يُلحّ على يوتيوب', async () => {
    const ids = ['aaaaaaaaaaa', 'bbbbbbbbbbb', 'ccccccccccc', 'ddddddddddd', 'eeeeeeeeeee'];
    const { paths, store } = await setup(ids);
    let calls = 0;
    const source: TranscriptSourcePort = { fetch: async () => { calls += 1; throw new Error('رفض'); } };
    const result = await new FetchTranscriptsUseCase({ paths, source, store }, noSleep).execute();
    expect(calls).toBe(3);
    expect(result.failures).toHaveLength(3);
    expect(result.stoppedEarly).toBe(true);
  });

  it('يتأخر بين الفيديوهات لا قبل الأول', async () => {
    const { paths, store } = await setup(['aaaaaaaaaaa', 'bbbbbbbbbbb', 'ccccccccccc']);
    const waits: number[] = [];
    const source: TranscriptSourcePort = { fetch: async () => seg };
    await new FetchTranscriptsUseCase({ paths, source, store }, async (ms) => void waits.push(ms)).execute({ delayMs: 7 });
    expect(waits).toEqual([7, 7]);
  });
});
