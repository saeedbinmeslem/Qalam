import { describe, expect, it } from 'vitest';
import { buildPlanWeeks, estimateLessonMinutes } from './study-plan.js';

const lesson = (id: string, minutes: number) => ({ lessonId: id, durationSeconds: minutes * 60 });

describe('buildPlanWeeks', () => {
  it('يقدّر وقت الدرس: مرة ونصف + 5 دقائق للاختبار', () => {
    expect(estimateLessonMinutes(600)).toBe(20);
    expect(estimateLessonMinutes(61)).toBe(7);
  });

  it('يملأ الأسابيع بالترتيب دون تجاوز السعة', () => {
    // ساعة أسبوعيًا = 60 دقيقة؛ كل درس 20 د (10 د فيديو) فيدخل 3 دروس في الأسبوع
    const weeks = buildPlanWeeks(['a', 'b', 'c', 'd', 'e'].map((id) => lesson(id, 10)), 1);
    expect(weeks.map((w) => w.lessonIds)).toEqual([['a', 'b', 'c'], ['d', 'e']]);
    expect(weeks.map((w) => w.week)).toEqual([1, 2]);
    expect(weeks[0]?.minutes).toBe(60);
  });

  it('الدرس الأطول من السعة يأخذ أسبوعًا وحده ولا يضيع', () => {
    const weeks = buildPlanWeeks([lesson('small', 5), lesson('huge', 120), lesson('after', 5)], 1);
    expect(weeks.map((w) => w.lessonIds)).toEqual([['small'], ['huge'], ['after']]);
  });

  it('بلا دروس: لا أسابيع، وساعات غير صالحة ترفض', () => {
    expect(buildPlanWeeks([], 3)).toEqual([]);
    expect(() => buildPlanWeeks([lesson('a', 5)], 0)).toThrow('الساعات');
    expect(() => buildPlanWeeks([lesson('a', 5)], 99)).toThrow('الساعات');
  });
});
