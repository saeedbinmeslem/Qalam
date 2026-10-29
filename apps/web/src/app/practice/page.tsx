/**
 * @file page.tsx
 * @description التمارين العملية: صفحة تعريفية صادقة بحالة القسم (قيد البناء، المرحلة 2). لا تعرض تمارين وهمية.
 */
import Link from 'next/link';
import { PageHeader, pageWidth } from '../../components/ui';

export const metadata = { title: 'التمارين العملية — قلم' };

const how = [
  { title: 'تكتب كودًا حقيقيًا', body: 'محرر كود في المتصفح داخل الدرس نفسه.' },
  { title: 'يُشغَّل في بيئة معزولة', body: 'كودك لا يُنفَّذ إلا داخل محرّك تقييم معزول بحدود صارمة للوقت والذاكرة.' },
  { title: 'يُصحَّح باختبارات تلقائية', body: 'نتيجة فورية: نجح أو فشل، ولأي حالة اختبار.' },
  { title: 'يُحلَّل نوع الخطأ', body: 'نربط الخطأ بالمفهوم الضعيف (مثل خلط = و==) فيعدّل الوكيل خطتك.' },
];

export default function PracticePage() {
  return (
    <>
      <PageHeader
        eyebrow="التمارين"
        title="التمارين العملية"
        description="الفهم الحقيقي يظهر حين تكتب بنفسك. هذا القسم قيد البناء وهو المرحلة التالية من المنصة."
        crumbs={[{ label: 'الرئيسية', href: '/' }, { label: 'التمارين العملية' }]}
      />
      <div className={`${pageWidth} pt-10`}>
        <p className="chip chip-warn">قيد البناء — المرحلة 2</p>
        <ol className="mt-8 grid gap-4 md:grid-cols-2">
          {how.map((h, i) => (
            <li key={h.title} className="card-filled flex gap-4 p-6">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary font-display font-bold text-on-primary">
                {i + 1}
              </span>
              <div>
                <h2 className="font-display text-title text-on-surface">{h.title}</h2>
                <p className="mt-1 text-on-surface-variant">{h.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-10 text-on-surface-variant">
          حتى ذلك الحين، اختبر فهمك بالاختبارات القصيرة داخل كل درس، وابدأ بـ{' '}
          <Link href="/paths" className="text-primary underline underline-offset-2">
            مسار من الدليل
          </Link>
          .
        </p>
      </div>
    </>
  );
}
