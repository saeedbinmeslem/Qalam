import { describe, expect, it } from 'vitest';
import {
  AdminPolicy,
  Concept,
  createLessonId,
  parseStudyGuide,
  type ConceptId,
  type LearningPath,
  type PathId,
} from '@qalam/domain';
import { ForbiddenError } from '../../errors.js';
import type { LlmClient } from '../../ports/llm-client.port.js';
import { AddLessonUseCase, SetLessonReviewUseCase } from './admin-lessons.usecases.js';
import type { QuizAdminDeps } from './admin-quiz.usecases.js';
import { DraftLessonNotesUseCase } from './admin-quiz.usecases.js';
import {
  GenerateStudyGuideUseCase,
  SetStudyGuideUseCase,
  SummarizeLessonUseCase,
  parseGeneratedStudyGuide,
} from './admin-study-guide.usecases.js';
import { seedPathWithModule } from '../../test-support/admin-seed.js';

const admin = { id: 'u1', email: 'owner@qalam.dev' };
const stranger = { id: 'u2', email: 'x@x.com' };

const validGuide = {
  overview: 'يشرح الدرس الفرق بين البيانات والمعلومات.',
  sections: [
    { heading: 'البيانات', points: ['قيم خام', 'لا معنى لها وحدها'] },
    { heading: 'المعلومات', paragraphs: ['بيانات بعد معالجتها.'], points: ['لها سياق'] },
  ],
};

async function setup(answer: unknown = validGuide, withNotes = true) {
  let n = 0;
  const paths = new Map<string, LearningPath>();
  const concepts = new Map<string, Concept>();
  const llm: LlmClient = {
    generateJson: async () => {
      if (answer instanceof Error) throw answer;
      return answer;
    },
  };
  const deps = {
    paths: {
      save: async (p: LearningPath) => void paths.set(p.id, p),
      delete: async (id: PathId) => void paths.delete(id),
      findById: async (id: PathId) => paths.get(id) ?? null,
      findBySubject: async () => [...paths.values()],
      findAll: async () => [...paths.values()],
    },
    concepts: {
      save: async (c: Concept) => void concepts.set(c.id, c),
      findById: async (id: ConceptId) => concepts.get(id) ?? null,
      findAll: async () => [...concepts.values()],
      findByPath: async (pid: PathId) => [...concepts.values()].filter((c) => c.pathId === pid),
      delete: async (id: ConceptId) => void concepts.delete(id),
    },
    ids: { next: (prefix: string) => `${prefix}-${++n}` },
    policy: AdminPolicy.fromList('owner@qalam.dev'),
    questions: {} as QuizAdminDeps['questions'],
    llm,
  } satisfies QuizAdminDeps;
  const { pathId, moduleId } = await seedPathWithModule(deps, admin);
  const { lessonId } = await new AddLessonUseCase(deps).execute({
    actor: admin,
    pathId,
    moduleId,
    title: 'درس',
    videoUrl: 'qTVRs1wTwho',
    start: '0:00',
    end: '5:00',
    channelName: 'قناة',
    language: 'ar',
    summary: '',
    notes: withNotes ? 'البيانات قيم خام، والمعلومات بيانات معالجة.' : '',
  });
  const lesson = () => paths.get(pathId)!.findLesson(createLessonId(lessonId))!.lesson;
  return { deps, pathId, lessonId, lesson };
}

