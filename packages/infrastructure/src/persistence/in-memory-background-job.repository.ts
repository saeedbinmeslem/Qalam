/**
 * @file in-memory-background-job.repository.ts
 * @description سجل العمليات الخلفية بالذاكرة (التطوير المحلي والاختبار).
 */
import type { BackgroundJob, BackgroundJobPort } from '@qalam/application';

export class InMemoryBackgroundJobRepository implements BackgroundJobPort {
  private readonly jobs = new Map<string, BackgroundJob>();

  async save(job: BackgroundJob): Promise<void> {
    this.jobs.set(job.id, job);
  }

  async findById(id: string): Promise<BackgroundJob | null> {
    return this.jobs.get(id) ?? null;
  }

  async findRecent(limit: number): Promise<BackgroundJob[]> {
    return [...this.jobs.values()].sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime()).slice(0, limit);
  }
}
