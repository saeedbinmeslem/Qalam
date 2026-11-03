/**
 * @file admin.ts
 * @description Composition Root للوحة التحكم: يربط use cases الإدارية بالمستودعات.
 * - مع Supabase: عميل بمفتاح الخدمة (SUPABASE_SERVICE_ROLE_KEY) للكتابة، ويبقى على الخادم فقط.
 * - بدونه: نفس مخزن الذاكرة الذي تقرأ منه الصفحات العامة.
 * - المديرون: ADMIN_EMAILS (قائمة بريد مفصولة بفواصل) في كل البيئات؛ بدونها لا يدخل أحد.
 */
import {
  AddCourseUseCase,
  AddLessonUseCase,
  AddModuleUseCase,
  AddQuestionUseCase,
  ApproveLessonQuestionsUseCase,
  ApproveLessonsUseCase,
  ApproveQuestionUseCase,
  ApproveQuizzesUseCase,
  CountCourseTranscriptsUseCase,
  CountDraftQuestionsUseCase,
  FetchCourseTranscriptsUseCase,
  CheckAdminUseCase,
  CreateUploadTicketUseCase,
  DeleteQuestionUseCase,
  DraftLessonNotesUseCase,
  EnrichPathUseCase,
  FinishBackgroundJobUseCase,
  ListBackgroundJobsUseCase,
  StartBackgroundJobUseCase,
  TranslateLessonTitlesUseCase,
  type BackgroundJobPort,
  type TranscriptStorePort,
  GenerateQuestionsUseCase,
  GenerateStudyGuideUseCase,
  ImportPlaylistUseCase,
  ImportVideosUseCase,
  SetStudyGuideUseCase,
  SummarizeLessonUseCase,
  ListLessonQuestionsUseCase,
  UpdateQuestionUseCase,
  type QuizAdminDeps,
  CreateConceptUseCase,
  CreatePathUseCase,
  DeleteConceptUseCase,
  DeleteCourseUseCase,
  DeleteLessonUseCase,
  DeleteModuleUseCase,
  DeletePathUseCase,
  GetLearningPathUseCase,
  ListConceptsUseCase,
  ListLearningPathsUseCase,
  MoveCourseUseCase,
  MoveLessonUseCase,
  MoveModuleUseCase,
  SetCourseCoverUseCase,
  SetLessonReviewUseCase,
  SetPathCoverUseCase,
  UpdateConceptUseCase,
  UpdateCourseUseCase,
  UpdateLessonUseCase,
  UpdateModuleUseCase,
  UpdatePathUseCase,
  type AuthUser,
} from '@qalam/application';
import { AdminPolicy } from '@qalam/domain';
import {
  CloudinaryUploadSigner,
  InMemoryBackgroundJobRepository,
  InMemoryTranscriptStore,
  SupabaseBackgroundJobRepository,
  SupabaseConceptRepository,
  SupabasePathRepository,
  SupabaseQuestionRepository,
  SupabaseTranscriptStore,
  YouTubePlaylistCatalog,
  YoutubeTranscriptSource,
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

/** النص المفرّغ مصدر أول لإعداد الدروس؛ إن حُظر الجلب من الخادم تعود الملاحظات لقراءة الفيديو (أو شغّل fetch-transcripts محليًا) */
const transcriptSource = new YoutubeTranscriptSource();
const localTranscripts = new InMemoryTranscriptStore();

function buildTranscriptStore(): TranscriptStorePort {
  return isSupabaseConfigured() ? new SupabaseTranscriptStore(getServiceClient()) : localTranscripts;
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
      transcriptSource,
      transcriptStore: buildTranscriptStore(),
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
    transcriptSource,
    transcriptStore: localTranscripts,
  };
}

/** في التطوير بلا Supabase: سجل واحد للعملية كلها (container جديد لكل طلب) */
const localJobs = new InMemoryBackgroundJobRepository();

function buildJobs(): BackgroundJobPort {
  return isSupabaseConfigured() ? new SupabaseBackgroundJobRepository(getServiceClient()) : localJobs;
}

/** توقيع رفع الفيديو إلى Cloudinary؛ بلا المتغيرات الثلاثة لا يظهر خيار الرفع */
function buildUploadSigner(): CloudinaryUploadSigner {
  return new CloudinaryUploadSigner({
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  });
}

/** زر «لخّص الدرس» للمتعلم: يكتب الملخص المخزَّن مؤقتًا فيحتاج مستودعًا بصلاحية الخدمة (على الخادم فقط) */
export async function getLessonSummarizer(): Promise<SummarizeLessonUseCase> {
  return new SummarizeLessonUseCase(await buildDeps());
}

