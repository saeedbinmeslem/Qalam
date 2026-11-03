/**
 * @file fetch-transcripts.usecases.ts
 * @description جلب النصوص المفرّغة لدروس المسار وتخزينها (يشغّله السكربت المحلي من جهاز المالك، فعنوانه السكني
 * لا يُحظر كما تُحظر مراكز البيانات). لا يتحقق من مستخدم لأنه يعمل بمفتاح الخدمة من سطر الأوامر لا من الواجهة.
 * لطف مع يوتيوب: فيديو واحد في كل مرة بتأخير بينها، ويتوقف عند توالي الإخفاق (حظر محتمل) بدل الإلحاح.
 */

import { createPathId, type LearningPath } from '@qalam/domain';
import { NotFoundError } from '../errors.js';
import type { PathRepositoryPort } from '../ports/path-repository.port.js';
import type { TranscriptSourcePort, TranscriptStorePort } from '../ports/transcript.port.js';

const MAX_CONSECUTIVE_FAILURES = 3;
const DEFAULT_DELAY_MS = 2500;

export interface FetchTranscriptsResult {
  fetched: number;
  /** كان محفوظًا من قبل */
  skipped: number;
  /** لا نص لهذا الفيديو (بلا ترجمة) */
  unavailable: number;
  failures: { videoId: string; message: string }[];
  /** توقف مبكرًا بسبب توالي الإخفاق */
  stoppedEarly: boolean;
}

export class FetchTranscriptsUseCase {
  constructor(
    private readonly deps: { paths: PathRepositoryPort; source: TranscriptSourcePort; store: TranscriptStorePort },
    private readonly sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
  ) {}

  /** `pathId` يحصر العمل في مسار؛ بدونه يشمل كل المسارات */
  async execute(
    request: { pathId?: string; courseId?: string; delayMs?: number; onProgress?: (done: number, total: number, videoId: string) => void } = {},
  ): Promise<FetchTranscriptsResult> {
    const paths: LearningPath[] = request.pathId
      ? [await this.load(request.pathId)]
      : await this.deps.paths.findAll();
    const lessons = paths.flatMap((p) =>
      (request.courseId ? p.courses.filter((c) => c.id === request.courseId) : p.courses).flatMap((c) =>
        c.modules.flatMap((m) => m.lessons),
      ),
    );
    const videos = new Map<string, string | undefined>();
    for (const lesson of lessons) {
      if (lesson.youtubeVideoId) videos.set(lesson.youtubeVideoId, lesson.language);
    }

    const result: FetchTranscriptsResult = { fetched: 0, skipped: 0, unavailable: 0, failures: [], stoppedEarly: false };
    let consecutive = 0;
    let first = true;
    const stored = await this.deps.store.existing([...videos.keys()]);
    let index = 0;
    for (const [videoId, language] of videos) {
      request.onProgress?.(++index, videos.size, videoId);
      if (stored.has(videoId)) {
        result.skipped += 1;
        continue;
      }
      if (consecutive >= MAX_CONSECUTIVE_FAILURES) {
        result.stoppedEarly = true;
        break;
      }
      if (!first) await this.sleep(request.delayMs ?? DEFAULT_DELAY_MS);
      first = false;
      try {
        const segments = await this.deps.source.fetch(videoId, language);
        if (segments && segments.length > 0) {
          await this.deps.store.save(videoId, segments);
          result.fetched += 1;
        } else {
          result.unavailable += 1;
        }
        consecutive = 0;
      } catch (error) {
        consecutive += 1;
        result.failures.push({ videoId, message: error instanceof Error ? error.message : 'خطأ غير معروف' });
      }
    }
    return result;
  }

  private async load(pathId: string): Promise<LearningPath> {
    const path = await this.deps.paths.findById(createPathId(pathId));
    if (!path) throw new NotFoundError('المسار');
    return path;
  }
}
