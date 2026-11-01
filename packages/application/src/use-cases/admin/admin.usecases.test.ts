import { describe, expect, it } from 'vitest';
import {
  AdminPolicy,
  Concept,
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
  AddCourseUseCase,
  AddModuleUseCase,
  CheckAdminUseCase,
  CreatePathUseCase,
  DeleteCourseUseCase,
  DeleteModuleUseCase,
  DeletePathUseCase,
  MoveCourseUseCase,
  MoveModuleUseCase,
  SetCourseCoverUseCase,
  SetPathCoverUseCase,
  UpdateCourseUseCase,
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
  async findByPath(pathId: PathId) {
    return [...this.store.values()].filter((c) => c.pathId === pathId);
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
  videoUrl: 'https://youtu.be/qTVRs1wTwho',
  start: '0:10',
  end: '1:10',
  channelName: 'قناة',
  language: 'ar',
  summary: '',
};

const conceptFields = { name: 'مفهوم', description: '', level: 1, prerequisiteIds: [] as string[] };

/** مسار فيه مفهوم وكورس ووحدة جاهزة لإضافة الدروس */
async function seeded() {
  const deps = setup();
  const { pathId } = await new CreatePathUseCase(deps).execute({
    actor: admin,
    title: 'مسار',
    description: '',
    targetGoal: 'هدف',
    subject: 'عام',
  });
  const { conceptId } = await new CreateConceptUseCase(deps).execute({ actor: admin, pathId, ...conceptFields });
  const { courseId } = await new AddCourseUseCase(deps).execute({
    actor: admin,
    pathId,
    conceptId,
    title: 'كورس',
    description: '',
  });
  const { moduleId } = await new AddModuleUseCase(deps).execute({
    actor: admin,
    pathId,
    courseId,
    title: 'وحدة',
    description: '',
  });
  return { deps, pathId, conceptId, courseId, moduleId };
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
    const { deps, pathId, conceptId, courseId, moduleId } = await seeded();
    const calls = [
      () => new UpdatePathUseCase(deps).execute({ actor: stranger, pathId, title: 'x', description: '', targetGoal: 'x', subject: 'x' }),
      () => new DeletePathUseCase(deps).execute({ actor: stranger, pathId }),
      () => new DeleteModuleUseCase(deps).execute({ actor: stranger, pathId, moduleId }),
      () => new AddLessonUseCase(deps).execute({ actor: stranger, pathId, moduleId, ...lessonFields }),
      () => new SetLessonReviewUseCase(deps).execute({ actor: stranger, pathId, lessonId: 'x', reviewed: true }),
      () => new DeleteConceptUseCase(deps).execute({ actor: stranger, conceptId }),
      () => new AddCourseUseCase(deps).execute({ actor: stranger, pathId, conceptId, title: 'x', description: '' }),
      () => new DeleteCourseUseCase(deps).execute({ actor: stranger, pathId, courseId }),
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

  it('فيديو Cloudinary المرفوع يحل محل يوتيوب، ومدته تصبح نهاية المقطع، ويُرفض أي نطاق آخر', async () => {
    const { deps, pathId, moduleId } = await seeded();
    const mediaUrl = 'https://res.cloudinary.com/demo/video/upload/v1/qalam/lessons/abc123.mp4';
    const { lessonId } = await new AddLessonUseCase(deps).execute({
      actor: admin,
      pathId,
      moduleId,
      ...lessonFields,
      videoUrl: '',
      start: '',
      end: '',
      mediaUrl,
      mediaDurationSeconds: 125.4,
    });
    const lesson = (deps.paths as FakePaths).store.get(pathId)!.modules[0]!.lessons.find((l) => l.id === lessonId)!;
    expect(lesson.mediaUrl).toBe(mediaUrl);
    expect(lesson.sourceUrl).toBe(mediaUrl);
    expect(lesson.segment.videoId).toBe('abc123');
    expect(lesson.segment.startSeconds).toBe(0);
    expect(lesson.segment.endSeconds).toBe(126);

    await expect(
      new AddLessonUseCase(deps).execute({
        actor: admin,
        pathId,
        moduleId,
        ...lessonFields,
        mediaUrl: 'https://evil.example.com/demo/video/upload/a.mp4',
      }),
    ).rejects.toThrow('Cloudinary');
  });

  it('يرفض فيديو غير صالح ومقطعًا معكوسًا ووحدة غير موجودة', async () => {
    const { deps, pathId, moduleId } = await seeded();
    const add = (over: Partial<typeof lessonFields>) =>
      new AddLessonUseCase(deps).execute({ actor: admin, pathId, moduleId, ...lessonFields, ...over });
    await expect(add({ videoUrl: 'hello' })).rejects.toThrow('رابط يوتيوب');
    await expect(add({ start: '2:00', end: '1:00' })).rejects.toThrow('وقت نهاية');
    await expect(
      new AddLessonUseCase(deps).execute({ actor: admin, pathId, moduleId: 'nope', ...lessonFields }),
    ).rejects.toThrow('الوحدة');
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

describe('الكورسات والوحدات', () => {
  it('الوحدات الجديدة تُرقَّم تسلسلًا داخل كورسها، والحذف والتحريك يعيدان الترقيم', async () => {
    const { deps, pathId, courseId } = await seeded();
    const second = await new AddModuleUseCase(deps).execute({ actor: admin, pathId, courseId, title: 'ثانية', description: '' });
    const orders = () =>
      (deps.paths as FakePaths).store.get(pathId)!.modules.map((m) => [m.title, m.orderIndex]);
    expect(orders()).toEqual([['وحدة', 1], ['ثانية', 2]]);

    await new MoveModuleUseCase(deps).execute({ actor: admin, pathId, moduleId: second.moduleId, direction: 'up' });
    expect(orders()).toEqual([['ثانية', 1], ['وحدة', 2]]);

    await new DeleteModuleUseCase(deps).execute({ actor: admin, pathId, moduleId: second.moduleId });
    expect(orders()).toEqual([['وحدة', 1]]);
  });

  it('ترقيم الوحدات مستقل في كل كورس، ولا وحدة بلا كورس موجود', async () => {
    const { deps, pathId, conceptId } = await seeded();
    const other = await new AddCourseUseCase(deps).execute({ actor: admin, pathId, conceptId, title: 'كورس ثانٍ', description: '' });
    await new AddModuleUseCase(deps).execute({ actor: admin, pathId, courseId: other.courseId, title: 'أولى هناك', description: '' });
    const path = (deps.paths as FakePaths).store.get(pathId)!;
    expect(path.courses.map((c) => c.modules.map((m) => m.orderIndex))).toEqual([[1], [1]]);
    await expect(
      new AddModuleUseCase(deps).execute({ actor: admin, pathId, courseId: 'nope', title: 'x', description: '' }),
    ).rejects.toThrow('الكورس');
  });

  it('الكورس الجديد يتبع مفهومًا من المسار نفسه فقط ويُرقَّم تسلسلًا', async () => {
    const { deps, pathId, conceptId } = await seeded();
    const foreign = await new CreatePathUseCase(deps).execute({ actor: admin, title: 'آخر', description: '', targetGoal: 'هدف', subject: 'ع' });
    const foreignConcept = await new CreateConceptUseCase(deps).execute({ actor: admin, pathId: foreign.pathId, ...conceptFields });

    await expect(
      new AddCourseUseCase(deps).execute({ actor: admin, pathId, conceptId: foreignConcept.conceptId, title: 'x', description: '' }),
    ).rejects.toThrow('المفهوم');

    await new AddCourseUseCase(deps).execute({ actor: admin, pathId, conceptId, title: 'ثانٍ', description: '' });
    const courses = () => (deps.paths as FakePaths).store.get(pathId)!.courses.map((c) => [c.title, c.orderIndex]);
    expect(courses()).toEqual([['كورس', 1], ['ثانٍ', 2]]);
  });

  it('يحفظ غلاف المسار والكورس وحده (الرفع الخلفي) دون المساس ببقية البيانات', async () => {
    const { deps, pathId, courseId } = await seeded();
    const cover = 'https://res.cloudinary.com/demo/image/upload/v1/qalam/covers/b.jpg';
    const path = () => (deps.paths as FakePaths).store.get(pathId)!;
    const before = { title: path().title, courseTitle: path().findCourse(courseId as never)?.title };

    await new SetPathCoverUseCase(deps).execute({ actor: admin, pathId, coverUrl: cover });
    await new SetCourseCoverUseCase(deps).execute({ actor: admin, pathId, courseId, coverUrl: cover });
    expect(path().coverUrl).toBe(cover);
    expect(path().findCourse(courseId as never)?.coverUrl).toBe(cover);
    expect(path().title).toBe(before.title);
    expect(path().findCourse(courseId as never)?.title).toBe(before.courseTitle);

    await expect(new SetPathCoverUseCase(deps).execute({ actor: null, pathId, coverUrl: cover })).rejects.toThrow();
  });

  it('يضبط غلاف المسار والكورس ويبقيه عند غياب الحقل ويزيله بالفارغ ويرفض الرابط الغريب', async () => {
    const { deps, pathId, courseId } = await seeded();
    const cover = 'https://res.cloudinary.com/demo/image/upload/v1/qalam/covers/a.jpg';
    const path = () => (deps.paths as FakePaths).store.get(pathId)!;
    const details = { title: 'ع', description: '', targetGoal: 'هـ', subject: 'م' };

    await new UpdatePathUseCase(deps).execute({ actor: admin, pathId, ...details, coverUrl: cover });
    await new UpdateCourseUseCase(deps).execute({ actor: admin, pathId, courseId, title: 'ك', description: '', coverUrl: cover });
    expect(path().coverUrl).toBe(cover);
    expect(path().findCourse(courseId as never)?.coverUrl).toBe(cover);

    await new UpdatePathUseCase(deps).execute({ actor: admin, pathId, ...details });
    await new UpdateCourseUseCase(deps).execute({ actor: admin, pathId, courseId, title: 'ك', description: '' });
    expect(path().coverUrl).toBe(cover);
    expect(path().findCourse(courseId as never)?.coverUrl).toBe(cover);

    await new UpdatePathUseCase(deps).execute({ actor: admin, pathId, ...details, coverUrl: '' });
    await new UpdateCourseUseCase(deps).execute({ actor: admin, pathId, courseId, title: 'ك', description: '', coverUrl: '' });
    expect(path().coverUrl).toBeUndefined();
    expect(path().findCourse(courseId as never)?.coverUrl).toBeUndefined();

    await expect(
      new UpdatePathUseCase(deps).execute({ actor: admin, pathId, ...details, coverUrl: 'https://evil.test/a.jpg' }),
    ).rejects.toThrow();
  });

  it('يعدّل الكورس وينقله بين مفاهيم المسار، ويحرّكه ويحذفه', async () => {
    const { deps, pathId, conceptId, courseId } = await seeded();
    const second = await new CreateConceptUseCase(deps).execute({ actor: admin, pathId, ...conceptFields, name: 'مفهوم ثانٍ' });
    const other = await new AddCourseUseCase(deps).execute({ actor: admin, pathId, conceptId, title: 'ثانٍ', description: '' });
    const path = () => (deps.paths as FakePaths).store.get(pathId)!;

    await new UpdateCourseUseCase(deps).execute({
      actor: admin, pathId, courseId, title: 'معدّل', description: 'و', conceptId: second.conceptId,
    });
    expect(path().findCourse(courseId as never)).toMatchObject({ title: 'معدّل', conceptId: second.conceptId });
    await expect(
      new UpdateCourseUseCase(deps).execute({ actor: admin, pathId, courseId, title: 'x', description: '', conceptId: 'nope' }),
    ).rejects.toThrow('المفهوم');

    await new MoveCourseUseCase(deps).execute({ actor: admin, pathId, courseId: other.courseId, direction: 'up' });
    expect(path().courses.map((c) => c.title)).toEqual(['ثانٍ', 'معدّل']);

    await new DeleteCourseUseCase(deps).execute({ actor: admin, pathId, courseId });
    expect(path().courses.map((c) => [c.title, c.orderIndex])).toEqual([['ثانٍ', 1]]);
  });
});

describe('المفاهيم', () => {
  async function pathWithConcepts() {
    const deps = setup();
    const { pathId } = await new CreatePathUseCase(deps).execute({ actor: admin, title: 'م', description: '', targetGoal: 'هدف', subject: 'ع' });
    const make = (name: string, prerequisiteIds: string[], inPath = pathId) =>
      new CreateConceptUseCase(deps).execute({ actor: admin, pathId: inPath, name, description: '', level: 1, prerequisiteIds });
    return { deps, pathId, make };
  }

  it('المفهوم يتبع المسار الذي أُنشئ فيه، ويرفض مسارًا غير موجود', async () => {
    const { deps, pathId, make } = await pathWithConcepts();
    const a = await make('أ', []);
    expect((deps.concepts as FakeConcepts).store.get(a.conceptId)?.pathId).toBe(pathId);
    await expect(make('ب', [], 'path-غير-موجود')).rejects.toThrow('المسار');
  });

  it('يرفض الدورات في المتطلبات السابقة', async () => {
    const { deps, make } = await pathWithConcepts();
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

  it('المتطلب السابق من المسار نفسه فقط', async () => {
    const { deps, make } = await pathWithConcepts();
    const other = await new CreatePathUseCase(deps).execute({ actor: admin, title: 'آخر', description: '', targetGoal: 'هدف', subject: 'ع' });
    const foreign = await make('غريب', [], other.pathId);
    await expect(make('أ', [foreign.conceptId])).rejects.toThrow('المتطلب السابق');
  });

  it('لا يحذف مفهومًا له كورسات أو هو متطلب سابق', async () => {
    const { deps, pathId, conceptId } = await seeded();
    const remove = new DeleteConceptUseCase(deps);

    await expect(remove.execute({ actor: admin, conceptId })).rejects.toThrow('له كورسات');

    const dependent = await new CreateConceptUseCase(deps).execute({
      actor: admin,
      pathId,
      name: 'تابع',
      description: '',
      level: 2,
      prerequisiteIds: [conceptId],
    });
    await expect(remove.execute({ actor: admin, conceptId })).rejects.toThrow('له كورسات');
    await expect(remove.execute({ actor: admin, conceptId: dependent.conceptId })).resolves.toBeUndefined();
  });

  it('حذف المسار يحذف مفاهيمه معه', async () => {
    const { deps, pathId } = await seeded();
    expect((deps.concepts as FakeConcepts).store.size).toBe(1);
    await new DeletePathUseCase(deps).execute({ actor: admin, pathId });
    expect((deps.concepts as FakeConcepts).store.size).toBe(0);
  });
});
