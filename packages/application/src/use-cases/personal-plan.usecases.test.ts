import { describe, expect, it } from 'vitest';
import {
  LearningEvent,
  LearningPath,
  Lesson,
  Module,
  VideoSegment,
  createLessonId,
  createModuleId,
  createPathId,
  type PathId,
} from '@qalam/domain';
import type { LlmClient } from '../ports/llm-client.port.js';
import {
  BuildPersonalPlanUseCase,
  ChangePlanPathUseCase,
  EditPersonalPlanUseCase,
  RevisePersonalPlanUseCase,
  GetPersonalPlanUseCase,
  StartOnboardingUseCase,
  pickPathByKeywords,
} from './personal-plan.usecases.js';
import { addModule } from '../test-support/path-builder.js';

function makePath(id: string, title: string, lessonTitles: string[], minutes = 10): LearningPath {
  const path = new LearningPath({ id: createPathId(id), title, description: `وصف ${title}`, targetGoal: 'هدف', subject: 'عام' });
  const module = new Module({ id: createModuleId(`${id}-m`), title: 'وحدة', description: '', orderIndex: 1 });
  lessonTitles.forEach((t, i) =>
    module.addLesson(
      new Lesson({
        id: createLessonId(`${id}-l${i + 1}`),
        title: t,
        segment: new VideoSegment({ videoId: 'abcdefghijk', startSeconds: 0, endSeconds: minutes * 60 }),
        sourceUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
        channelName: 'قناة',
      }),
    ),
  );
  addModule(path, module);
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

describe('تعديل الخطة بعد إنشائها', () => {
  async function planned(llm?: LlmClient) {
    const s = setup(llm);
    await new StartOnboardingUseCase(s.deps).execute(request);
    await new BuildPersonalPlanUseCase({ ...s.deps, llm: undefined }).execute({ userId: 'u1' });
    return s;
  }
  const lessonsOf = async (deps: ReturnType<typeof setup>['deps']) =>
    (await new GetPersonalPlanUseCase(deps).execute({ userId: 'u1' }))?.plan?.weeks.map((w) => w.lessons.map((l) => l.id));

  it('المحادثة: يعيد ترتيب الدروس، يصحّح ما أخطأ فيه النموذج، ويسجّل الردّ والساعات', async () => {
    const llm: LlmClient = {
      generateJson: async () => ({
        reply: 'نقلت الدوال إلى البداية.',
        changed: true,
        hoursPerWeek: 2,
        pathId: '',
        // معرّف مختلق ومكرر، ودرس «الحلقات» غير مذكور: يخرج من الخطة
        weeks: [
          { title: 'بداية', focus: 'نبدأ بالدوال', lessonIds: ['py-l4', 'fake', 'py-l1'] },
          { title: 'ثم', focus: 'الباقي', lessonIds: ['py-l1', 'py-l2'] },
        ],
      }),
    };
    const { deps, events } = await planned(llm);
    const out = await new RevisePersonalPlanUseCase(deps).execute({ userId: 'u1', message: 'ابدأ بالدوال' });
    expect(out.changed).toBe(true);
    expect(out.reply).toContain('نقلت الدوال إلى البداية.');
    // «الحلقات» لم يذكرها النموذج فخرجت من الخطة (الحذف فعلي)، والمعرّف المختلق والمكرر أُسقطا
    expect(await lessonsOf(deps)).toEqual([['py-l4', 'py-l1'], ['py-l2']]);
    const view = await new GetPersonalPlanUseCase(deps).execute({ userId: 'u1' });
    expect(view?.goal.hoursPerWeek).toBe(2);
    expect(view?.revisions).toMatchObject([{ kind: 'chat', request: 'ابدأ بالدوال', changed: true }]);
    expect(view?.catalog.courses.flatMap((c) => c.lessons).find((l) => l.id === 'py-l3')?.state).toBe('out');
    expect(events.filter((e) => e.type === 'goal_set')).toHaveLength(2);
  });

  it('ادّعاء النموذج بالتغيير دون تغيير فعلي لا يُحسب تغييرًا', async () => {
    const { deps } = await planned();
    const same = (await new GetPersonalPlanUseCase(deps).execute({ userId: 'u1' }))!.plan!.weeks.map((w) => ({ title: w.title, focus: w.focus, lessonIds: w.lessons.map((l) => l.id) }));
    const out = await new RevisePersonalPlanUseCase({ ...deps, llm: { generateJson: async () => ({ reply: 'تم', changed: true, hoursPerWeek: 0, pathId: '', weeks: same }) } }).execute({ userId: 'u1', message: 'عدّل' });
    expect(out.changed).toBe(false);
    expect(out.reply).toContain('لم يتغير شيء فعليًا');
  });

  it('المحادثة تغيّر المسار كله فتُبنى الخطة من دروسه', async () => {
    const llm: LlmClient = { generateJson: async () => ({ reply: 'انتقلنا للمواقع.', changed: true, hoursPerWeek: 0, pathId: 'web', weeks: [] }) };
    const { deps } = await planned(llm);
    expect((await new RevisePersonalPlanUseCase(deps).execute({ userId: 'u1', message: 'أريد تطوير المواقع بدل بايثون' })).changed).toBe(true);
    const view = await new GetPersonalPlanUseCase(deps).execute({ userId: 'u1' });
    expect(view?.goal.pathId).toBe('web');
    expect(await lessonsOf(deps)).toEqual([['web-l1', 'web-l2']]);
  });

  it('طلب غير تعديلي (changed=false): تبقى الخطة كما هي ويُسجَّل الردّ فقط', async () => {
    const llm: LlmClient = { generateJson: async () => ({ reply: 'الدوال تأتي بعد الحلقات.', changed: false, hoursPerWeek: 0, pathId: '', weeks: [] }) };
    const { deps } = await planned(llm);
    const before = await lessonsOf(deps);
    expect(await new RevisePersonalPlanUseCase(deps).execute({ userId: 'u1', message: 'لماذا الدوال أخيرًا؟' })).toMatchObject({ changed: false });
    expect(await lessonsOf(deps)).toEqual(before);
  });

  it('يرفض الرسالة الفارغة، وغياب النموذج، وفشله برسالة واضحة', async () => {
    const { deps } = await planned({ generateJson: async () => { throw new Error('x'); } });
    await expect(new RevisePersonalPlanUseCase(deps).execute({ userId: 'u1', message: '  ' })).rejects.toThrow('اكتب');
    await expect(new RevisePersonalPlanUseCase(deps).execute({ userId: 'u1', message: 'غيّر' })).rejects.toThrow('تعذّر الوصول');
    await expect(new RevisePersonalPlanUseCase({ ...deps, llm: undefined }).execute({ userId: 'u1', message: 'غيّر' })).rejects.toThrow('غير متاح');
  });

  it('التعديل اليدوي: يعيد توزيع الدروس ويحفظ العناوين، ويلحق المنسي بآخر أسبوع', async () => {
    const { deps } = await planned();
    await new EditPersonalPlanUseCase(deps).execute({
      userId: 'u1',
      weeks: [
        { title: 'أولًا', focus: 'وصفي', lessonIds: ['py-l2'] },
        { title: 'ثانيًا', focus: '', lessonIds: ['py-l1'] },
      ],
    });
    expect(await lessonsOf(deps)).toEqual([['py-l2'], ['py-l1', 'py-l3', 'py-l4']]);
    const view = await new GetPersonalPlanUseCase(deps).execute({ userId: 'u1' });
    expect(view?.plan?.weeks[0]).toMatchObject({ title: 'أولًا', focus: 'وصفي' });
    expect(view?.revisions[0]?.kind).toBe('manual');
    await expect(new EditPersonalPlanUseCase(deps).execute({ userId: 'u1', weeks: [{ title: 'ع'.repeat(81), focus: '', lessonIds: [] }] })).rejects.toThrow('طويل');
  });

  it('التعديل اليدوي: اختيار الدروس والساعات والتوزيع التلقائي، وتغيير المسار', async () => {
    const { deps } = await planned();
    const edit = new EditPersonalPlanUseCase(deps);
    // درسان فقط وساعتان وتوزيع تلقائي
    expect(await edit.execute({ userId: 'u1', includeLessonIds: ['py-l2', 'py-l4'], hoursPerWeek: 1, redistribute: true, weeks: [] })).toEqual({ weeks: 1, lessons: 2 });
    expect(await lessonsOf(deps)).toEqual([['py-l2', 'py-l4']]);
    // إضافة درس كان خارج الخطة
    await edit.execute({ userId: 'u1', includeLessonIds: ['py-l1', 'py-l2', 'py-l4'], weeks: [{ title: 'الكل', focus: '', lessonIds: ['py-l1', 'py-l2', 'py-l4'] }] });
    expect(await lessonsOf(deps)).toEqual([['py-l1', 'py-l2', 'py-l4']]);
    await expect(edit.execute({ userId: 'u1', includeLessonIds: [], weeks: [] })).rejects.toThrow('درسًا واحدًا');
    await expect(edit.execute({ userId: 'u1', hoursPerWeek: 99, weeks: [] })).rejects.toThrow('الساعات');

    await expect(new ChangePlanPathUseCase(deps).execute({ userId: 'u1', pathId: 'py' })).rejects.toThrow('الحالي');
    await expect(new ChangePlanPathUseCase(deps).execute({ userId: 'u1', pathId: 'nope' })).rejects.toThrow('غير متاح');
    expect(await new ChangePlanPathUseCase(deps).execute({ userId: 'u1', pathId: 'web' })).toEqual({ pathTitle: 'تطوير المواقع' });
    expect(await lessonsOf(deps)).toEqual([['web-l1', 'web-l2']]);
  });
});
