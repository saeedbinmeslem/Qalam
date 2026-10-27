import { describe, expect, it } from 'vitest';
import { Concept } from '../entities/concept.js';
import { createConceptId } from '../value-objects/identifiers.js';
import { wouldCreateCycle } from './concept-graph.js';

const id = createConceptId;
const concept = (name: string, prerequisites: string[] = []) =>
  new Concept({ id: id(name), name, description: '', level: 1, prerequisiteIds: prerequisites.map(id) });

describe('wouldCreateCycle (منع دورات المتطلبات)', () => {
  const graph = [concept('a'), concept('b', ['a']), concept('c', ['b'])];

  it('يسمح بمتطلب سابق سليم', () => {
    expect(wouldCreateCycle(graph, id('d'), [id('c')])).toBe(false);
    expect(wouldCreateCycle(graph, id('c'), [id('a')])).toBe(false);
  });

  it('يرفض المفهوم المتطلب لنفسه', () => {
    expect(wouldCreateCycle(graph, id('a'), [id('a')])).toBe(true);
  });

  it('يرفض الدورة المباشرة وغير المباشرة', () => {
    expect(wouldCreateCycle(graph, id('a'), [id('b')])).toBe(true);
    expect(wouldCreateCycle(graph, id('a'), [id('c')])).toBe(true);
  });
});
