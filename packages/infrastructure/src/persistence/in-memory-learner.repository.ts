/**
 * @file in-memory-learner.repository.ts
 * @description محوّل مستودع المتعلمين بالذاكرة (In-Memory Learner Repository Adapter)
 */

import type { Learner, LearnerId } from '@qalam/domain';
import type { LearnerRepositoryPort } from '@qalam/application';

export class InMemoryLearnerRepository implements LearnerRepositoryPort {
  private readonly learners = new Map<string, Learner>();

  async save(learner: Learner): Promise<void> {
    this.learners.set(learner.id, learner);
  }

  async findById(id: LearnerId): Promise<Learner | null> {
    return this.learners.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<Learner | null> {
    const normalized = email.toLowerCase().trim();
    for (const learner of this.learners.values()) {
      if (learner.email.toLowerCase() === normalized) {
        return learner;
      }
    }
    return null;
  }

  clear(): void {
    this.learners.clear();
  }
}
