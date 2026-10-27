/**
 * @file get-path-progress.usecase.ts
 * @description تقدم المتعلم في مسار: يقرأ المسار وأحداث المستخدم ويحسب التقدم في Domain.
 */

import { calculatePathProgress, type PathId, type PathProgress } from '@qalam/domain';
import type { EventReaderPort } from '../ports/event-reader.port.js';
import type { PathRepositoryPort } from '../ports/path-repository.port.js';

export class GetPathProgressUseCase {
  constructor(
    private readonly paths: PathRepositoryPort,
    private readonly events: EventReaderPort,
  ) {}

  async execute(request: { userId: string; pathId: PathId }): Promise<PathProgress> {
    const path = await this.paths.findById(request.pathId);
    if (!path) throw new Error(`المسار التعليمي ذو المعرّف "${request.pathId}" غير موجود`);
    const events = await this.events.listByUser(request.userId, ['lesson_completed']);
    return calculatePathProgress(path, events);
  }
}
