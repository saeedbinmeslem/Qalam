/**
 * @file admin-concepts.usecases.ts
 * @description إدارة مفاهيم المسار ومتطلباتها السابقة. المفهوم يتبع مسارًا واحدًا (لا مفاهيم عامة)، ومتطلباته
 * من المسار نفسه فقط. يجب أن يبقى الرسم بلا دورات، ولا يُحذف مفهوم تستعمله كورسات أو مفاهيم أخرى.
 */

import { Concept, createConceptId, createPathId, wouldCreateCycle, type ConceptId, type PathId } from '@qalam/domain';
import { NotFoundError } from '../../errors.js';
import { loadPath, requireAdmin, type AdminDeps, type AdminRequest } from './admin-deps.js';

interface ConceptFields {
  name: string;
  description: string;
  level: number;
  prerequisiteIds: string[];
}

async function assertValidPrerequisites(
  deps: AdminDeps,
  pathId: PathId,
  conceptId: ConceptId,
  prerequisiteIds: ConceptId[],
): Promise<void> {
  const inPath = await deps.concepts.findByPath(pathId);
  const known = new Set(inPath.map((c) => c.id));
  if (prerequisiteIds.some((id) => !known.has(id))) throw new NotFoundError('المتطلب السابق (يجب أن يكون من المسار نفسه)');
  if (wouldCreateCycle(inPath, conceptId, prerequisiteIds)) {
    throw new Error('هذه المتطلبات تُنشئ دورة بين المفاهيم، فلا يمكن ترتيبها');
  }
}

export class CreateConceptUseCase {
  constructor(private readonly deps: AdminDeps) {}

  async execute(request: AdminRequest & ConceptFields & { pathId: string }): Promise<{ conceptId: string }> {
    requireAdmin(this.deps.policy, request.actor);
    const path = await loadPath(this.deps.paths, request.pathId);
    const id = createConceptId(this.deps.ids.next('concept'));
    const prerequisiteIds = request.prerequisiteIds.map(createConceptId);
    await assertValidPrerequisites(this.deps, path.id, id, prerequisiteIds);
    await this.deps.concepts.save(
      new Concept({
        id,
        pathId: path.id,
        name: request.name,
        description: request.description,
        level: request.level,
        prerequisiteIds,
      }),
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
    await assertValidPrerequisites(this.deps, existing.pathId, id, prerequisiteIds);
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
    const concept = await this.deps.concepts.findById(id);
    if (!concept) throw new NotFoundError('المفهوم');

    const path = await this.deps.paths.findById(concept.pathId);
    if (path?.courses.some((c) => c.conceptId === id)) {
      throw new Error('لا يمكن حذف مفهوم له كورسات. انقل كورساته إلى مفهوم آخر أو احذفها أولًا');
    }

    const usedAsPrerequisite = (await this.deps.concepts.findByPath(concept.pathId)).some((c) => c.hasPrerequisite(id));
    if (usedAsPrerequisite) throw new Error('لا يمكن حذف مفهوم هو متطلب سابق لمفاهيم أخرى');

    await this.deps.concepts.delete(id);
  }
}

/** قائمة مفاهيم مسار (أو كل المسارات إن لم يُحدَّد) لعرضها في اللوحة (يتطلب مديرًا) */
export class ListConceptsUseCase {
  constructor(private readonly deps: AdminDeps) {}

  async execute(request: AdminRequest & { pathId?: string }): Promise<Concept[]> {
    requireAdmin(this.deps.policy, request.actor);
    const list = request.pathId
      ? await this.deps.concepts.findByPath(createPathId(request.pathId))
      : await this.deps.concepts.findAll();
    return list.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, 'ar'));
  }
}
