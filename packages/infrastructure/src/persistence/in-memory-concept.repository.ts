/**
 * @file in-memory-concept.repository.ts
 * @description مستودع المفاهيم بالذاكرة (التطوير المحلي والاختبار).
 */

import type { Concept, ConceptId } from '@qalam/domain';
import type { ConceptRepositoryPort } from '@qalam/application';

export class InMemoryConceptRepository implements ConceptRepositoryPort {
  private readonly concepts = new Map<string, Concept>();

  async save(concept: Concept): Promise<void> {
    this.concepts.set(concept.id, concept);
  }

  async findById(id: ConceptId): Promise<Concept | null> {
    return this.concepts.get(id) ?? null;
  }

  async findAll(): Promise<Concept[]> {
    return [...this.concepts.values()];
  }

  async delete(id: ConceptId): Promise<void> {
    this.concepts.delete(id);
  }
}
