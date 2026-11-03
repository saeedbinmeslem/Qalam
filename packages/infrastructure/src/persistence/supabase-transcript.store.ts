/**
 * @file supabase-transcript.store.ts
 * @description مخزن النصوص المفرّغة على Supabase (جدول video_transcripts). مصدر داخلي للمالك فقط:
 * يُقرأ ويُكتب بمفتاح الخدمة، ولا سياسة قراءة عامة فلا يصل المتعلم.
 */
import type { TranscriptStorePort } from '@qalam/application';
import type { TranscriptSegment } from '@qalam/domain';
import type { SupabaseDataClient } from './supabase-path.repository.js';

interface TranscriptRow {
  video_id: string;
  segments: TranscriptSegment[];
}

export class SupabaseTranscriptStore implements TranscriptStorePort {
  constructor(private readonly client: SupabaseDataClient) {}

  async find(videoId: string): Promise<TranscriptSegment[] | null> {
    const { data, error } = await this.client.from('video_transcripts').select('*').eq('video_id', videoId);
    if (error) throw new Error(`تعذّرت قراءة النص المفرّغ: ${error.message}`);
    const row = ((data ?? []) as TranscriptRow[])[0];
    return row ? row.segments : null;
  }

  async existing(videoIds: string[]): Promise<Set<string>> {
    if (videoIds.length === 0) return new Set();
    // عمود المعرّفات وحده (صغير) دون المقاطع؛ نرشّح هنا لأن واجهة العميل المصغّرة لا تعرّف in()
    const { data, error } = await this.client.from('video_transcripts').select('video_id');
    if (error) throw new Error(`تعذّرت قراءة النصوص المفرّغة: ${error.message}`);
    const wanted = new Set(videoIds);
    return new Set(((data ?? []) as { video_id: string }[]).map((r) => r.video_id).filter((id) => wanted.has(id)));
  }

  async save(videoId: string, segments: TranscriptSegment[]): Promise<void> {
    const { error } = await this.client.from('video_transcripts').upsert([
      { video_id: videoId, segments, fetched_at: new Date().toISOString() },
    ]);
    if (error) throw new Error(`تعذّر حفظ النص المفرّغ: ${error.message}`);
  }
}
