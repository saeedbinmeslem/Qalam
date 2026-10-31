/**
 * @file supabase-concept.repository.ts
 * @description مستودع المفاهيم على Supabase: جدولا concepts وconcept_prerequisites.
 * القراءة مفتوحة، والكتابة تحتاج مفتاح الخدمة (سياسات RLS للقراءة فقط).
 */

import type { ConceptRepositoryPort } from '@qalam/application';
import { Concept, createConceptId, createPathId, type ConceptId, type PathId } from '@qalam/domain';
import type { SupabaseDataClient } from './supabase-path.repository.js';

interface ConceptRow {
  id: string;
  path_id: string;
  name: string;
  description: string | null;
  level: number;
  created_at: string;
}

interface PrerequisiteRow {
  concept_id: string;
  prerequisite_concept_id: string;
}

export function mapConceptRows(rows: ConceptRow[], prerequisites: PrerequisiteRow[]): Concept[] {
  return rows.map(
    (row) =>
      new Concept({
        id: createConceptId(row.id),
        pathId: createPathId(row.path_id),
        name: row.name,
        description: row.description ?? '',
        level: row.level,
        prerequisiteIds: prerequisites
          .filter((p) => p.concept_id === row.id)
          .map((p) => createConceptId(p.prerequisite_concept_id)),
        createdAt: new Date(row.created_at),
      }),
  );
}

export class SupabaseConceptRepository implements ConceptRepositoryPort {
  constructor(private readonly client: SupabaseDataClient) {}

  async save(concept: Concept): Promise<void> {
    const saved = await this.client.from('concepts').upsert([
      { id: concept.id, path_id: concept.pathId, name: concept.name, description: concept.description, level: concept.level },
    ]);
    if (saved.error) throw new Error(`تعذّر حفظ المفهوم: ${saved.error.message}`);

    // المتطلبات تُستبدل كاملة: نحذف القديمة ثم نكتب الجديدة
    const cleared = await this.client.from('concept_prerequisites').delete().eq('concept_id', concept.id);
    if (cleared.error) throw new Error(`تعذّر تحديث المتطلبات: ${cleared.error.message}`);
    if (concept.prerequisiteIds.length > 0) {
      const written = await this.client.from('concept_prerequisites').upsert(
        concept.prerequisiteIds.map((p) => ({ concept_id: concept.id, prerequisite_concept_id: p })),
      );
      if (written.error) throw new Error(`تعذّر حفظ المتطلبات: ${written.error.message}`);
    }
  }

  async findById(id: ConceptId): Promise<Concept | null> {
    return (await this.findAll()).find((c) => c.id === id) ?? null;
  }

  async findAll(): Promise<Concept[]> {
    const concepts = await this.client.from('concepts').select('*');
    if (concepts.error) throw new Error(`تعذّرت قراءة المفاهيم: ${concepts.error.message}`);
    const prerequisites = await this.client.from('concept_prerequisites').select('*');
    if (prerequisites.error) throw new Error(`تعذّرت قراءة المتطلبات: ${prerequisites.error.message}`);
    return mapConceptRows((concepts.data ?? []) as ConceptRow[], (prerequisites.data ?? []) as PrerequisiteRow[]);
  }

  async findByPath(pathId: PathId): Promise<Concept[]> {
    return (await this.findAll()).filter((c) => c.pathId === pathId);
  }

  async delete(id: ConceptId): Promise<void> {
    const { error } = await this.client.from('concepts').delete().eq('id', id);
    if (error) throw new Error(`تعذّر حذف المفهوم: ${error.message}`);
  }
}
