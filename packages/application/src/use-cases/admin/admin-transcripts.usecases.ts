/**
 * @file admin-transcripts.usecases.ts
 * @description النصوص المفرّغة من لوحة التحكم: عدّ دروس كورس بلا نص محفوظ، وجلبها في الخلفية.
 * الجلب من الخادم قد يحظره يوتيوب (عناوين مراكز البيانات)؛ عندها يُوجَّه المالك للسكربت المحلي
 * (`npm run fetch-transcripts`)، أما النص الناقص فلا يوقف شيئًا لأن إعداد الدرس يعود لقراءة الفيديو.
 */

import { createCourseId } from '@qalam/domain';
import { NotFoundError } from '../../errors.js';
import type { TranscriptSourcePort, TranscriptStorePort } from '../../ports/transcript.port.js';
import { FetchTranscriptsUseCase, type FetchTranscriptsResult } from '../fetch-transcripts.usecases.js';
import { loadPath, requireAdmin, type AdminDeps, type AdminRequest } from './admin-deps.js';

export interface TranscriptAdminDeps extends AdminDeps {
  transcriptSource: TranscriptSourcePort;
  transcriptStore: TranscriptStorePort;
}

export interface TranscriptCoverage {
  /** دروس الكورس المعروضة من يوتيوب (المرفوعة لا نص لها) */
  total: number;
  /** منها ما له نص محفوظ */
  stored: number;
}

export class CountCourseTranscriptsUseCase {
  constructor(private readonly deps: TranscriptAdminDeps) {}

  async execute(request: AdminRequest & { pathId: string; courseId: string }): Promise<TranscriptCoverage> {
    requireAdmin(this.deps.policy, request.actor);
    const path = await loadPath(this.deps.paths, request.pathId);
    const course = path.findCourse(createCourseId(request.courseId));
    if (!course) throw new NotFoundError('الكورس');
    const ids = [
      ...new Set(
        course.modules.flatMap((m) => m.lessons).flatMap((l) => (l.youtubeVideoId ? [l.youtubeVideoId] : [])),
      ),
    ];
    const stored = await this.deps.transcriptStore.existing(ids);
    return { total: ids.length, stored: stored.size };
  }
}

export class FetchCourseTranscriptsUseCase {
  private readonly fetcher: FetchTranscriptsUseCase;

  constructor(
    private readonly deps: TranscriptAdminDeps,
    sleep?: (ms: number) => Promise<void>,
  ) {
    this.fetcher = new FetchTranscriptsUseCase(
      { paths: deps.paths, source: deps.transcriptSource, store: deps.transcriptStore },
      sleep,
    );
  }

  async execute(
    request: AdminRequest & { pathId: string; courseId: string; onProgress?: (done: number, total: number) => void },
  ): Promise<FetchTranscriptsResult> {
    requireAdmin(this.deps.policy, request.actor);
    return this.fetcher.execute({
      pathId: request.pathId,
      courseId: request.courseId,
      onProgress: (done, total) => request.onProgress?.(done, total),
    });
  }
}
