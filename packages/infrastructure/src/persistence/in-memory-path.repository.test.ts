import { describe, expect, it } from 'vitest';
import { InMemoryPathRepository } from './in-memory-path.repository.js';
import { createInitialSeedPath } from './seed-data.js';

describe('InMemoryPathRepository & SeedData (المستودع وبيانات البذور)', () => {
  it('يحفظ ويسترجع المسار المبدئي بنجاح مع وحداته ودروسه', async () => {
    const repo = new InMemoryPathRepository();
    const { path, concepts } = createInitialSeedPath();

    await repo.save(path);

    const retrieved = await repo.findById(path.id);

    expect(retrieved).not.toBeNull();
    expect(retrieved?.title).toContain('أساسيات البرمجة');
    expect(retrieved?.modules.length).toBe(2);
    expect(retrieved?.totalLessonsCount).toBe(4);
    expect(concepts.length).toBe(5);

    // التحقق من المتطلبات السابقة
    const loopsConcept = concepts.find((c) => c.name.includes('حلقات التكرار'));
    expect(loopsConcept?.prerequisiteIds.length).toBeGreaterThan(0);
  });
});
