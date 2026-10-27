/**
 * @file admin.ts
 * @description Composition Root للوحة التحكم: يربط use cases الإدارية بالمستودعات.
 * - مع Supabase: عميل بمفتاح الخدمة (SUPABASE_SERVICE_ROLE_KEY) للكتابة، ويبقى على الخادم فقط.
 * - بدونه: نفس مخزن الذاكرة الذي تقرأ منه الصفحات العامة.
 * - المديرون: ADMIN_EMAILS (قائمة بريد مفصولة بفواصل) في كل البيئات؛ بدونها لا يدخل أحد.
 */
import {
  AddLessonUseCase,
  AddModuleUseCase,
  CheckAdminUseCase,
  CreateConceptUseCase,
  CreatePathUseCase,
  DeleteConceptUseCase,
  DeleteLessonUseCase,
  DeleteModuleUseCase,
  DeletePathUseCase,
  GetLearningPathUseCase,
  ListConceptsUseCase,
  ListLearningPathsUseCase,
  MoveLessonUseCase,
  MoveModuleUseCase,
  SetLessonReviewUseCase,
  UpdateConceptUseCase,
  UpdateLessonUseCase,
  UpdateModuleUseCase,
  UpdatePathUseCase,
  type AdminDeps,
  type AuthUser,
} from '@qalam/application';
import { AdminPolicy } from '@qalam/domain';
import {
  SupabaseConceptRepository,
  SupabasePathRepository,
  createSupabaseServiceClient,
  randomIdGenerator,
} from '@qalam/infrastructure';
import { getAuth, isSupabaseConfigured } from './auth';
import { getLocalStore } from './container';

function buildPolicy(): AdminPolicy {
  return AdminPolicy.fromList(process.env.ADMIN_EMAILS);
}

/** فحص خفيف لإظهار رابط اللوحة في الترويسة (لا يبني مستودعات ولا يحتاج مفتاح الخدمة) */
export function isAdminUser(user: AuthUser | null): boolean {
  return user !== null && buildPolicy().isAdmin(user.email);
}

async function buildDeps(): Promise<AdminDeps> {
  const policy = buildPolicy();
  if (isSupabaseConfigured()) {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) throw new Error('لوحة التحكم تحتاج SUPABASE_SERVICE_ROLE_KEY في إعدادات الخادم');
    const client = createSupabaseServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, key);
    return {
      paths: new SupabasePathRepository(client),
      concepts: new SupabaseConceptRepository(client),
      ids: randomIdGenerator,
      policy,
    };
  }
  const local = await getLocalStore();
  return { paths: local.paths, concepts: local.concepts, ids: randomIdGenerator, policy };
}

export interface AdminContainer {
  /** المستخدم الحالي (يُمرَّر لكل use case ليتحقق من صلاحيته) */
  actor: AuthUser | null;
  checkAdmin: CheckAdminUseCase;
  listPaths: ListLearningPathsUseCase;
  getPath: GetLearningPathUseCase;
  listConcepts: ListConceptsUseCase;
  createPath: CreatePathUseCase;
  updatePath: UpdatePathUseCase;
  deletePath: DeletePathUseCase;
  addModule: AddModuleUseCase;
  updateModule: UpdateModuleUseCase;
  deleteModule: DeleteModuleUseCase;
  moveModule: MoveModuleUseCase;
  addLesson: AddLessonUseCase;
  updateLesson: UpdateLessonUseCase;
  deleteLesson: DeleteLessonUseCase;
  moveLesson: MoveLessonUseCase;
  setLessonReview: SetLessonReviewUseCase;
  createConcept: CreateConceptUseCase;
  updateConcept: UpdateConceptUseCase;
  deleteConcept: DeleteConceptUseCase;
}

export async function getAdminContainer(): Promise<AdminContainer> {
  const actor = await (await getAuth()).getCurrentUser.execute();
  const deps = await buildDeps();
  return {
    actor,
    checkAdmin: new CheckAdminUseCase(deps),
    listPaths: new ListLearningPathsUseCase(deps.paths),
    getPath: new GetLearningPathUseCase(deps.paths),
    listConcepts: new ListConceptsUseCase(deps),
    createPath: new CreatePathUseCase(deps),
    updatePath: new UpdatePathUseCase(deps),
    deletePath: new DeletePathUseCase(deps),
    addModule: new AddModuleUseCase(deps),
    updateModule: new UpdateModuleUseCase(deps),
    deleteModule: new DeleteModuleUseCase(deps),
    moveModule: new MoveModuleUseCase(deps),
    addLesson: new AddLessonUseCase(deps),
    updateLesson: new UpdateLessonUseCase(deps),
    deleteLesson: new DeleteLessonUseCase(deps),
    moveLesson: new MoveLessonUseCase(deps),
    setLessonReview: new SetLessonReviewUseCase(deps),
    createConcept: new CreateConceptUseCase(deps),
    updateConcept: new UpdateConceptUseCase(deps),
    deleteConcept: new DeleteConceptUseCase(deps),
  };
}
