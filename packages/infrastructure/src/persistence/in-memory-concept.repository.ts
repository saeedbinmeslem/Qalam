/**
 * @file in-memory-concept.repository.ts
 * @description مستودع المفاهيم بالذاكرة (التطوير المحلي والاختبار).
 */

import type { Concept, ConceptId, PathId } from '@qalam/domain';
import type { ConceptRepositoryPort } from '@qalam/application';

export class InMemoryConceptRepository implements ConceptRepositoryPort {
  private readonly concepts = new Map<string, Concept>();

  constructor(private readonly onChange?: () => void) {}

  async save(concept: Concept): Promise<void> {
    this.concepts.set(concept.id, concept);
    this.onChange?.();
  }

  /** نسخة متزامنة من كل المفاهيم (للّقطة المحلية) */
  list(): Concept[] {
    return [...this.concepts.values()];
  }

  async findById(id: ConceptId): Promise<Concept | null> {
    return this.concepts.get(id) ?? null;
  }

  async findAll(): Promise<Concept[]> {
    return [...this.concepts.values()];
  }

  async findByPath(pathId: PathId): Promise<Concept[]> {
    return [...this.concepts.values()].filter((c) => c.pathId === pathId);
  }

  async delete(id: ConceptId): Promise<void> {
    this.concepts.delete(id);
    this.onChange?.();
  }
}
