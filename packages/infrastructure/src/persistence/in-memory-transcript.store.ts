/**
 * @file in-memory-transcript.store.ts
 * @description مخزن النصوص المفرّغة بالذاكرة (التطوير المحلي والاختبار).
 */
import type { TranscriptStorePort } from '@qalam/application';
import type { TranscriptSegment } from '@qalam/domain';

export class InMemoryTranscriptStore implements TranscriptStorePort {
  private readonly items = new Map<string, TranscriptSegment[]>();

  async find(videoId: string): Promise<TranscriptSegment[] | null> {
    return this.items.get(videoId) ?? null;
  }

  async save(videoId: string, segments: TranscriptSegment[]): Promise<void> {
    this.items.set(videoId, segments);
  }
}
