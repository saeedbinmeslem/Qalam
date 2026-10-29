/**
 * @file loading.tsx
 * @description تحميل صفحات لوحة التحكم: نسخة مصغّرة داخل هيكل اللوحة كي لا يختفي الهيكل أثناء الانتقال.
 */
import { QalamLoader } from '../../components/brand';

export default function AdminLoading() {
  return (
    <div className="grid min-h-[40vh] place-items-center">
      <QalamLoader scale={0.8} label="جارٍ التحميل…" />
    </div>
  );
}
