import { describe, expect, it } from 'vitest';
import { buildPlanDays, buildPlanWeeks, estimateLessonMinutes, normalizePlanArrangement } from './study-plan.js';

describe('buildPlanDays', () => {
  // درس مدته 10 دقائق = 20 دقيقة تقديرية
  const lesson = (id: string, seconds = 600) => ({ lessonId: id, durationSeconds: seconds });

  it('يوزّع دروس الأسبوع على أيام بحسب سعة اليوم (5 ساعات ÷ 5 أيام = 60 دقيقة)', () => {
    const days = buildPlanDays([lesson('a'), lesson('b'), lesson('c'), lesson('d')], 5);
    expect(days.map((d) => d.lessonIds)).toEqual([['a', 'b', 'c'], ['d']]);
    expect(days.map((d) => d.day)).toEqual([1, 2]);
  });

  it('الدرس الأكبر من سعة اليوم يأخذ يومًا وحده ولا يضيع', () => {
    const days = buildPlanDays([lesson('long', 7200), lesson('s')], 1);
    expect(days.map((d) => d.lessonIds)).toEqual([['long'], ['s']]);
  });

  it('لا دروس فلا أيام', () => {
    expect(buildPlanDays([], 3)).toEqual([]);
  });
});

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

describe('normalizePlanArrangement', () => {
  const make = (lessonIds: string[]) => ({ lessonIds });
  it('يسقط المجهول والمكرر والأسابيع الفارغة ويلحق المفقود بآخر أسبوع', () => {
    const out = normalizePlanArrangement(['a', 'b', 'c', 'd'], [{ lessonIds: ['b', 'zzz'] }, { lessonIds: ['b', 'a'] }, { lessonIds: ['zzz'] }], make);
    expect(out).toEqual([{ lessonIds: ['b'] }, { lessonIds: ['a', 'c', 'd'] }]);
  });
  it('بلا اقتراح: كل المتبقي في أسبوع واحد؛ وبلا متبقٍ: لا أسابيع', () => {
    expect(normalizePlanArrangement(['a', 'b'], [], make)).toEqual([{ lessonIds: ['a', 'b'] }]);
    expect(normalizePlanArrangement([], [{ lessonIds: ['a'] }], make)).toEqual([]);
  });
});
