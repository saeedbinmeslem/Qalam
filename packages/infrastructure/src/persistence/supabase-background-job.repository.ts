/**
 * @file supabase-background-job.repository.ts
 * @description سجل العمليات الخلفية على Supabase (جدول background_jobs). يُكتب ويُقرأ بمفتاح الخدمة فقط.
 */
import type { BackgroundJob, BackgroundJobPort, BackgroundJobStatus } from '@qalam/application';
import type { SupabaseDataClient } from './supabase-path.repository.js';

interface JobRow {
  id: string;
  job_key: string;
  label: string;
  status: string;
  message: string | null;
  started_at: string;
  finished_at: string | null;
}

const toJob = (row: JobRow): BackgroundJob => ({
  id: row.id,
  key: row.job_key,
  label: row.label,
  status: row.status as BackgroundJobStatus,
  message: row.message ?? '',
  startedAt: new Date(row.started_at),
  finishedAt: row.finished_at ? new Date(row.finished_at) : undefined,
});

export class SupabaseBackgroundJobRepository implements BackgroundJobPort {
  constructor(private readonly client: SupabaseDataClient) {}

  async save(job: BackgroundJob): Promise<void> {
    const { error } = await this.client.from('background_jobs').upsert([
      {
        id: job.id,
        job_key: job.key,
        label: job.label,
        status: job.status,
        message: job.message,
        started_at: job.startedAt.toISOString(),
        finished_at: job.finishedAt?.toISOString() ?? null,
      },
    ]);
    if (error) throw new Error(`تعذّر حفظ حالة العملية: ${error.message}`);
  }

  async findById(id: string): Promise<BackgroundJob | null> {
    return (await this.readAll()).find((j) => j.id === id) ?? null;
  }

  async findRecent(limit: number): Promise<BackgroundJob[]> {
    return (await this.readAll()).sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime()).slice(0, limit);
  }

  private async readAll(): Promise<BackgroundJob[]> {
    const { data, error } = await this.client.from('background_jobs').select('*');
    if (error) throw new Error(`تعذّرت قراءة العمليات: ${error.message}`);
    return ((data ?? []) as JobRow[]).map(toJob);
  }
}
