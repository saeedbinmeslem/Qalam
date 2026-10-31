import { describe, expect, it } from 'vitest';
import {
  AdminPolicy,
  Concept,
  LearningPath,
  QuizQuestion,
  type ConceptId,
  type LessonId,
  type PathId,
  type QuestionId,
} from '@qalam/domain';
import { ForbiddenError } from '../../errors.js';
import type { ConceptRepositoryPort } from '../../ports/concept-repository.port.js';
import type { LlmClient } from '../../ports/llm-client.port.js';
import type { QuestionRepositoryPort } from '../../ports/question-repository.port.js';
import { AddLessonUseCase } from './admin-lessons.usecases.js';
import { EnrichPathUseCase } from './admin-path-enrichment.usecases.js';
import { DraftLessonNotesUseCase, type QuizAdminDeps } from './admin-quiz.usecases.js';
import { seedPathWithModule } from '../../test-support/admin-seed.js';

class Paths {
  store = new Map<string, LearningPath>();
  save = async (p: LearningPath) => void this.store.set(p.id, p);
  delete = async (id: PathId) => void this.store.delete(id);
  findById = async (id: PathId) => this.store.get(id) ?? null;
  findBySubject = async () => [...this.store.values()];
  findAll = async () => [...this.store.values()];
}

class Questions implements QuestionRepositoryPort {
  store = new Map<string, QuizQuestion>();
  async save(q: QuizQuestion) {
    this.store.set(q.id, q);
  }
  async findById(id: QuestionId) {
    return this.store.get(id) ?? null;
  }
  async findByLesson(lessonId: LessonId) {
    return [...this.store.values()].filter((q) => q.lessonId === lessonId);
  }
  async delete(id: QuestionId) {
    this.store.delete(id);
  }
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
const guideAnswer = { overview: 'نظرة', sections: [{ heading: 'قسم', points: ['نقطة'] }] };
const questionsAnswer = {
  questions: [{ prompt: 'س؟', choices: ['أ', 'ب', 'ج', 'د'], correctIndex: 1, explanation: 'ش' }],
};

/** نموذج وهمي يميّز الطلب من تعليمات النظام؛ failNotesFor يُسقط قراءة الفيديو لروابط بعينها */
function fakeLlm(failNotesFor: string[] = []) {
  const llm: LlmClient = {
    describeVideo: async ({ videoUrl }) => {
      if (failNotesFor.some((id) => videoUrl.includes(id))) throw new Error('حصة منتهية');
      return '1. نقطة';
    },
    generateJson: async ({ system }) => (system.includes('يلخّص') ? guideAnswer : questionsAnswer),
  };
  return llm;
}

async function setup(videoIds: string[], llm: LlmClient) {
  let n = 0;
  const deps: QuizAdminDeps = {
    paths: new Paths(),
    concepts: new Concepts(),
    ids: { next: (prefix) => `${prefix}-${++n}` },
    policy: AdminPolicy.fromList('owner@qalam.dev'),
    questions: new Questions(),
    llm,
  };
  const { pathId, moduleId } = await seedPathWithModule(deps, admin);
  for (const id of videoIds) {
    await new AddLessonUseCase(deps).execute({
      actor: admin, pathId, moduleId, title: `درس ${id}`, videoUrl: id, start: '0', end: '300',
      channelName: 'ق', language: 'ar', summary: '',
    });
  }
  return { deps, pathId };
}

const lessonsOf = async (deps: QuizAdminDeps, pathId: string) =>
  (await deps.paths.findById(pathId as PathId))!.modules.flatMap((m) => m.lessons);

/** يعيد بناء المسار بعنوان جديد (الكيان غير قابل للتعديل المباشر) مع الكورسات نفسها */
class UpdatedTitle {
  readonly path: LearningPath;
  constructor(old: LearningPath, title: string) {
    this.path = new LearningPath({
      id: old.id, title, description: old.description, targetGoal: old.targetGoal, subject: old.subject, courses: [...old.courses],
    });
  }
}

describe('EnrichPathUseCase (إكمال الدروس تلقائيًا)', () => {
  it('يولّد الملاحظات والملخص ومسودات الأسئلة، ويبقي الدرس والأسئلة بانتظار المراجعة', async () => {
    const { deps, pathId } = await setup(['aaaaaaaaaaa', 'bbbbbbbbbbb'], fakeLlm());
    const result = await new EnrichPathUseCase(deps).execute({ actor: admin, pathId });
    expect(result).toEqual({ completed: 2, remaining: 0, failures: [] });

    const lessons = await lessonsOf(deps, pathId);
    expect(lessons.every((l) => l.notes && l.studyGuide && !l.reviewedByHuman)).toBe(true);
    const questions = [...(deps.questions as Questions).store.values()];
    expect(questions).toHaveLength(2);
    expect(questions.every((q) => q.status === 'draft' && q.origin === 'ai')).toBe(true);
  });

  it('لا يكرر ما اكتمل: التشغيل الثاني لا يولّد شيئًا', async () => {
    const { deps, pathId } = await setup(['aaaaaaaaaaa'], fakeLlm());
    const useCase = new EnrichPathUseCase(deps);
    await useCase.execute({ actor: admin, pathId });
    expect(await useCase.execute({ actor: admin, pathId })).toEqual({ completed: 0, remaining: 0, failures: [] });
    expect((deps.questions as Questions).store.size).toBe(1);
  });

  it('يتابع بعد فشل درس ويُبلغ به، ويحسب ما تبقى', async () => {
    const { deps, pathId } = await setup(['aaaaaaaaaaa', 'bbbbbbbbbbb'], fakeLlm(['aaaaaaaaaaa']));
    const result = await new EnrichPathUseCase(deps).execute({ actor: admin, pathId });
    expect(result.completed).toBe(1);
    expect(result.remaining).toBe(1);
    expect(result.failures).toEqual([{ title: 'درس aaaaaaaaaaa', message: 'حصة منتهية' }]);
  });

  it('يتوقف بعد 3 إخفاقات متتالية، وعند نفاد ميزانية الزمن', async () => {
    const ids = ['aaaaaaaaaaa', 'bbbbbbbbbbb', 'ccccccccccc', 'ddddddddddd'];
    const failing = await setup(ids, fakeLlm(ids));
    const stopped = await new EnrichPathUseCase(failing.deps).execute({ actor: admin, pathId: failing.pathId });
    // العمّال متوازون فقد يتجاوز العدد 3 بقدر ما كان جاريًا وقت الإيقاف
    expect(stopped.failures.length).toBeGreaterThanOrEqual(3);
    expect(stopped.remaining).toBe(4);

    const slow = await setup(ids, fakeLlm());
    let clock = 0;
    const result = await new EnrichPathUseCase(slow.deps, () => (clock += 100)).execute({ actor: admin, pathId: slow.pathId, budgetMs: 250 });
    expect(result.completed).toBeLessThan(4);
    expect(result.remaining).toBe(4 - result.completed);
  });

  it('يقتصر على الكورس المحدد ولا يلمس غيره', async () => {
    const { deps, pathId } = await setup(['aaaaaaaaaaa', 'bbbbbbbbbbb'], fakeLlm());
    const useCase = new EnrichPathUseCase(deps);

    const other = await useCase.execute({ actor: admin, pathId, courseId: 'كورس-آخر' });
    expect(other).toEqual({ completed: 0, remaining: 0, failures: [] });
    expect((await lessonsOf(deps, pathId)).some((l) => l.notes)).toBe(false);

    const courseId = (await deps.paths.findById(pathId as PathId))!.courses[0]!.id;
    const own = await useCase.execute({ actor: admin, pathId, courseId });
    expect(own).toEqual({ completed: 2, remaining: 0, failures: [] });
  });

  it('تعديل المالك أثناء استدعاء النموذج لا يُمحى بحفظ الملاحظات', async () => {
    const { deps, pathId } = await setup(['aaaaaaaaaaa'], fakeLlm());
    const lessonId = (await lessonsOf(deps, pathId))[0]!.id;
    // أثناء «قراءة الفيديو» يعيد المالك تسمية الكورس (تعديل لا يمسّ الذكاء الاصطناعي)
    const slow: LlmClient = {
      ...fakeLlm(),
      describeVideo: async () => {
        const path = (await deps.paths.findById(pathId as PathId))!;
        await deps.paths.save(new UpdatedTitle(path, 'اسم جديد').path);
        return '1. نقطة';
      },
    };
    await new DraftLessonNotesUseCase({ ...deps, llm: slow }).execute({ actor: admin, pathId, lessonId });
    const saved = (await deps.paths.findById(pathId as PathId))!;
    expect(saved.title).toBe('اسم جديد');
    expect(saved.findLesson(lessonId as never)?.lesson.notes).toBe('1. نقطة');
  });

  it('للمدير فقط', async () => {
    const { deps, pathId } = await setup(['aaaaaaaaaaa'], fakeLlm());
    await expect(new EnrichPathUseCase(deps).execute({ actor: { id: 'u2', email: 'x@x.com' }, pathId })).rejects.toBeInstanceOf(ForbiddenError);
  });
});
