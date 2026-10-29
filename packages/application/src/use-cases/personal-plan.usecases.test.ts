import { describe, expect, it } from 'vitest';
import {
  LearningEvent,
  LearningPath,
  Lesson,
  Module,
  VideoSegment,
  createConceptId,
  createLessonId,
  createModuleId,
  createPathId,
  type PathId,
} from '@qalam/domain';
import type { LlmClient } from '../ports/llm-client.port.js';
import {
  BuildPersonalPlanUseCase,
  GetPersonalPlanUseCase,
  StartOnboardingUseCase,
  pickPathByKeywords,
} from './personal-plan.usecases.js';

function makePath(id: string, title: string, lessonTitles: string[], minutes = 10): LearningPath {
  const path = new LearningPath({ id: createPathId(id), title, description: `وصف ${title}`, targetGoal: 'هدف', subject: 'عام' });
  const module = new Module({ id: createModuleId(`${id}-m`), title: 'وحدة', description: '', orderIndex: 1 });
  lessonTitles.forEach((t, i) =>
    module.addLesson(
      new Lesson({
        id: createLessonId(`${id}-l${i + 1}`),
        title: t,
        conceptId: createConceptId('c'),
        segment: new VideoSegment({ videoId: 'abcdefghijk', startSeconds: 0, endSeconds: minutes * 60 }),
        sourceUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
        channelName: 'قناة',
      }),
    ),
  );
  path.addModule(module);
  return path;
}

function setup(llm?: LlmClient) {
  const pathsById = new Map<string, LearningPath>([
    ['py', makePath('py', 'أساسيات بايثون', ['المتغيرات', 'الشروط', 'الحلقات', 'الدوال'])],
    ['web', makePath('web', 'تطوير المواقع', ['HTML', 'CSS'])],
  ]);
  const events: LearningEvent[] = [];
  const at = new Date('2026-11-01T10:00:00Z');
  let tick = 0;
  const deps = {
    paths: {
      save: async () => {},
      delete: async () => {},
      findById: async (id: PathId) => pathsById.get(id) ?? null,
      findBySubject: async () => [],
      findAll: async () => [...pathsById.values()],
    },
    events: {
      record: async (e: LearningEvent) => void events.push(e),
      listByUser: async (userId: string) => events.filter((e) => e.userId === userId),
    },
    clock: { now: () => new Date(at.getTime() + ++tick * 1000) },
    llm,
  };
  return { deps, events };
}

const request = { userId: 'u1', interest: 'أحب الألعاب', field: 'برمجة بايثون', level: 'beginner' as const, hoursPerWeek: 1 };

describe('StartOnboardingUseCase', () => {
  it('يأخذ اختيار النموذج إن كان مسارًا حقيقيًا ويسجّل الهدف', async () => {
    const llm: LlmClient = { generateJson: async () => ({ pathId: 'web', rationale: 'يناسب شغفك' }) };
    const { deps, events } = setup(llm);
    const out = await new StartOnboardingUseCase(deps).execute(request);
    expect(out).toMatchObject({ pathId: 'web', usedAi: true, rationale: 'يناسب شغفك' });
    expect(events[0]?.type).toBe('goal_set');
    expect(events[0]?.payload).toMatchObject({ field: 'برمجة بايثون', hoursPerWeek: 1, pathId: 'web' });
  });

  it('مسار وحيد: يُختار فورًا دون استدعاء النموذج', async () => {
    let calls = 0;
    const llm: LlmClient = { generateJson: async () => (calls++, { pathId: 'py', rationale: 'x' }) };
    const { deps } = setup(llm);
    const only = { ...deps, paths: { ...deps.paths, findAll: async () => [await deps.paths.findById('py' as PathId)] as LearningPath[] } };
    const out = await new StartOnboardingUseCase(only).execute(request);
    expect(out).toMatchObject({ pathId: 'py', usedAi: false });
    expect(calls).toBe(0);
  });

  it('يتجاهل مسارًا مختلقًا من النموذج ويعود للكلمات المفتاحية، وكذلك عند فشله أو غيابه', async () => {
    const invented: LlmClient = { generateJson: async () => ({ pathId: 'ghost', rationale: 'x' }) };
    const failing: LlmClient = { generateJson: async () => Promise.reject(new Error('503')) };
    for (const llm of [invented, failing, undefined]) {
      const { deps } = setup(llm);
      const out = await new StartOnboardingUseCase(deps).execute(request);
      expect(out.pathId).toBe('py');
      expect(out.usedAi).toBe(false);
      expect(out.rationale).toContain('أساسيات بايثون');
    }
  });

  it('يرفض مدخلات ناقصة وساعات غير صالحة', async () => {
    const { deps } = setup();
    const start = new StartOnboardingUseCase(deps);
    await expect(start.execute({ ...request, field: ' ' })).rejects.toThrow('المجال');
    await expect(start.execute({ ...request, hoursPerWeek: 0 })).rejects.toThrow('الساعات');
    await expect(start.execute({ ...request, level: 'x' as 'beginner' })).rejects.toThrow('مستواك');
  });
});

