import { describe, expect, it } from 'vitest';
import {
  Concept,
  LearningEvent,
  LearningPath,
  Lesson,
  Module,
  VideoSegment,
  createConceptId,
  createLessonId,
  createModuleId,
  createPathId,
} from '@qalam/domain';
import type { ConceptRepositoryPort } from '../ports/concept-repository.port.js';
import type { EventReaderPort } from '../ports/event-reader.port.js';
import type { PathRepositoryPort } from '../ports/path-repository.port.js';
import {
  GetConceptMapUseCase,
  GetLearnerDashboardUseCase,
  SearchLessonLibraryUseCase,
  type AdviceSource,
} from './catalog.usecases.js';
import { addCourseWithModule } from '../test-support/path-builder.js';

function pathOf(id: string, title: string, lessons: { id: string; title: string; concept: string; channel: string }[]) {
  const path = new LearningPath({ id: createPathId(id), title, description: '', targetGoal: 'هدف', subject: 'عام' });
  const modules = new Map<string, Module>();
  for (const l of lessons) {
    const module =
      modules.get(l.concept) ??
      new Module({ id: createModuleId(`${id}-m-${l.concept}`), title: 'الوحدة الأولى', description: '', orderIndex: 1 });
    modules.set(l.concept, module);
    module.addLesson(
      new Lesson({
        id: createLessonId(l.id),
        title: l.title,
        segment: new VideoSegment({ videoId: 'abcdefghijk', startSeconds: 0, endSeconds: 120 }),
        sourceUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
        channelName: l.channel,
      }),
    );
  }
  for (const [concept, module] of modules) addCourseWithModule(path, module, concept);
  return path;
}

const p1 = pathOf('p1', 'أساسيات الحاسوب', [
  { id: 'a', title: 'ما هو المعالج؟', concept: 'cpu', channel: 'قناة أ' },
  { id: 'b', title: 'الذاكرة العشوائية', concept: 'ram', channel: 'قناة ب' },
]);
const p2 = pathOf('p2', 'بايثون', [{ id: 'c', title: 'المتغيرات', concept: 'vars', channel: 'قناة أ' }]);

const paths: PathRepositoryPort = {
  save: async () => {},
  delete: async () => {},
  findById: async () => null,
  findBySubject: async () => [],
  findAll: async () => [p1, p2],
};

describe('SearchLessonLibraryUseCase (مكتبة الدروس)', () => {
  const library = new SearchLessonLibraryUseCase(paths);

  it('يعيد كل الدروس عبر المسارات مع قائمة المسارات والقنوات', async () => {
    const result = await library.execute();
    expect(result.lessons.map((l) => l.lessonId)).toEqual(['a', 'b', 'c']);
    expect(result.paths).toHaveLength(2);
    expect(result.channels).toEqual(['قناة أ', 'قناة ب']);
  });

  it('يضع معرّف يوتيوب لكل درس ليعرض الواجهة مصغّرته الرسمية', async () => {
    const result = await library.execute();
    expect(result.lessons.every((l) => l.youtubeVideoId === 'abcdefghijk')).toBe(true);
  });

  it('يبحث بالعنوان متجاهلًا الهمزات والتشكيل', async () => {
    const result = await library.execute({ query: 'المُعالِج' });
    expect(result.lessons.map((l) => l.lessonId)).toEqual(['a']);
    expect((await library.execute({ query: 'الذاكره' })).lessons).toEqual([]);
  });

  it('يصفّي بالمسار والقناة معًا', async () => {
    const result = await library.execute({ pathId: 'p1', channel: 'قناة ب' });
    expect(result.lessons.map((l) => l.lessonId)).toEqual(['b']);
  });
});

describe('GetConceptMapUseCase (خريطة المفاهيم)', () => {
  const concept = (id: string, name: string, level: number, pre: string[] = []) =>
    new Concept({ id: createConceptId(id), pathId: createPathId('p1'), name, description: '', level, prerequisiteIds: pre.map(createConceptId) });
  const repo = (items: Concept[]): ConceptRepositoryPort => ({
    save: async () => {},
    findById: async () => null,
    findAll: async () => items,
    findByPath: async () => items,
    delete: async () => {},
  });

  it('يجمّع بالمستوى ويربط المتطلبات والدروس', async () => {
    const map = await new GetConceptMapUseCase(
      repo([concept('ram', 'الذاكرة', 2, ['cpu']), concept('cpu', 'المعالج', 1)]),
      paths,
    ).execute();
    expect(map.total).toBe(2);
    expect(map.levels.map((l) => l.level)).toEqual([1, 2]);
    const ram = map.levels[1]!.concepts[0]!;
    expect(ram.prerequisites).toEqual([{ id: 'cpu', name: 'المعالج' }]);
    expect(ram.lessons).toEqual([{ id: 'b', title: 'الذاكرة العشوائية', pathId: 'p1' }]);
  });

  it('يعرض معرّف متطلب محذوف بدل أن ينهار', async () => {
    const map = await new GetConceptMapUseCase(repo([concept('ram', 'الذاكرة', 2, ['gone'])]), paths).execute();
    expect(map.levels[0]!.concepts[0]!.prerequisites[0]!.name).toBe('gone');
  });
});

describe('GetLearnerDashboardUseCase (لوحة المتعلم)', () => {
  const done = (lessonId: string) =>
    new LearningEvent({ userId: 'u1', type: 'lesson_completed', payload: { lessonId }, occurredAt: new Date() });
  const events = (list: LearningEvent[]): EventReaderPort => ({ listByUser: async () => list });

  function agentSpy(action: 'proceed' | 'review_lesson') {
    const asked: string[] = [];
    const agent: AdviceSource = {
      run: async ({ pathId }) => {
        asked.push(pathId);
        return {
          decision: { action, lessonId: 'a', reason: 'سبب', consecutiveFailures: 0, evidenceKey: 'k' },
          lessonTitle: 'ما هو المعالج؟',
          isNew: true,
        } as never;
      },
    };
    return { agent, asked };
  }

  it('يحسب المجاميع ولا يستدعي الوكيل إلا للمسارات المبدوءة', async () => {
    const { agent, asked } = agentSpy('proceed');
    const dash = await new GetLearnerDashboardUseCase(paths, events([done('a')]), agent).execute({ userId: 'u1' });
    expect(dash.totals).toMatchObject({ pathsStarted: 1, lessonsCompleted: 1, lessonsTotal: 3, quizAveragePercent: null });
    expect(asked).toEqual(['p1']);
    expect(dash.continueWith?.path.id).toBe('p1');
    expect(dash.attention).toEqual([]);
  });

  it('يضع اقتراحات المراجعة في «تحتاج انتباهك»', async () => {
    const { agent } = agentSpy('review_lesson');
    const dash = await new GetLearnerDashboardUseCase(paths, events([done('a')]), agent).execute({ userId: 'u1' });
    expect(dash.attention.map((e) => e.path.id)).toEqual(['p1']);
  });

  it('متعلم جديد: لا مسارات مبدوءة ولا متابعة', async () => {
    const { agent, asked } = agentSpy('proceed');
    const dash = await new GetLearnerDashboardUseCase(paths, events([]), agent).execute({ userId: 'u1' });
    expect(dash.totals.pathsStarted).toBe(0);
    expect(dash.continueWith).toBeNull();
    expect(asked).toEqual([]);
  });
});
