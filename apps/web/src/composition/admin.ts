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
  AddQuestionUseCase,
  ApproveQuestionUseCase,
  CheckAdminUseCase,
  DeleteQuestionUseCase,
  GenerateQuestionsUseCase,
  ListLessonQuestionsUseCase,
  UpdateQuestionUseCase,
  type QuizAdminDeps,
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
  type AuthUser,
} from '@qalam/application';
import { AdminPolicy } from '@qalam/domain';
import {
  SupabaseConceptRepository,
  SupabasePathRepository,
  SupabaseQuestionRepository,
  randomIdGenerator,
} from '@qalam/infrastructure';
import { getAuth, isSupabaseConfigured } from './auth';
import { getLocalStore } from './container';
import { getLlmClient } from './llm';
import { getServiceClient } from './service-client';

function buildPolicy(): AdminPolicy {
  return AdminPolicy.fromList(process.env.ADMIN_EMAILS);
}

/** فحص خفيف لإظهار رابط اللوحة في الترويسة (لا يبني مستودعات ولا يحتاج مفتاح الخدمة) */
export function isAdminUser(user: AuthUser | null): boolean {
  return user !== null && buildPolicy().isAdmin(user.email);
}

async function buildDeps(): Promise<QuizAdminDeps> {
  const policy = buildPolicy();
  const llm = getLlmClient();
  if (isSupabaseConfigured()) {
    const client = getServiceClient();
    return {
      paths: new SupabasePathRepository(client),
      concepts: new SupabaseConceptRepository(client),
      questions: new SupabaseQuestionRepository(client),
      ids: randomIdGenerator,
      policy,
      llm,
    };
  }
  const local = await getLocalStore();
  return {
    paths: local.paths,
    concepts: local.concepts,
    questions: local.questions,
    ids: randomIdGenerator,
    policy,
    llm,
  };
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
  addQuestion: AddQuestionUseCase;
  generateQuestions: GenerateQuestionsUseCase;
  listLessonQuestions: ListLessonQuestionsUseCase;
  approveQuestion: ApproveQuestionUseCase;
  updateQuestion: UpdateQuestionUseCase;
  deleteQuestion: DeleteQuestionUseCase;
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
    addQuestion: new AddQuestionUseCase(deps),
    generateQuestions: new GenerateQuestionsUseCase(deps),
    listLessonQuestions: new ListLessonQuestionsUseCase(deps),
    approveQuestion: new ApproveQuestionUseCase(deps),
    updateQuestion: new UpdateQuestionUseCase(deps),
    deleteQuestion: new DeleteQuestionUseCase(deps),
  };
}
