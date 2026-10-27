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
    expect(concepts.length).toBe(10);

    // لا درس يُعتبر مراجَعًا قبل موافقة المالك
    const lessons = retrieved?.modules.flatMap((m) => m.lessons) ?? [];
    expect(lessons.every((l) => !l.reviewedByHuman)).toBe(true);

    // التحقق من المتطلبات السابقة
    const compiler = concepts.find((c) => c.name.includes('الكومبايلر'));
    expect(compiler?.prerequisiteIds.length).toBeGreaterThan(0);
  });
});
