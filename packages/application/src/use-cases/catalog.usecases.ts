/**
 * @file catalog.usecases.ts
 * @description حالات الاستخدام العامة لأقسام المنصة غير المسارات:
 *  - مكتبة الدروس: كل الدروس عبر المسارات مع بحث وتصفية.
 *  - خريطة المفاهيم: المفاهيم مرتبة بمستواها مع متطلباتها السابقة والدروس التي تشرحها.
 *  - لوحة المتعلم: تقدمه في كل المسارات واقتراحات الوكيل (مراجعة، إعادة اختبار، متابعة).
 * الصفحات تستدعيها فقط ولا تحمل منطقًا.
 */

import type { ConceptId, LearningPath, PathId, PathProgress } from '@qalam/domain';
import { calculatePathProgress } from '@qalam/domain';
import type { AgentAdvice } from '../agent/learning-agent.js';
import type { ConceptRepositoryPort } from '../ports/concept-repository.port.js';
import type { EventReaderPort } from '../ports/event-reader.port.js';
import type { PathRepositoryPort } from '../ports/path-repository.port.js';

/** تطبيع نص البحث: أحرف صغيرة وبلا تشكيل ولا تطويل، كي يطابق «الحاسوب» و«الحَاسُوب» */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .trim();
}

// ───────────────────────── مكتبة الدروس ─────────────────────────

export interface LibraryLesson {
  lessonId: string;
  title: string;
  summary?: string;
  channelName: string;
  durationSeconds: number;
  reviewedByHuman: boolean;
  /** معرّف يوتيوب للمصغّرة الرسمية؛ غائب للدروس المرفوعة */
  youtubeVideoId?: string;
  pathId: PathId;
  pathTitle: string;
  moduleTitle: string;
}

export interface LessonLibrary {
  lessons: LibraryLesson[];
  /** كل المسارات (لقائمة التصفية)، بصرف النظر عن البحث الحالي */
  paths: { id: PathId; title: string }[];
  /** كل القنوات المذكورة (الشفافية: عرض المصدر دائمًا) */
  channels: string[];
}

export class SearchLessonLibraryUseCase {
  constructor(private readonly paths: PathRepositoryPort) {}

  async execute(filter: { query?: string; pathId?: string; channel?: string } = {}): Promise<LessonLibrary> {
    const all = await this.paths.findAll();
    const entries: LibraryLesson[] = all.flatMap((path) =>
      path.modules.flatMap((module) =>
        module.lessons.map((lesson) => ({
          lessonId: lesson.id as string,
          title: lesson.title,
          ...(lesson.summary ? { summary: lesson.summary } : {}),
          channelName: lesson.channelName,
          durationSeconds: lesson.segment.durationSeconds,
          reviewedByHuman: lesson.reviewedByHuman,
          ...(lesson.youtubeVideoId ? { youtubeVideoId: lesson.youtubeVideoId } : {}),
          pathId: path.id,
          pathTitle: path.title,
          moduleTitle: module.title,
        })),
      ),
    );

    const needle = filter.query ? normalize(filter.query) : '';
    const lessons = entries.filter(
      (l) =>
        (!filter.pathId || l.pathId === filter.pathId) &&
        (!filter.channel || l.channelName === filter.channel) &&
        (!needle || normalize(`${l.title} ${l.summary ?? ''} ${l.channelName} ${l.moduleTitle}`).includes(needle)),
    );

    return {
      lessons,
      paths: all.map((p) => ({ id: p.id, title: p.title })),
      channels: [...new Set(entries.map((l) => l.channelName))].sort((a, b) => a.localeCompare(b, 'ar')),
    };
  }
}

// ───────────────────────── خريطة المفاهيم ─────────────────────────

export interface ConceptMapItem {
  id: ConceptId;
  name: string;
  description: string;
  level: number;
  /** المسار الذي يتبعه المفهوم (لا مفاهيم عامة) */
  pathId: PathId;
  pathTitle: string;
  prerequisites: { id: ConceptId; name: string }[];
  /** دروس كورسات المفهوم، لربط الخريطة بالمسارات */
  lessons: { id: string; title: string; pathId: PathId }[];
}

export class GetConceptMapUseCase {
  constructor(
    private readonly concepts: ConceptRepositoryPort,
    private readonly paths: PathRepositoryPort,
  ) {}

