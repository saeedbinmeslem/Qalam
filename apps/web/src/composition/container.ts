/**
 * @file container.ts
 * @description Composition Root: النقطة الوحيدة التي تربط التنفيذات (Infrastructure)
 * بالمنافذ (Ports) وحالات الاستخدام. الصفحات تستورد من هنا فقط.
 * مع مفاتيح Supabase: قاعدة البيانات الفعلية. بدونها: ذاكرة + بذرة (للتطوير والاختبار).
 */
import {
  GetLearningPathUseCase,
  GetLessonQuizUseCase,
  GetLessonUseCase,
  GetPathProgressUseCase,
  GetQuizResultUseCase,
  ListLearningPathsUseCase,
  RecordLearningEventUseCase,
  SubmitQuizUseCase,
  type EventReaderPort,
  type EventRecorderPort,
  type PathRepositoryPort,
  type QuestionRepositoryPort,
} from '@qalam/application';
import {
  InMemoryConceptRepository,
  InMemoryEventRecorder,
  InMemoryPathRepository,
  InMemoryQuestionRepository,
  FileSnapshotStore,
  takeSnapshot,
  SupabaseEventReader,
  SupabaseQuestionRepository,
  SupabaseEventRecorder,
  SupabasePathRepository,
  createInitialSeedPath,
  systemClock,
  type SupabaseDataClient,
  type SupabaseInsertClient,
} from '@qalam/infrastructure';
import { join } from 'node:path';
import { createSupabaseServerClient, isSupabaseConfigured } from './auth';
import { getServiceClient } from './service-client';

export interface Container {
  getLessonQuiz: GetLessonQuizUseCase;
  getQuizResult: GetQuizResultUseCase;
  submitQuiz: SubmitQuizUseCase;
  getPathProgress: GetPathProgressUseCase;
  getLearningPath: GetLearningPathUseCase;
  getLesson: GetLessonUseCase;
  listLearningPaths: ListLearningPathsUseCase;
  recordLearningEvent: RecordLearningEventUseCase;
}

function assemble(
  paths: PathRepositoryPort,
  events: EventRecorderPort & EventReaderPort,
  questions: QuestionRepositoryPort,
): Container {
  return {
    getLessonQuiz: new GetLessonQuizUseCase(questions),
    getQuizResult: new GetQuizResultUseCase(questions),
    submitQuiz: new SubmitQuizUseCase(questions, events, systemClock),
    getPathProgress: new GetPathProgressUseCase(paths, events),
    getLearningPath: new GetLearningPathUseCase(paths),
    getLesson: new GetLessonUseCase(paths),
    listLearningPaths: new ListLearningPathsUseCase(paths),
    recordLearningEvent: new RecordLearningEventUseCase(events, systemClock),
  };
}

/** مخزن الذاكرة المحلي: تشاركه الصفحات العامة ولوحة التحكم ليظهر كل تعديل فورًا */
export interface LocalStore {
  paths: InMemoryPathRepository;
  concepts: InMemoryConceptRepository;
  questions: InMemoryQuestionRepository;
  events: InMemoryEventRecorder;
}

// على globalThis لأن Next في وضع التطوير قد يحمّل الوحدة أكثر من مرة (صفحات وإجراءات الخادم)
const globalForQalam = globalThis as typeof globalThis & { __qalamLocalStore?: Promise<LocalStore> };

/**
 * المخزن المحلي يُحفظ كلقطة JSON بعد كل تعديل (لا تضيع المسودات عند إعادة التشغيل)،
 * ويُقرأ منها عند البدء؛ فإن لم توجد نبدأ من البذرة. المسار بـ QALAM_LOCAL_STORE أو .data/ (مستثنى من git).
 */
export function localStorePath(): string {
  return process.env.QALAM_LOCAL_STORE || join(process.cwd(), '.data', 'local-store.json');
}

async function buildLocal(): Promise<LocalStore> {
  const file = new FileSnapshotStore(localStorePath());
  let ready = false;
  const store: LocalStore = {} as LocalStore;
  const persist = () => {
    if (!ready) return;
    file.save(
      takeSnapshot({
        paths: store.paths.list(),
        concepts: store.concepts.list(),
        questions: store.questions.list(),
        events: store.events.events,
      }),
    );
  };
  store.paths = new InMemoryPathRepository(persist);
  store.concepts = new InMemoryConceptRepository(persist);
  store.questions = new InMemoryQuestionRepository(persist);
  store.events = new InMemoryEventRecorder(persist);

  const saved = file.load();
  if (saved) {
    for (const path of saved.paths) await store.paths.save(path);
    for (const concept of saved.concepts) await store.concepts.save(concept);
    for (const question of saved.questions) await store.questions.save(question);
    for (const event of saved.events) await store.events.record(event);
  } else {
    const { path, concepts } = createInitialSeedPath();
    await store.paths.save(path);
    for (const concept of concepts) await store.concepts.save(concept);
  }
  ready = true;
  if (!saved) persist();
  return store;
}

export function getLocalStore(): Promise<LocalStore> {
  globalForQalam.__qalamLocalStore ??= buildLocal();
  return globalForQalam.__qalamLocalStore;
}

export async function getContainer(): Promise<Container> {
  if (isSupabaseConfigured()) {
    // عميل لكل طلب لأن الجلسة (RLS) مرتبطة بملفات ارتباط الطلب
    const client = await createSupabaseServerClient();
    const recorder = new SupabaseEventRecorder(client as unknown as SupabaseInsertClient);
    const reader = new SupabaseEventReader(client as unknown as SupabaseDataClient);
    // الأسئلة بمفتاح الخدمة على الخادم فقط: التصحيح هنا ولا تصل الإجابات الصحيحة للمتصفح قبل التسليم
    return assemble(
      new SupabasePathRepository(client as unknown as SupabaseDataClient),
      {
        record: (event) => recorder.record(event),
        listByUser: (userId, types) => reader.listByUser(userId, types),
      },
      new SupabaseQuestionRepository(getServiceClient()),
    );
  }
  const local = await getLocalStore();
  return assemble(local.paths, local.events, local.questions);
}
