/**
 * @file page.tsx
 * @description عن قلم: كيف يعمل، مبدأ القرار بالأدلة، المصادر والحقوق، والخصوصية.
 */
import Link from 'next/link';
import { PageHeader, pageWidth } from '../../components/ui';

export const metadata = { title: 'كيف يعمل قلم' };

const principles = [
  { title: 'الأدلة قبل الافتراض', body: 'نتائج الاختبارات والإكمال هي أساس القرار، لا مجرد أنك شاهدت الفيديو.' },
  { title: 'كل قرار له سبب', body: 'عندما يقترح الوكيل مراجعة أو درسًا بديلًا، يُعرض لك السبب بوضوح.' },
  { title: 'مراجعة بشرية', body: 'كل درس يُفحص يدويًا: صحة، وضوح، مناسبة المستوى، جودة الصوت، اللغة.' },
  { title: 'القواعد حتمية', body: 'قرارات الخطة تتخذها قواعد قابلة للاختبار؛ الذكاء الاصطناعي يصوغ الشرح فقط.' },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="عن قلم"
        title="كيف يعمل قلم"
        description="قلم لا يستضيف فيديوهات. يرتّب الجيد منها، ويقيس فهمك، ويعدّل مسارك."
        crumbs={[{ label: 'الرئيسية', href: '/' }, { label: 'كيف يعمل قلم' }]}
      />
      <div className={`${pageWidth} space-y-16 pt-10`}>
        <section aria-labelledby="principles">
          <h2 id="principles" className="font-display text-headline text-on-surface">
            مبادئنا
          </h2>
          <ul className="mt-6 grid gap-4 md:grid-cols-2">
            {principles.map((p) => (
              <li key={p.title} className="card-filled p-6">
                <h3 className="font-display text-title text-on-surface">{p.title}</h3>
                <p className="mt-2 text-on-surface-variant">{p.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="sources" aria-labelledby="sources-title" className="scroll-mt-24">
          <h2 id="sources-title" className="font-display text-headline text-on-surface">
            المصادر والحقوق
          </h2>
          <div className="text-body mt-4 max-w-3xl space-y-3 text-on-surface-variant">
            <p>الفيديوهات تُعرض عبر مشغّل يوتيوب الرسمي بتضمين زمني (من دقيقة كذا إلى دقيقة كذا). لا ننسخها ولا نعيد استضافتها.</p>
            <p>اسم القناة والرابط الأصلي ظاهران عند كل درس، وحقوق المحتوى لأصحاب القنوات.</p>
            <p>الأسئلة والملخصات المولّدة تُبنى على مصدر الدرس ويعتمدها المالك قبل أن تصلك.</p>
          </div>
        </section>

        <section id="privacy" aria-labelledby="privacy-title" className="scroll-mt-24">
          <h2 id="privacy-title" className="font-display text-headline text-on-surface">
            الخصوصية
          </h2>
          <div className="text-body mt-4 max-w-3xl space-y-3 text-on-surface-variant">
            <p>نخزّن الحد الأدنى: بريدك للدخول، وأحداث تعلّمك (إكمال الدروس، نتائج الاختبارات، قرارات الخطة) لنعدّل مسارك ولنقيس أثر المنصة.</p>
            <p>الدخول برمز مؤقت يصل بريدك، ولا نخزّن كلمة مرور.</p>
          </div>
        </section>

        <Link href="/paths" className="btn-filled">
          ابدأ التعلّم
        </Link>
      </div>
    </>
  );
}
