/**
 * @file loading.tsx
 * @description شاشة تحميل صفحة المسار.
 * يلزم ملف لكل مقطع جديد: React لا يُظهر fallback حدٍّ ظاهر أصلًا (مثل loading الجذر) أثناء الانتقال.
 */
import { QalamLoader } from '../../../../../components/brand';

export default function Loading() {
  return (
    <div className="grid min-h-[60vh] place-items-center px-5">
      <QalamLoader label="القلم يفتح الكورس…" />
    </div>
  );
}