describe('pickPathByKeywords', () => {
  it('يطابق بالكلمات ويقع على الأول عند التعادل', () => {
    const paths = [makePath('a', 'تصميم', ['ألوان']), makePath('b', 'بايثون', ['حلقات'])];
    expect(pickPathByKeywords(paths, 'أريد تعلم بايثون').id).toBe('b');
    expect(pickPathByKeywords(paths, 'شيء آخر').id).toBe('a');
  });
});

describe('BuildPersonalPlanUseCase + GetPersonalPlanUseCase', () => {
  it('يبني خطة أسبوعية من الدروس المتبقية فقط، ويعرض الحالة والسجل', async () => {
    const { deps, events } = setup();
    await new StartOnboardingUseCase(deps).execute(request);
    // التشخيصي تخطّى «المتغيرات»، والمتعلم أكمل «الشروط» لاحقًا
    events.push(new LearningEvent({ userId: 'u1', type: 'plan_decision', payload: { decision: 'skip_lesson', pathId: 'py', lessonId: 'py-l1', reason: 'أتقنه' }, occurredAt: new Date() }));
    events.push(new LearningEvent({ userId: 'u1', type: 'lesson_completed', payload: { lessonId: 'py-l2' }, occurredAt: new Date('2026-11-02') }));

    const built = await new BuildPersonalPlanUseCase(deps).execute({ userId: 'u1' });
    expect(built.weeks).toBe(1); // درسان بـ20 د لكل منهما = 40 د < 60 د

    const view = await new GetPersonalPlanUseCase(deps).execute({ userId: 'u1' });
    expect(view?.goal.pathId).toBe('py');
    expect(view?.plan?.weeks).toHaveLength(1);
    expect(view?.plan?.weeks[0]?.lessons).toEqual([
      { id: 'py-l3', title: 'الحلقات', status: 'next' },
      { id: 'py-l4', title: 'الدوال', status: 'upcoming' },
    ]);
    expect(view?.plan?.weeks[0]?.title).toBe('الأسبوع 1');
    expect(view?.progress).toMatchObject({ completedCount: 1, skippedCount: 1, totalCount: 4, percent: 50 });
    expect(view?.next?.id).toBe('py-l3');
    expect(view?.history.map((h) => h.title)).toEqual(['الشروط']);
  });

  it('عناوين الأسابيع من النموذج تُقبل إن صحّت، ويُهمل أسبوع مختلق', async () => {
    const llm: LlmClient = {
      generateJson: async (r) =>
        r.schema['required'] && (r.schema['required'] as string[]).includes('summary')
          ? { summary: 'خطة موجزة', weeks: [{ week: 1, title: 'ابدأ بالأساس', focus: 'تبني القاعدة' }, { week: 9, title: 'وهمي', focus: 'x' }] }
          : { pathId: 'py', rationale: 'مناسب' },
    };
    const { deps } = setup(llm);
    await new StartOnboardingUseCase(deps).execute(request);
    await new BuildPersonalPlanUseCase(deps).execute({ userId: 'u1' });
    const view = await new GetPersonalPlanUseCase(deps).execute({ userId: 'u1' });
    expect(view?.plan).toMatchObject({ summary: 'خطة موجزة', usedAi: true });
    expect(view?.plan?.weeks.map((w) => w.title)).toEqual(['ابدأ بالأساس', 'الأسبوع 2']);
  });

  it('withAi=false يبني الخطة فورًا دون استدعاء النموذج للعناوين', async () => {
    let labelCalls = 0;
    const llm: LlmClient = {
      generateJson: async (r) => {
        if ((r.schema['required'] as string[]).includes('summary')) labelCalls++;
        return { pathId: 'py', rationale: 'مناسب' };
      },
    };
    const { deps } = setup(llm);
    await new StartOnboardingUseCase(deps).execute(request);
    await new BuildPersonalPlanUseCase(deps).execute({ userId: 'u1', withAi: false });
    expect(labelCalls).toBe(0);
    expect((await new GetPersonalPlanUseCase(deps).execute({ userId: 'u1' }))?.plan?.usedAi).toBe(false);
  });

  it('بلا تعارف: لا خطة، والبناء يرفض برسالة واضحة', async () => {
    const { deps } = setup();
    expect(await new GetPersonalPlanUseCase(deps).execute({ userId: 'nobody' })).toBeNull();
    await expect(new BuildPersonalPlanUseCase(deps).execute({ userId: 'nobody' })).rejects.toThrow('يشغفك');
  });
});
