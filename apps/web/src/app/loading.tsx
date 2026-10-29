/**
 * @file loading.tsx
 * @description شاشة الانتقال بين الصفحات: تظهر فورًا أثناء جلب الصفحة التالية
 * كي لا يظن المستخدم أن الموقع معلّق. الحركة من هوية قلم نفسها (القلم يكتب سطرًا).
 */
import { QalamLoader } from '../components/brand';

export default function Loading() {
  return (
    <div className="grid min-h-[60vh] place-items-center px-5">
      <QalamLoader label="القلم يجهّز صفحتك…" />
    </div>
  );
}
