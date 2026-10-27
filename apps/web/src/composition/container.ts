/**
 * @file container.ts
 * @description Composition Root: النقطة الوحيدة التي تربط التنفيذات (Infrastructure)
 * بالمنافذ (Ports) وحالات الاستخدام. الصفحات تستورد من هنا فقط.
 * مع مفاتيح Supabase: قاعدة البيانات الفعلية. بدونها: ذاكرة + بذرة (للتطوير والاختبار).
 */
import {
  GetLearningPathUseCase,
  GetLessonUseCase,
  GetPathProgressUseCase,
  ListLearningPathsUseCase,
  RecordLearningEventUseCase,
  type EventReaderPort,
  type EventRecorderPort,
  type PathRepositoryPort,
} from '@qalam/application';
import {
  InMemoryConceptRepository,
  InMemoryEventRecorder,
  InMemoryPathRepository,
  SupabaseEventReader,
  SupabaseEventRecorder,
  SupabasePathRepository,
  createInitialSeedPath,
  systemClock,
  type SupabaseDataClient,
  type SupabaseInsertClient,
} from '@qalam/infrastructure';
import { createSupabaseServerClient, isSupabaseConfigured } from './auth';

export interface Container {
  getPathProgress: GetPathProgressUseCase;
  getLearningPath: GetLearningPathUseCase;
  getLesson: GetLessonUseCase;
  listLearningPaths: ListLearningPathsUseCase;
  recordLearningEvent: RecordLearningEventUseCase;
}

function assemble(paths: PathRepositoryPort, events: EventRecorderPort & EventReaderPort): Container {
  return {
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
  events: InMemoryEventRecorder;
}

// على globalThis لأن Next في وضع التطوير قد يحمّل الوحدة أكثر من مرة (صفحات وإجراءات الخادم)
const globalForQalam = globalThis as typeof globalThis & { __qalamLocalStore?: Promise<LocalStore> };

async function buildLocal(): Promise<LocalStore> {
  const { path, concepts } = createInitialSeedPath();
  const store: LocalStore = {
    paths: new InMemoryPathRepository(),
    concepts: new InMemoryConceptRepository(),
    events: new InMemoryEventRecorder(),
  };
  await store.paths.save(path);
  for (const concept of concepts) await store.concepts.save(concept);
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
    return assemble(new SupabasePathRepository(client as unknown as SupabaseDataClient), {
      record: (event) => recorder.record(event),
      listByUser: (userId, types) => reader.listByUser(userId, types),
    });
  }
  const local = await getLocalStore();
  return assemble(local.paths, local.events);
}
