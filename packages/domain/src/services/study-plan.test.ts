import { describe, expect, it } from 'vitest';
import { buildPlanDays, buildPlanHours, buildPlanWeeks, estimateLessonMinutes, normalizePlanArrangement } from './study-plan.js';

describe('buildPlanDays', () => {
  // درس مدته 10 دقائق = 20 دقيقة تقديرية
  const lesson = (id: string, seconds = 600) => ({ lessonId: id, durationSeconds: seconds });

  it('يوزّع دروس الأسبوع على أيام بحسب سعة اليوم (ساعة يوميًا = 60 دقيقة)', () => {
    const days = buildPlanDays([lesson('a'), lesson('b'), lesson('c'), lesson('d')], 1);
    expect(days.map((d) => d.lessonIds)).toEqual([['a', 'b', 'c'], ['d']]);
    expect(days.map((d) => d.day)).toEqual([1, 2]);
  });

  it('الدرس الأكبر من سعة اليوم يأخذ يومًا وحده ولا يضيع', () => {
    const days = buildPlanDays([lesson('long', 7200), lesson('s')], 1);
    expect(days.map((d) => d.lessonIds)).toEqual([['long'], ['s']]);
  });

  it('نصف ساعة يوميًا يعني سعة 30 دقيقة', () => {
    expect(buildPlanDays([lesson('a'), lesson('b'), lesson('c')], 0.5).map((d) => d.lessonIds)).toEqual([['a'], ['b'], ['c']]);
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
    // نصف ساعة يوميًا × 5 أيام = 150 دقيقة؛ كل درس 20 د (10 د فيديو) فيدخل 7 دروس في الأسبوع
    const weeks = buildPlanWeeks(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((id) => lesson(id, 10)), 0.5);
    expect(weeks.map((w) => w.lessonIds)).toEqual([['a', 'b', 'c', 'd', 'e', 'f', 'g'], ['h']]);
    expect(weeks.map((w) => w.week)).toEqual([1, 2]);
    expect(weeks[0]?.minutes).toBe(140);
  });

  it('الدرس الأطول من السعة يأخذ أسبوعًا وحده ولا يضيع', () => {
    const weeks = buildPlanWeeks([lesson('small', 5), lesson('huge', 300), lesson('after', 5)], 1);
    expect(weeks.map((w) => w.lessonIds)).toEqual([['small'], ['huge'], ['after']]);
  });

  it('بلا دروس: لا أسابيع، وساعات غير صالحة ترفض', () => {
    expect(buildPlanWeeks([], 3)).toEqual([]);
    expect(() => buildPlanWeeks([lesson('a', 5)], 0)).toThrow('الساعات');
    expect(() => buildPlanWeeks([lesson('a', 5)], 13)).toThrow('الساعات');
  });
});

describe('buildPlanHours', () => {
  it('يقسّم اليوم على ساعاته: درسان في الساعة الأولى ثم تكملة الثالث في الثانية', () => {
    // 3 دروس × 20 د: الأول والثاني في الساعة 1، والثالث يبدأ عند الدقيقة 40 فيمتد 20 د ثم لا شيء
    const hours = buildPlanHours([lesson('a', 10), lesson('b', 10), lesson('c', 20)]);
    expect(hours.map((h) => h.items.map((i) => [i.lessonId, i.minutes, i.starts]))).toEqual([
      [['a', 20, true], ['b', 20, true], ['c', 20, true]],
      [['c', 15, false]],
    ]);
    expect(hours.map((h) => h.minutes)).toEqual([60, 15]);
  });

  it('لا دروس فلا ساعات', () => {
    expect(buildPlanHours([])).toEqual([]);
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
