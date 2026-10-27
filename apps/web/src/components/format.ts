/**
 * @file format.ts
 * @description تنسيق عرضي بحت (بلا منطق عمل): تحويل الثواني إلى نص عربي مقروء.
 */
export function formatDuration(totalSeconds: number): string {
  const minutes = Math.max(1, Math.round(totalSeconds / 60));
  if (minutes < 60) return `${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const hoursText = hours === 1 ? 'ساعة' : hours === 2 ? 'ساعتان' : `${hours} ساعات`;
  return rest === 0 ? hoursText : `${hoursText} و${rest} دقيقة`;
}

/** عدّ عربي صحيح: مفرد، مثنى، جمع (٣–١٠)، ثم مفرد منصوب بعد ١٠. */
export function formatCount(n: number, one: string, two: string, few: string, many: string): string {
  if (n === 0) return `لا ${many}`;
  if (n === 1) return one;
  if (n === 2) return two;
  return `${n} ${n <= 10 ? few : many}`;
}

export const modulesText = (n: number) => formatCount(n, 'وحدة واحدة', 'وحدتان', 'وحدات', 'وحدة');
export const lessonsText = (n: number) => formatCount(n, 'درس واحد', 'درسان', 'دروس', 'درسًا');
