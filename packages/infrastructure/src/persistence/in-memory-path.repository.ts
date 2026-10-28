/**
 * @file in-memory-path.repository.ts
 * @description محوّل مستودع المسارات بالذاكرة (In-Memory Path Repository Adapter)
 *
 * يوفر تنفيذاً سريعاً ومستقلاً عن أي خادم خارجي لتشغيل النظام محلياً أثناء التطوير والاختبار.
 */

import type { LearningPath, PathId } from '@qalam/domain';
import type { PathRepositoryPort } from '@qalam/application';

export class InMemoryPathRepository implements PathRepositoryPort {
  private readonly paths = new Map<string, LearningPath>();

  /** onChange: يُستدعى بعد كل تعديل (يستعمله التخزين المحلي بملف لحفظ لقطة) */
  constructor(private readonly onChange?: () => void) {}

  async save(path: LearningPath): Promise<void> {
    this.paths.set(path.id, path);
    this.onChange?.();
  }

  /** نسخة متزامنة من كل المسارات (للّقطة المحلية) */
  list(): LearningPath[] {
    return [...this.paths.values()];
  }

  async delete(id: PathId): Promise<void> {
    this.paths.delete(id);
    this.onChange?.();
  }

  async findById(id: PathId): Promise<LearningPath | null> {
    return this.paths.get(id) ?? null;
  }

  async findBySubject(subject: string): Promise<LearningPath[]> {
    return Array.from(this.paths.values()).filter(
      (p) => p.subject.toLowerCase() === subject.toLowerCase()
    );
  }

  async findAll(): Promise<LearningPath[]> {
    return Array.from(this.paths.values());
  }

  /**
   * تفريغ الذاكرة (مفيد في إعادة ضبط الاختبارات)
   */
  clear(): void {
    this.paths.clear();
  }
}