  /** المفاهيم مرتبة بالمستوى ثم بالاسم، مجمّعة في `levels` */
  async execute(): Promise<{ levels: { level: number; concepts: ConceptMapItem[] }[]; total: number }> {
    const [concepts, paths] = await Promise.all([this.concepts.findAll(), this.paths.findAll()]);
    const names = new Map(concepts.map((c) => [c.id as string, c.name]));
    const pathTitles = new Map(paths.map((p) => [p.id as string, p.title]));
    const taught = new Map<string, ConceptMapItem['lessons']>();
    for (const path of paths) {
      const conceptOf = path.lessonConceptMap();
      for (const lesson of path.modules.flatMap((m) => m.lessons)) {
        const conceptId = conceptOf.get(lesson.id) as string;
        const list = taught.get(conceptId) ?? [];
        list.push({ id: lesson.id as string, title: lesson.title, pathId: path.id });
        taught.set(conceptId, list);
      }
    }

    const items: ConceptMapItem[] = concepts.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      level: c.level,
      pathId: c.pathId,
      pathTitle: pathTitles.get(c.pathId as string) ?? '',
      prerequisites: c.prerequisiteIds.map((id) => ({ id, name: names.get(id as string) ?? (id as string) })),
      lessons: taught.get(c.id as string) ?? [],
    }));

    const byLevel = new Map<number, ConceptMapItem[]>();
    for (const item of items) byLevel.set(item.level, [...(byLevel.get(item.level) ?? []), item]);
    const levels = [...byLevel.entries()]
      .sort(([a], [b]) => a - b)
      .map(([level, list]) => ({ level, concepts: list.sort((a, b) => a.name.localeCompare(b.name, 'ar')) }));
    return { levels, total: items.length };
  }
}

// ───────────────────────── لوحة المتعلم ─────────────────────────

/** وكيل التعلّم كما تحتاجه اللوحة (واجهة ضيقة لسهولة الاختبار) */
export interface AdviceSource {
  run(request: { userId: string; pathId: PathId }): Promise<AgentAdvice | null>;
}

export interface DashboardPath {
  path: LearningPath;
  progress: PathProgress;
  /** اقتراح الوكيل للمسارات التي بدأها المتعلم فقط (لا نسجّل قرارات لمسارات لم يفتحها) */
  advice: AgentAdvice | null;
}

export interface LearnerDashboard {
  paths: DashboardPath[];
  totals: {
    pathsStarted: number;
    lessonsCompleted: number;
    lessonsSkipped: number;
    lessonsTotal: number;
    /** متوسط آخر نسب الاختبارات، أو null إن لم يُجرَ اختبار */
    quizAveragePercent: number | null;
  };
  /** المسار الأولى بالمتابعة: أول مسار بدأه ولم يكمله */
  continueWith: DashboardPath | null;
  /** اقتراحات تحتاج فعلًا: كل ما ليس «تقدّم» */
  attention: DashboardPath[];
}

export class GetLearnerDashboardUseCase {
  constructor(
    private readonly paths: PathRepositoryPort,
    private readonly events: EventReaderPort,
    private readonly agent: AdviceSource,
  ) {}

  async execute(request: { userId: string }): Promise<LearnerDashboard> {
    const [paths, events] = await Promise.all([
      this.paths.findAll(),
      this.events.listByUser(request.userId, ['lesson_completed', 'plan_decision', 'attempt_submitted']),
    ]);

    const entries: DashboardPath[] = [];
    for (const path of paths) {
      const progress = calculatePathProgress(path, events);
      const started = progress.completedCount + progress.skippedCount > 0;
      const advice = started ? await this.agent.run({ userId: request.userId, pathId: path.id }).catch(() => null) : null;
      entries.push({ path, progress, advice });
    }

    const started = entries.filter((e) => e.progress.completedCount + e.progress.skippedCount > 0);
    const allPercents = started.flatMap((e) => [...e.progress.quizPercentByLesson.values()]);

    return {
      paths: entries,
      totals: {
        pathsStarted: started.length,
        lessonsCompleted: entries.reduce((sum, e) => sum + e.progress.completedCount, 0),
        lessonsSkipped: entries.reduce((sum, e) => sum + e.progress.skippedCount, 0),
        lessonsTotal: entries.reduce((sum, e) => sum + e.progress.totalCount, 0),
        quizAveragePercent:
          allPercents.length === 0 ? null : Math.round(allPercents.reduce((a, b) => a + b, 0) / allPercents.length),
      },
      continueWith: started.find((e) => e.progress.nextLesson !== null) ?? null,
      attention: started.filter((e) => e.advice !== null && e.advice.decision.action !== 'proceed'),
    };
  }
}
