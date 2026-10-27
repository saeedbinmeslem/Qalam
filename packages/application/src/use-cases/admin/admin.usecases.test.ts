import { describe, expect, it } from 'vitest';
import {
  AdminPolicy,
  Concept,
  createConceptId,
  type ConceptId,
  type LearningPath,
  type PathId,
} from '@qalam/domain';
import { ForbiddenError, UnauthenticatedError } from '../../errors.js';
import type { ConceptRepositoryPort } from '../../ports/concept-repository.port.js';
import type { PathRepositoryPort } from '../../ports/path-repository.port.js';
import type { AdminDeps } from './admin-deps.js';
import {
  CreateConceptUseCase,
  DeleteConceptUseCase,
  UpdateConceptUseCase,
} from './admin-concepts.usecases.js';
import {
  AddLessonUseCase,
  DeleteLessonUseCase,
  MoveLessonUseCase,
  SetLessonReviewUseCase,
  UpdateLessonUseCase,
} from './admin-lessons.usecases.js';
import {
  AddModuleUseCase,
  CheckAdminUseCase,
  CreatePathUseCase,
  DeleteModuleUseCase,
  DeletePathUseCase,
  MoveModuleUseCase,
  UpdatePathUseCase,
} from './admin-paths.usecases.js';

class FakePaths implements PathRepositoryPort {
  readonly store = new Map<string, LearningPath>();
  async save(path: LearningPath) {
    this.store.set(path.id, path);
  }
  async delete(id: PathId) {
    this.store.delete(id);
  }
  async findById(id: PathId) {
    return this.store.get(id) ?? null;
  }
  async findBySubject() {
    return [...this.store.values()];
  }
  async findAll() {
    return [...this.store.values()];
  }
}

class FakeConcepts implements ConceptRepositoryPort {
  readonly store = new Map<string, Concept>();
  async save(concept: Concept) {
    this.store.set(concept.id, concept);
  }
  async findById(id: ConceptId) {
    return this.store.get(id) ?? null;
  }
  async findAll() {
    return [...this.store.values()];
  }
  async delete(id: ConceptId) {
    this.store.delete(id);
  }
}

const admin = { id: 'u1', email: 'owner@qalam.dev' };
const stranger = { id: 'u2', email: 'stranger@x.com' };

function setup() {
  let counter = 0;
  const deps: AdminDeps = {
    paths: new FakePaths(),
    concepts: new FakeConcepts(),
    ids: { next: (prefix) => `${prefix}-${++counter}` },
    policy: AdminPolicy.fromList('owner@qalam.dev'),
  };
  return deps;
}

const lessonFields = {
  title: 'درس',
  conceptId: 'concept-1',
  videoUrl: 'https://youtu.be/qTVRs1wTwho',
  start: '0:10',
  end: '1:10',
  channelName: 'قناة',
  language: 'ar',
  summary: '',
};

/** مسار فيه وحدة ومفهوم جاهزان لإضافة الدروس */
async function seeded() {
  const deps = setup();
  await new CreateConceptUseCase(deps).execute({
    actor: admin,
    name: 'مفهوم',
    description: '',
    level: 1,
    prerequisiteIds: [],
  });
  const { pathId } = await new CreatePathUseCase(deps).execute({
    actor: admin,
    title: 'مسار',
    description: '',
    targetGoal: 'هدف',
    subject: 'عام',
  });
  const { moduleId } = await new AddModuleUseCase(deps).execute({
    actor: admin,
    pathId,
    title: 'وحدة',
    description: '',
  });
  return { deps, pathId, moduleId };
}

