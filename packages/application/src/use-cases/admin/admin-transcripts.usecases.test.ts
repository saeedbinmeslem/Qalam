import { describe, expect, it } from 'vitest';
import { AdminPolicy, type Concept, type LearningPath, type PathId, type TranscriptSegment } from '@qalam/domain';
import { ForbiddenError } from '../../errors.js';
import { seedPathWithModule } from '../../test-support/admin-seed.js';
import { AddLessonUseCase } from './admin-lessons.usecases.js';
import {
  CountCourseTranscriptsUseCase,
  FetchCourseTranscriptsUseCase,
  type TranscriptAdminDeps,
} from './admin-transcripts.usecases.js';

const admin = { id: 'u1', email: 'owner@qalam.dev' };
const seg: TranscriptSegment[] = [{ startSeconds: 0, text: 'نص' }];

async function setup(videoIds: string[], stored: string[] = []) {
  let n = 0;
  const paths = new Map<string, LearningPath>();
  const concepts = new Map<string, Concept>();
  const saved = new Map<string, TranscriptSegment[]>(stored.map((id) => [id, seg]));
  const deps: TranscriptAdminDeps = {
    paths: {
      save: async (p: LearningPath) => void paths.set(p.id, p),
      delete: async (id: PathId) => void paths.delete(id),
      findById: async (id: PathId) => paths.get(id) ?? null,
      findBySubject: async () => [...paths.values()],
      findAll: async () => [...paths.values()],
    },
    concepts: {
      save: async (c: Concept) => void concepts.set(c.id, c),
      findById: async (id: string) => concepts.get(id) ?? null,
      findAll: async () => [...concepts.values()],
      findByPath: async () => [...concepts.values()],
      delete: async (id: string) => void concepts.delete(id),
    } as never,
    ids: { next: (prefix) => `${prefix}-${++n}` },
    policy: AdminPolicy.fromList('owner@qalam.dev'),
    transcriptSource: { fetch: async () => seg },
    transcriptStore: {
      find: async (id) => saved.get(id) ?? null,
      existing: async (ids) => new Set(ids.filter((id) => saved.has(id))),
      save: async (id, s) => void saved.set(id, s),
    },
  };
  const { pathId, moduleId, courseId } = await seedPathWithModule(deps, admin);
  for (const id of videoIds) {
    await new AddLessonUseCase(deps).execute({
      actor: admin, pathId, moduleId, title: id, videoUrl: id, start: '0', end: '300', channelName: 'ق', language: 'ar', summary: '',
    });
  }
  return { deps, pathId, courseId, saved };
}

describe('نصوص الكورس المفرّغة في لوحة التحكم', () => {
  it('يعدّ دروس الكورس ذات النص المحفوظ', async () => {
    const { deps, pathId, courseId } = await setup(['aaaaaaaaaaa', 'bbbbbbbbbbb', 'ccccccccccc'], ['aaaaaaaaaaa']);
    expect(await new CountCourseTranscriptsUseCase(deps).execute({ actor: admin, pathId, courseId })).toEqual({
      total: 3,
      stored: 1,
    });
  });

  it('يجلب الناقص فقط ويحفظه', async () => {
    const { deps, pathId, courseId, saved } = await setup(['aaaaaaaaaaa', 'bbbbbbbbbbb'], ['aaaaaaaaaaa']);
    const result = await new FetchCourseTranscriptsUseCase(deps, async () => undefined).execute({ actor: admin, pathId, courseId });
    expect(result).toMatchObject({ fetched: 1, skipped: 1 });
    expect(saved.has('bbbbbbbbbbb')).toBe(true);
  });

  it('للمدير فقط', async () => {
    const { deps, pathId, courseId } = await setup(['aaaaaaaaaaa']);
    const stranger = { id: 'u2', email: 'x@x.com' };
    await expect(new CountCourseTranscriptsUseCase(deps).execute({ actor: stranger, pathId, courseId })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(new FetchCourseTranscriptsUseCase(deps).execute({ actor: stranger, pathId, courseId })).rejects.toBeInstanceOf(ForbiddenError);
  });
});
