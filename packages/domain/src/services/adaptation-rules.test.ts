import { describe, expect, it } from 'vitest';
import { AdaptationRules } from './adaptation-rules.js';
import { createConceptId } from '../value-objects/identifiers.js';
import { MasteryState } from '../value-objects/mastery-state.js';

describe('AdaptationRules (قواعد التكيّف)', () => {
  it('يقترح التقدم عندما تكون جميع المتطلبات السابقة متقنة', () => {
    const target = createConceptId('loops');
    const prereq = createConceptId('conditions');

    const prereqMap = new Map([
      [
        prereq,
        new MasteryState({
          level: 'mastered',
          confidenceScore: 0.95,
        }),
      ],
    ]);

    const decision = AdaptationRules.evaluateNextStep(target, prereqMap);

    expect(decision.action).toBe('proceed');
    expect(decision.conceptId).toBe(target);
  });

  it('يقترح المراجعة إذا كان هناك متطلب سابق غير متقن', () => {
    const target = createConceptId('loops');
    const prereq = createConceptId('conditions');

    const prereqMap = new Map([
      [
        prereq,
        new MasteryState({
          level: 'studying',
          confidenceScore: 0.4,
        }),
      ],
    ]);

    const decision = AdaptationRules.evaluateNextStep(target, prereqMap);

    expect(decision.action).toBe('review');
    expect(decision.conceptId).toBe(prereq);
  });

  it('يقترح درساً بديلاً إذا تكرر الفشل مرتين متتاليتين', () => {
    const concept = createConceptId('pointers');
    const decision = AdaptationRules.evaluateAttemptFailure(concept, 2);

    expect(decision.action).toBe('alternative_lesson');
    expect(decision.conceptId).toBe(concept);
    expect(decision.reasonArabic).toContain('درس بديل');
  });
});