describe('GenerateStudyGuideUseCase', () => {
  it('يحفظ ملخصًا منظمًا من الملاحظات ويسحب المراجعة البشرية', async () => {
    const { deps, pathId, lessonId, lesson } = await setup();
    await new SetLessonReviewUseCase(deps).execute({ actor: admin, pathId, lessonId, reviewed: true });
    expect(lesson().reviewedByHuman).toBe(true);

    await new GenerateStudyGuideUseCase(deps).execute({ actor: admin, pathId, lessonId });
    const sections = parseStudyGuide(lesson().studyGuide ?? '');
    expect(sections.map((s) => s.heading)).toEqual(['', 'البيانات', 'المعلومات']);
    expect(sections[1]?.points).toEqual(['قيم خام', 'لا معنى لها وحدها']);
    expect(lesson().reviewedByHuman).toBe(false);
  });

  it('يرفض بلا ملاحظات، وغير المدير، وردّ نموذج تالفًا أو فارغًا دون حفظ شيء', async () => {
    const empty = await setup(validGuide, false);
    await expect(
      new GenerateStudyGuideUseCase(empty.deps).execute({ actor: admin, pathId: empty.pathId, lessonId: empty.lessonId }),
    ).rejects.toThrow('مادة كافية');

    const ok = await setup();
    await expect(
      new GenerateStudyGuideUseCase(ok.deps).execute({ actor: stranger, pathId: ok.pathId, lessonId: ok.lessonId }),
    ).rejects.toBeInstanceOf(ForbiddenError);

    for (const bad of [{ overview: 1, sections: [] }, { overview: '', sections: [] }, { overview: 'x', sections: [{ heading: 'h' }] }, null]) {
      const t = await setup(bad);
      await expect(
        new GenerateStudyGuideUseCase(t.deps).execute({ actor: admin, pathId: t.pathId, lessonId: t.lessonId }),
      ).rejects.toThrow('ردّ النموذج غير صالح');
      expect(t.lesson().studyGuide).toBeUndefined();
    }
  });
});

describe('SummarizeLessonUseCase (زر لخّص الدرس للمتعلم)', () => {
  it('يولّد عند الطلب مرة واحدة ثم يعيد المخزَّن دون استدعاء النموذج، ولا يمسّ المراجعة', async () => {
    const { deps, pathId, lessonId, lesson } = await setup();
    await new SetLessonReviewUseCase(deps).execute({ actor: admin, pathId, lessonId, reviewed: true });
    let calls = 0;
    const counting = { ...deps, llm: { generateJson: async () => (calls++, validGuide) } };
    const summarize = new SummarizeLessonUseCase(counting);

    const first = await summarize.execute({ userId: 'learner', pathId, lessonId });
    expect(first.created).toBe(true);
    expect(parseStudyGuide(first.text).length).toBe(3);
    expect(lesson().reviewedByHuman).toBe(true);

    const second = await summarize.execute({ userId: 'learner', pathId, lessonId });
    expect(second).toEqual({ text: first.text, created: false });
    expect(calls).toBe(1);
  });

  it('يرفض بلا ملاحظات برسالة واضحة', async () => {
    const { deps, pathId, lessonId } = await setup(validGuide, false);
    await expect(new SummarizeLessonUseCase(deps).execute({ userId: 'l', pathId, lessonId })).rejects.toThrow('مادة كافية');
  });
});

describe('SetStudyGuideUseCase', () => {
  it('يحفظ نص المالك ويحذفه بالنص الفارغ', async () => {
    const { deps, pathId, lessonId, lesson } = await setup();
    const set = (text: string) => new SetStudyGuideUseCase(deps).execute({ actor: admin, pathId, lessonId, text });
    await set('## قسم\n- نقطة');
    expect(lesson().studyGuide).toBe('## قسم\n- نقطة');
    await set('   ');
    expect(lesson().studyGuide).toBeUndefined();
  });
});

describe('parseGeneratedStudyGuide', () => {
  it('يحوّل الأقسام إلى النص المخزَّن', () => {
    expect(parseGeneratedStudyGuide(validGuide)).toContain('## المعلومات');
  });
});

describe('الفيديو المرفوع', () => {
  it('لا يقرؤه النموذج تلقائيًا فتُرفض مسودة الملاحظات بوضوح', async () => {
    const { deps, pathId } = await setup();
    const media = {
      ...deps,
      llm: { generateJson: async () => ({}), describeVideo: async () => 'نص' },
    };
    const mod = (await deps.paths.findById(pathId as unknown as PathId))!.modules[0]!;
    const { lessonId } = await new AddLessonUseCase(deps).execute({
      actor: admin,
      pathId,
      moduleId: mod.id,
      title: 'مرفوع',
        videoUrl: '',
      start: '',
      end: '',
      channelName: 'المالك',
      language: 'ar',
      summary: '',
      mediaUrl: 'https://res.cloudinary.com/demo/video/upload/v1/a.mp4',
      mediaDurationSeconds: 60,
    });
    await expect(new DraftLessonNotesUseCase(media).execute({ actor: admin, pathId, lessonId })).rejects.toThrow('المرفوع');
  });
});
