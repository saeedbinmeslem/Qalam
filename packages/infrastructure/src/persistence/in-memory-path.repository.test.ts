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
    expect(retrieved?.title).toContain('أساسيات الحاسوب');
    expect(retrieved?.modules.length).toBe(3);
    expect(retrieved?.totalLessonsCount).toBe(13);
    expect(concepts.length).toBe(3);

    // لا درس يُعتبر مراجَعًا قبل موافقة المالك
    const lessons = retrieved?.modules.flatMap((m) => m.lessons) ?? [];
    expect(lessons.every((l) => !l.reviewedByHuman)).toBe(true);

    // المفاهيم تتبع المسار نفسه، وكل كورس يتبع مفهومًا منها، ولها متطلبات سابقة
    expect(concepts.every((c) => c.pathId === path.id)).toBe(true);
    expect(retrieved?.courses.every((c) => concepts.some((k) => k.id === c.conceptId))).toBe(true);
    const numberSystems = concepts.find((c) => c.name.includes('أنظمة العد'));
    expect(numberSystems?.prerequisiteIds.length).toBeGreaterThan(0);
  });
});
