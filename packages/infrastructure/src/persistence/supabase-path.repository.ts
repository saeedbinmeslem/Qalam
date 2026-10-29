/**
 * @file supabase-path.repository.ts
 * @description محوّل مستودع المسارات على Supabase/Postgres.
 * يستعمل واجهة هيكلية صغيرة لعميل Supabase ليبقى قابلًا للاختبار بعميل وهمي.
 * القراءة تعمل بمفتاح anon (سياسات RLS تسمح بالقراءة للجميع)، والحفظ يحتاج مفتاح الخدمة.
 */

import type { PathRepositoryPort } from '@qalam/application';
import {
  LearningPath,
  Lesson,
  Module,
  VideoSegment,
  createConceptId,
  createLessonId,
  createModuleId,
  createPathId,
  type PathId,
} from '@qalam/domain';

interface QueryResult {
  data: unknown[] | null;
  error: { message: string } | null;
}

export interface SupabaseQuery extends PromiseLike<QueryResult> {
  eq(column: string, value: string): SupabaseQuery;
}

export interface SupabaseDataClient {
  from(table: string): {
    select(columns: string): SupabaseQuery;
    upsert(rows: Record<string, unknown>[]): PromiseLike<{ error: { message: string } | null }>;
    delete(): { eq(column: string, value: string): PromiseLike<{ error: { message: string } | null }> };
  };
}

export interface LessonRow {
  id: string;
  title: string;
  concept_id: string;
  video_id: string;
  start_seconds: number;
  end_seconds: number;
  source_url: string;
  channel_name: string;
  language: string | null;
  summary: string | null;
  reviewed_by_human: boolean | null;
  notes?: string | null;
  media_url?: string | null;
  study_guide?: string | null;
  order_index: number;
}

export interface ModuleRow {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  lessons: LessonRow[] | null;
}

export interface PathRow {
  id: string;
  title: string;
  description: string | null;
  target_goal: string;
  subject: string;
  created_at: string;
  updated_at: string;
  modules: ModuleRow[] | null;
}

const PATH_SELECT = '*, modules(*, lessons(*))';

/** تحويل صف قاعدة البيانات إلى كيان Domain (دالة نقية قابلة للاختبار) */
export function mapPathRow(row: PathRow): LearningPath {
  const path = new LearningPath({
    id: createPathId(row.id),
    title: row.title,
    description: row.description ?? '',
    targetGoal: row.target_goal,
    subject: row.subject,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  });

  for (const moduleRow of row.modules ?? []) {
    const module = new Module({
      id: createModuleId(moduleRow.id),
      title: moduleRow.title,
      description: moduleRow.description ?? '',
      orderIndex: moduleRow.order_index,
    });
    const lessons = [...(moduleRow.lessons ?? [])].sort((a, b) => a.order_index - b.order_index);
    for (const l of lessons) {
      module.addLesson(
        new Lesson({
          id: createLessonId(l.id),
          title: l.title,
          conceptId: createConceptId(l.concept_id),
          segment: new VideoSegment({
            videoId: l.video_id,
            startSeconds: l.start_seconds,
            endSeconds: l.end_seconds,
          }),
          sourceUrl: l.source_url,
          channelName: l.channel_name,
          language: l.language ?? 'ar',
          summary: l.summary ?? undefined,
          reviewedByHuman: l.reviewed_by_human ?? false,
          notes: l.notes ?? undefined,
          mediaUrl: l.media_url ?? undefined,
          studyGuide: l.study_guide ?? undefined,
        }),
      );
    }
    path.addModule(module);
  }
  return path;
}

export class SupabasePathRepository implements PathRepositoryPort {
  constructor(private readonly client: SupabaseDataClient) {}

  async save(path: LearningPath): Promise<void> {
    await this.upsert('learning_paths', [
      {
        id: path.id,
        title: path.title,
        description: path.description,
        target_goal: path.targetGoal,
        subject: path.subject,
        updated_at: new Date().toISOString(),
      },
    ]);
    await this.upsert(
      'modules',
      path.modules.map((m) => ({
        id: m.id,
        path_id: path.id,
        title: m.title,
        description: m.description,
        order_index: m.orderIndex,
      })),
    );
    await this.upsert(
      'lessons',
      path.modules.flatMap((m) =>
        m.lessons.map((l, index) => ({
          id: l.id,
          module_id: m.id,
          concept_id: l.conceptId,
          title: l.title,
          video_id: l.segment.videoId,
          start_seconds: l.segment.startSeconds,
          end_seconds: l.segment.endSeconds,
          source_url: l.sourceUrl,
          channel_name: l.channelName,
          language: l.language,
          summary: l.summary ?? null,
          reviewed_by_human: l.reviewedByHuman,
          notes: l.notes ?? null,
          media_url: l.mediaUrl ?? null,
          study_guide: l.studyGuide ?? null,
          order_index: index + 1,
        })),
      ),
    );
    await this.removeOrphans(path);
  }

  /** upsert لا يحذف؛ فنحذف ما أُزيل من المسار (دروس ثم وحدات) ليطابق قاعدة البيانات الكيان */
  private async removeOrphans(path: LearningPath): Promise<void> {
    for (const module of path.modules) {
      const keep = new Set(module.lessons.map((l) => l.id as string));
      const stored = await this.selectIds('lessons', 'module_id', module.id);
      for (const id of stored.filter((id) => !keep.has(id))) await this.remove('lessons', id);
    }
    const keepModules = new Set(path.modules.map((m) => m.id as string));
    const storedModules = await this.selectIds('modules', 'path_id', path.id);
    for (const id of storedModules.filter((id) => !keepModules.has(id))) await this.remove('modules', id);
  }

  async delete(id: PathId): Promise<void> {
    await this.remove('learning_paths', id);
  }

  private async selectIds(table: string, column: string, value: string): Promise<string[]> {
    const { data, error } = await this.client.from(table).select('id').eq(column, value);
    if (error) throw new Error(`تعذّرت قراءة ${table}: ${error.message}`);
    return ((data ?? []) as Array<{ id: string }>).map((r) => r.id);
  }

  private async remove(table: string, id: string): Promise<void> {
    const { error } = await this.client.from(table).delete().eq('id', id);
    if (error) throw new Error(`تعذّر حذف ${table}: ${error.message}`);
  }

  async findById(id: PathId): Promise<LearningPath | null> {
    const rows = await this.read(this.client.from('learning_paths').select(PATH_SELECT).eq('id', id));
    return rows[0] ? mapPathRow(rows[0]) : null;
  }

  async findBySubject(subject: string): Promise<LearningPath[]> {
    const rows = await this.read(
      this.client.from('learning_paths').select(PATH_SELECT).eq('subject', subject),
    );
    return rows.map(mapPathRow);
  }

  async findAll(): Promise<LearningPath[]> {
    const rows = await this.read(this.client.from('learning_paths').select(PATH_SELECT));
    return rows.map(mapPathRow);
  }

  private async read(query: SupabaseQuery): Promise<PathRow[]> {
    const { data, error } = await query;
    if (error) throw new Error(`تعذّرت قراءة المسارات: ${error.message}`);
    return (data ?? []) as PathRow[];
  }

  private async upsert(table: string, rows: Record<string, unknown>[]): Promise<void> {
    if (rows.length === 0) return;
    const { error } = await this.client.from(table).upsert(rows);
    if (error) throw new Error(`تعذّر حفظ ${table}: ${error.message}`);
  }
}
