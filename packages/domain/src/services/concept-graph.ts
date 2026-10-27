/**
 * @file concept-graph.ts
 * @description قواعد رسم المفاهيم (concept graph): يجب أن يبقى رسمًا موجّهًا بلا دورات،
 * وإلا استحال ترتيب المتطلبات السابقة. (الخوارزميات واسعة النطاق ستنتقل لاحقًا إلى services/graph-engine.)
 */

import type { Concept } from '../entities/concept.js';
import type { ConceptId } from '../value-objects/identifiers.js';

/**
 * هل يُنشئ جعل `prerequisiteIds` متطلبات سابقة للمفهوم `conceptId` دورة؟
 * `all` هي المفاهيم الحالية؛ متطلبات `conceptId` القديمة فيها تُتجاهل لأنها ستُستبدل.
 */
export function wouldCreateCycle(
  all: readonly Concept[],
  conceptId: ConceptId,
  prerequisiteIds: readonly ConceptId[],
): boolean {
  const prerequisitesOf = new Map(all.map((c) => [c.id, c.prerequisiteIds]));
  prerequisitesOf.set(conceptId, prerequisiteIds);

  const visited = new Set<ConceptId>();
  const stack = [...prerequisiteIds];
  while (stack.length > 0) {
    const current = stack.pop() as ConceptId;
    if (current === conceptId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    stack.push(...(prerequisitesOf.get(current) ?? []));
  }
  return false;
}
