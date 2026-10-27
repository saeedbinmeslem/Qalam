/**
 * @file admin-concepts.usecases.ts
 * @description إدارة المفاهيم ومتطلباتها السابقة. يجب أن يبقى الرسم بلا دورات،
 * ولا يُحذف مفهوم تستعمله دروس أو مفاهيم أخرى.
 */

import { Concept, createConceptId, wouldCreateCycle, type ConceptId } from '@qalam/domain';
import { NotFoundError } from '../../errors.js';
import { requireAdmin, type AdminDeps, type AdminRequest } from './admin-deps.js';

interface ConceptFields {
  name: string;
  description: string;
  level: number;
  prerequisiteIds: string[];
}

async function assertValidPrerequisites(
  deps: AdminDeps,
  conceptId: ConceptId,
  prerequisiteIds: ConceptId[],
): Promise<void> {
  const all = await deps.concepts.findAll();
  const known = new Set(all.map((c) => c.id));
  if (prerequisiteIds.some((id) => !known.has(id))) throw new NotFoundError('المتطلب السابق');
  if (wouldCreateCycle(all, conceptId, prerequisiteIds)) {
    throw new Error('هذه المتطلبات تُنشئ دورة بين المفاهيم، فلا يمكن ترتيبها');
  }
}

export class CreateConceptUseCase {
  constructor(private readonly deps: AdminDeps) {}

  async execute(request: AdminRequest & ConceptFields): Promise<{ conceptId: string }> {
    requireAdmin(this.deps.policy, request.actor);
    const id = createConceptId(this.deps.ids.next('concept'));
    const prerequisiteIds = request.prerequisiteIds.map(createConceptId);
    await assertValidPrerequisites(this.deps, id, prerequisiteIds);
    await this.deps.concepts.save(
      new Concept({ id, name: request.name, description: request.description, level: request.level, prerequisiteIds }),
    );
    return { conceptId: id };
  }
}

export class UpdateConceptUseCase {
  constructor(private readonly deps: AdminDeps) {}

  async execute(request: AdminRequest & ConceptFields & { conceptId: string }): Promise<void> {
    requireAdmin(this.deps.policy, request.actor);
    const id = createConceptId(request.conceptId);
    const existing = await this.deps.concepts.findById(id);
    if (!existing) throw new NotFoundError('المفهوم');
    const prerequisiteIds = request.prerequisiteIds.map(createConceptId);
    await assertValidPrerequisites(this.deps, id, prerequisiteIds);
    await this.deps.concepts.save(
      existing.update({
        name: request.name,
        description: request.description,
        level: request.level,
        prerequisiteIds,
      }),
    );
  }
}

export class DeleteConceptUseCase {
  constructor(private readonly deps: AdminDeps) {}

  async execute(request: AdminRequest & { conceptId: string }): Promise<void> {
    requireAdmin(this.deps.policy, request.actor);
    const id = createConceptId(request.conceptId);
    if (!(await this.deps.concepts.findById(id))) throw new NotFoundError('المفهوم');

    const usedByLessons = (await this.deps.paths.findAll()).some((p) =>
      p.modules.some((m) => m.lessons.some((l) => l.conceptId === id)),
    );
    if (usedByLessons) throw new Error('لا يمكن حذف مفهوم ترتبط به دروس. انقل الدروس إلى مفهوم آخر أولًا');

    const usedAsPrerequisite = (await this.deps.concepts.findAll()).some((c) => c.hasPrerequisite(id));
    if (usedAsPrerequisite) throw new Error('لا يمكن حذف مفهوم هو متطلب سابق لمفاهيم أخرى');

    await this.deps.concepts.delete(id);
  }
}

/** قائمة المفاهيم لعرضها في اللوحة (يتطلب مديرًا لأنها شاشة إدارية) */
export class ListConceptsUseCase {
  constructor(private readonly deps: AdminDeps) {}

  async execute(request: AdminRequest): Promise<Concept[]> {
    requireAdmin(this.deps.policy, request.actor);
    const all = await this.deps.concepts.findAll();
    return all.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, 'ar'));
  }
}