describe('الصلاحيات', () => {
  it('الزائر مرفوض بخطأ عدم تسجيل، وغير المدير بخطأ منع', async () => {
    const deps = setup();
    const create = new CreatePathUseCase(deps);
    const fields = { title: 'م', description: '', targetGoal: 'هدف', subject: 'عام' };
    await expect(create.execute({ actor: null, ...fields })).rejects.toBeInstanceOf(UnauthenticatedError);
    await expect(create.execute({ actor: stranger, ...fields })).rejects.toBeInstanceOf(ForbiddenError);
    expect((deps.paths as FakePaths).store.size).toBe(0);
  });

  it('كل الحالات الإدارية تتحقق من المدير قبل أي عمل', async () => {
    const { deps, pathId, moduleId } = await seeded();
    const calls = [
      () => new UpdatePathUseCase(deps).execute({ actor: stranger, pathId, title: 'x', description: '', targetGoal: 'x', subject: 'x' }),
      () => new DeletePathUseCase(deps).execute({ actor: stranger, pathId }),
      () => new DeleteModuleUseCase(deps).execute({ actor: stranger, pathId, moduleId }),
      () => new AddLessonUseCase(deps).execute({ actor: stranger, pathId, moduleId, ...lessonFields }),
      () => new SetLessonReviewUseCase(deps).execute({ actor: stranger, pathId, lessonId: 'x', reviewed: true }),
      () => new DeleteConceptUseCase(deps).execute({ actor: stranger, conceptId: 'concept-1' }),
    ];
    for (const call of calls) await expect(call()).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('CheckAdmin يفرّق بين المدير وغيره', () => {
    const check = new CheckAdminUseCase(setup());
    expect(check.execute({ actor: admin })).toBe(true);
    expect(check.execute({ actor: stranger })).toBe(false);
    expect(check.execute({ actor: null })).toBe(false);
  });
});

describe('الدروس', () => {
  it('الدرس الجديد غير مراجَع، ورابطه يُحوَّل إلى معرّف وتوقيت', async () => {
    const { deps, pathId, moduleId } = await seeded();
    const { lessonId } = await new AddLessonUseCase(deps).execute({
      actor: admin,
      pathId,
      moduleId,
      ...lessonFields,
    });
    const path = (deps.paths as FakePaths).store.get(pathId)!;
    const lesson = path.modules[0]!.lessons.find((l) => l.id === lessonId)!;
    expect(lesson.segment.videoId).toBe('qTVRs1wTwho');
    expect(lesson.segment.startSeconds).toBe(10);
    expect(lesson.segment.endSeconds).toBe(70);
    expect(lesson.sourceUrl).toBe('https://www.youtube.com/watch?v=qTVRs1wTwho');
    expect(lesson.reviewedByHuman).toBe(false);
  });

  it('يرفض مفهومًا غير موجود وفيديو غير صالح ومقطعًا معكوسًا', async () => {
    const { deps, pathId, moduleId } = await seeded();
    const add = (over: Partial<typeof lessonFields>) =>
      new AddLessonUseCase(deps).execute({ actor: admin, pathId, moduleId, ...lessonFields, ...over });
    await expect(add({ conceptId: 'nope' })).rejects.toThrow('المفهوم');
    await expect(add({ videoUrl: 'hello' })).rejects.toThrow('رابط يوتيوب');
    await expect(add({ start: '2:00', end: '1:00' })).rejects.toThrow('وقت نهاية');
  });

  it('وسم المراجعة يُمنح بالإجراء الخاص ويسقط عند تعديل المحتوى', async () => {
    const { deps, pathId, moduleId } = await seeded();
    const { lessonId } = await new AddLessonUseCase(deps).execute({
      actor: admin,
      pathId,
      moduleId,
      ...lessonFields,
    });
    const reviewedOf = () =>
      (deps.paths as FakePaths).store.get(pathId)!.findLesson(lessonId as never)!.lesson.reviewedByHuman;

    await new SetLessonReviewUseCase(deps).execute({ actor: admin, pathId, lessonId, reviewed: true });
    expect(reviewedOf()).toBe(true);

    await new UpdateLessonUseCase(deps).execute({
      actor: admin,
      pathId,
      lessonId,
      ...lessonFields,
      title: 'عنوان معدّل',
    });
    expect(reviewedOf()).toBe(false);
  });

  it('يحرّك الدرس ويحذفه', async () => {
    const { deps, pathId, moduleId } = await seeded();
    const add = (title: string) =>
      new AddLessonUseCase(deps).execute({ actor: admin, pathId, moduleId, ...lessonFields, title });
    const first = await add('أول');
    const second = await add('ثانٍ');
    const titles = () =>
      (deps.paths as FakePaths).store.get(pathId)!.modules[0]!.lessons.map((l) => l.title);

    await new MoveLessonUseCase(deps).execute({ actor: admin, pathId, lessonId: second.lessonId, direction: 'up' });
    expect(titles()).toEqual(['ثانٍ', 'أول']);

    await new DeleteLessonUseCase(deps).execute({ actor: admin, pathId, lessonId: first.lessonId });
    expect(titles()).toEqual(['ثانٍ']);
  });
});

describe('الوحدات', () => {
  it('الوحدات الجديدة تُرقَّم تسلسلًا، والحذف والتحريك يعيدان الترقيم', async () => {
    const { deps, pathId } = await seeded();
    const second = await new AddModuleUseCase(deps).execute({ actor: admin, pathId, title: 'ثانية', description: '' });
    const orders = () =>
      (deps.paths as FakePaths).store.get(pathId)!.modules.map((m) => [m.title, m.orderIndex]);
    expect(orders()).toEqual([['وحدة', 1], ['ثانية', 2]]);

    await new MoveModuleUseCase(deps).execute({ actor: admin, pathId, moduleId: second.moduleId, direction: 'up' });
    expect(orders()).toEqual([['ثانية', 1], ['وحدة', 2]]);

    await new DeleteModuleUseCase(deps).execute({ actor: admin, pathId, moduleId: second.moduleId });
    expect(orders()).toEqual([['وحدة', 1]]);
  });
});

describe('المفاهيم', () => {
  it('يرفض الدورات في المتطلبات السابقة', async () => {
    const deps = setup();
    const make = (name: string, prerequisiteIds: string[]) =>
      new CreateConceptUseCase(deps).execute({ actor: admin, name, description: '', level: 1, prerequisiteIds });
    const a = await make('أ', []);
    const b = await make('ب', [a.conceptId]);

    await expect(
      new UpdateConceptUseCase(deps).execute({
        actor: admin,
        conceptId: a.conceptId,
        name: 'أ',
        description: '',
        level: 1,
        prerequisiteIds: [b.conceptId],
      }),
    ).rejects.toThrow('دورة');
    await expect(make('ج', ['concept-غير-موجود'])).rejects.toThrow('المتطلب السابق');
  });

  it('لا يحذف مفهومًا مستعملًا في درس أو كمتطلب سابق', async () => {
    const { deps, pathId, moduleId } = await seeded();
    await new AddLessonUseCase(deps).execute({ actor: admin, pathId, moduleId, ...lessonFields });
    const remove = new DeleteConceptUseCase(deps);

    await expect(remove.execute({ actor: admin, conceptId: 'concept-1' })).rejects.toThrow('ترتبط به دروس');

    const dependent = await new CreateConceptUseCase(deps).execute({
      actor: admin,
      name: 'تابع',
      description: '',
      level: 2,
      prerequisiteIds: [createConceptId('concept-1')],
    });
    await expect(remove.execute({ actor: admin, conceptId: dependent.conceptId })).resolves.toBeUndefined();
  });
});