export interface AdminContainer {
  /** المستخدم الحالي (يُمرَّر لكل use case ليتحقق من صلاحيته) */
  actor: AuthUser | null;
  checkAdmin: CheckAdminUseCase;
  createUploadTicket: CreateUploadTicketUseCase;
  listPaths: ListLearningPathsUseCase;
  getPath: GetLearningPathUseCase;
  listConcepts: ListConceptsUseCase;
  createPath: CreatePathUseCase;
  updatePath: UpdatePathUseCase;
  setPathCover: SetPathCoverUseCase;
  setCourseCover: SetCourseCoverUseCase;
  deletePath: DeletePathUseCase;
  addCourse: AddCourseUseCase;
  updateCourse: UpdateCourseUseCase;
  deleteCourse: DeleteCourseUseCase;
  moveCourse: MoveCourseUseCase;
  addModule: AddModuleUseCase;
  updateModule: UpdateModuleUseCase;
  deleteModule: DeleteModuleUseCase;
  moveModule: MoveModuleUseCase;
  addLesson: AddLessonUseCase;
  updateLesson: UpdateLessonUseCase;
  deleteLesson: DeleteLessonUseCase;
  moveLesson: MoveLessonUseCase;
  setLessonReview: SetLessonReviewUseCase;
  approveLessons: ApproveLessonsUseCase;
  approveLessonQuestions: ApproveLessonQuestionsUseCase;
  approveQuizzes: ApproveQuizzesUseCase;
  countDraftQuestions: CountDraftQuestionsUseCase;
  createConcept: CreateConceptUseCase;
  updateConcept: UpdateConceptUseCase;
  deleteConcept: DeleteConceptUseCase;
  draftLessonNotes: DraftLessonNotesUseCase;
  importPlaylist: ImportPlaylistUseCase;
  importVideos: ImportVideosUseCase;
  enrichPath: EnrichPathUseCase;
  countTranscripts: CountCourseTranscriptsUseCase;
  fetchTranscripts: FetchCourseTranscriptsUseCase;
  translateTitles: TranslateLessonTitlesUseCase;
  startJob: StartBackgroundJobUseCase;
  finishJob: FinishBackgroundJobUseCase;
  listJobs: ListBackgroundJobsUseCase;
  addQuestion: AddQuestionUseCase;
  generateQuestions: GenerateQuestionsUseCase;
  listLessonQuestions: ListLessonQuestionsUseCase;
  approveQuestion: ApproveQuestionUseCase;
  updateQuestion: UpdateQuestionUseCase;
  deleteQuestion: DeleteQuestionUseCase;
  generateStudyGuide: GenerateStudyGuideUseCase;
  setStudyGuide: SetStudyGuideUseCase;
}

export async function getAdminContainer(): Promise<AdminContainer> {
  const actor = await (await getAuth()).getCurrentUser.execute();
  const deps = await buildDeps();
  const jobDeps = { ...deps, jobs: buildJobs() };
  const transcriptDeps = { ...deps, transcriptSource, transcriptStore: buildTranscriptStore() };
  return {
    actor,
    checkAdmin: new CheckAdminUseCase(deps),
    createUploadTicket: new CreateUploadTicketUseCase({ policy: deps.policy, uploads: buildUploadSigner() }),
    listPaths: new ListLearningPathsUseCase(deps.paths),
    getPath: new GetLearningPathUseCase(deps.paths, deps.concepts),
    listConcepts: new ListConceptsUseCase(deps),
    createPath: new CreatePathUseCase(deps),
    updatePath: new UpdatePathUseCase(deps),
    setPathCover: new SetPathCoverUseCase(deps),
    setCourseCover: new SetCourseCoverUseCase(deps),
    deletePath: new DeletePathUseCase(deps),
    addCourse: new AddCourseUseCase(deps),
    updateCourse: new UpdateCourseUseCase(deps),
    deleteCourse: new DeleteCourseUseCase(deps),
    moveCourse: new MoveCourseUseCase(deps),
    addModule: new AddModuleUseCase(deps),
    updateModule: new UpdateModuleUseCase(deps),
    deleteModule: new DeleteModuleUseCase(deps),
    moveModule: new MoveModuleUseCase(deps),
    addLesson: new AddLessonUseCase(deps),
    updateLesson: new UpdateLessonUseCase(deps),
    deleteLesson: new DeleteLessonUseCase(deps),
    moveLesson: new MoveLessonUseCase(deps),
    setLessonReview: new SetLessonReviewUseCase(deps),
    approveLessons: new ApproveLessonsUseCase(deps),
    approveLessonQuestions: new ApproveLessonQuestionsUseCase(deps),
    approveQuizzes: new ApproveQuizzesUseCase(deps),
    countDraftQuestions: new CountDraftQuestionsUseCase(deps),
    createConcept: new CreateConceptUseCase(deps),
    updateConcept: new UpdateConceptUseCase(deps),
    deleteConcept: new DeleteConceptUseCase(deps),
    draftLessonNotes: new DraftLessonNotesUseCase(deps),
    // ترتيب دفعة كاملة من العناوين: نستعمل العميل العادي (لا السريع) لأن الجودة هنا أهم من الزمن
    importPlaylist: new ImportPlaylistUseCase({
      ...deps,
      playlists: new YouTubePlaylistCatalog(process.env.YOUTUBE_API_KEY),
    }),
    importVideos: new ImportVideosUseCase({
      ...deps,
      videos: new YouTubePlaylistCatalog(process.env.YOUTUBE_API_KEY),
    }),
    enrichPath: new EnrichPathUseCase(deps),
    countTranscripts: new CountCourseTranscriptsUseCase(transcriptDeps),
    fetchTranscripts: new FetchCourseTranscriptsUseCase(transcriptDeps),
    translateTitles: new TranslateLessonTitlesUseCase(deps),
    startJob: new StartBackgroundJobUseCase(jobDeps),
    finishJob: new FinishBackgroundJobUseCase(jobDeps),
    listJobs: new ListBackgroundJobsUseCase(jobDeps),
    addQuestion: new AddQuestionUseCase(deps),
    generateQuestions: new GenerateQuestionsUseCase(deps),
    listLessonQuestions: new ListLessonQuestionsUseCase(deps),
    approveQuestion: new ApproveQuestionUseCase(deps),
    updateQuestion: new UpdateQuestionUseCase(deps),
    deleteQuestion: new DeleteQuestionUseCase(deps),
    generateStudyGuide: new GenerateStudyGuideUseCase(deps),
    setStudyGuide: new SetStudyGuideUseCase(deps),
  };
}
