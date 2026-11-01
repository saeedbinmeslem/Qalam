/**
 * @file page.tsx
 * @description الصفحة الرئيسية: وعد المنصة، أرقام المحتوى، أبرز المسارات، كيف يعمل قلم، وأقسام المنصة. بلا منطق عمل.
 */
import Link from 'next/link';
import { formatDuration } from '../components/format';
import { PathCard, StatTile, pageWidth } from '../components/ui';
import { getContainer } from '../composition/container';

export const dynamic = 'force-dynamic';

const steps = [
  { title: 'شخّص مستواك', body: 'اختبار قصير يحدد ما تعرفه، فتتخطى ما أتقنته.' },
  { title: 'اتبع مسارًا مرتبًا', body: 'مقاطع محددة بالدقيقة من يوتيوب، بدل مشاهدة فيديوهات كاملة بلا ترتيب.' },
  { title: 'اختبر فهمك', body: 'أسئلة وتمارين تكشف المفهوم الضعيف، فالمشاهدة وحدها لا تعني الفهم.' },
  { title: 'تتعدّل خطتك', body: 'مراجعة أو درس بديل أو تقدّم أسرع، مع ذكر سبب كل قرار.' },
];

const trust = [
  { title: 'المصدر ظاهر دائمًا', body: 'اسم القناة ورابط الفيديو الأصلي عند كل درس، والعرض عبر مشغّل يوتيوب الرسمي دون نسخ أو إعادة استضافة.' },
  { title: 'مراجعة بشرية موسومة', body: 'ترى في مكتبة الدروس أي درس راجعه المالك وأيّها ما زال بانتظار المراجعة.' },
  { title: 'قرارات الخطة معلَّلة', body: 'كل اقتراح بمراجعة أو درس بديل أو تقدّم أسرع يأتي مع سببه من نتائجك.' },
];

const sections = [
  { href: '/paths', title: 'المسارات', body: 'خطط تعلّم مرتبة من الأساس إلى المتقدم.' },
  { href: '/library', title: 'مكتبة الدروس', body: 'ابحث في كل الدروس وصفّها بالقناة والمسار.' },
  { href: '/concepts', title: 'خريطة المفاهيم', body: 'اعرف ما يسبق كل مفهوم وأين تتعلمه.' },
  { href: '/dashboard', title: 'تعلّمي', body: 'تقدمك واقتراحات الوكيل في مكان واحد.' },
  { href: '/review', title: 'المراجعة', body: 'ما يحتاج أن تعود إليه قبل أن تنساه.' },
  { href: '/practice', title: 'التمارين العملية', body: 'كود حقيقي يُشغَّل ويُصحَّح.', badge: 'قيد البناء' },
];

function StepsList() {
  return (
    <ol className="stroke-list self-center" aria-label="كيف يعمل قلم">
      {steps.map((step, index) => (
        <li key={step.title} className="stroke-item">
          <span className="stroke-node" aria-hidden="true">
            {index + 1}
          </span>
          <h3 className="font-display text-title text-on-surface">{step.title}</h3>
          <p className="mt-1 text-on-surface-variant">{step.body}</p>
        </li>
      ))}
    </ol>
  );
}

export default async function HomePage() {
  const { listLearningPaths } = await getContainer();
  const paths = await listLearningPaths.execute();
  const lessons = paths.reduce((sum, p) => sum + p.lessonsCount, 0);
  const seconds = paths.reduce((sum, p) => sum + p.totalDurationSeconds, 0);

  return (
    <>
      <section className="border-b border-outline-variant bg-surface-container-low">
        <div className={`${pageWidth} grid gap-12 py-16 md:grid-cols-[1.1fr_1fr] md:py-24`}>
          <div>
            <p className="chip chip-primary">منصة تعلّم عربية تقيس الفهم</p>
            <h1 className="mt-5 font-display text-4xl font-bold leading-[1.45] text-on-surface md:text-6xl md:leading-[1.35]">
              تعلّم ما تحتاجه،
              <br />
              <span className="text-primary">وأثبت أنك فهمته.</span>
            </h1>
            <p className="text-body mt-6 max-w-xl text-lg text-on-surface-variant">
              دروس مجانية مبعثرة في كل مكان. قلم يرتّبها لك في مسار واحد، ثم يقيس فهمك فعليًا ويغيّر الخطة
              بحسب أدائك.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/paths" className="btn-filled">
                تصفّح المسارات
              </Link>
              <Link href="/about" className="btn-outlined">
                كيف يعمل قلم؟
              </Link>
            </div>
          </div>

          {paths[0] ? (
            <div className="self-center">
              <p className="text-label mb-3 text-on-surface-variant">مثال من المسارات المتاحة</p>
              <PathCard path={paths[0]} />
            </div>
          ) : (
            <StepsList />
          )}
        </div>
      </section>

      <section aria-label="المنصة بالأرقام" className={`${pageWidth} -mt-8`}>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatTile value={String(paths.length)} label="مسارًا تعليميًا" />
          <StatTile value={String(lessons)} label="درسًا مرتبًا" hint="كل درس مقطع محدد من مصدره" />
          <StatTile value={seconds > 0 ? formatDuration(seconds) : '—'} label="مدة المحتوى كاملًا" hint="مجموع مقاطع الدروس" />
        </div>
      </section>

      {paths[0] ? (
        <section aria-labelledby="how-title" className={`${pageWidth} grid gap-10 pt-20 md:grid-cols-[1fr_1.3fr]`}>
          <div>
            <p className="text-label text-secondary-strong">الفكرة</p>
            <h2 id="how-title" className="font-display text-headline text-on-surface">
              من المشاهدة إلى الفهم، في أربع خطوات
            </h2>
            <p className="mt-3 text-on-surface-variant">المشاهدة وحدها لا تعني الفهم، فنقيسه ونعدّل الخطة بحسبه.</p>
          </div>
          <StepsList />
        </section>
      ) : null}

      <section id="paths" className={`${pageWidth} scroll-mt-20 pt-20`}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-label text-secondary-strong">ابدأ من هنا</p>
            <h2 className="font-display text-headline text-on-surface">المسارات المتاحة</h2>
          </div>
          <Link href="/paths" className="btn-text">
            كل المسارات ‹
          </Link>
        </div>
        {paths.length === 0 ? (
          <p className="mt-6 rounded-lg border border-dashed border-outline p-8 text-on-surface-variant">
            لا توجد مسارات منشورة بعد. أضف أول مسار من إدارة المنصة.
          </p>
        ) : (
          <ul className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {paths.slice(0, 6).map((path) => (
              <li key={path.id}>
                <PathCard path={path} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="trust-title" className={`${pageWidth} pt-20`}>
        <p className="text-label text-secondary-strong">الثقة</p>
        <h2 id="trust-title" className="font-display text-headline text-on-surface">
          محتوى تعرف مصدره وسبب اقتراحه
        </h2>
        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {trust.map((t) => (
            <li key={t.title} className="card-outlined p-6">
              <h3 className="font-display text-title text-on-surface">{t.title}</h3>
              <p className="mt-2 text-on-surface-variant">{t.body}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4">
          <Link href="/about#sources" className="btn-text">
            المصادر والحقوق ‹
          </Link>
        </p>
      </section>

      <section className={`${pageWidth} pt-20`}>
        <p className="text-label text-secondary-strong">كل ما تحتاجه</p>
        <h2 className="font-display text-headline text-on-surface">أقسام المنصة</h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((s) => (
            <li key={s.href}>
              <Link href={s.href} className="card-filled block h-full p-6 transition-colors hover:bg-surface-container">
                <h3 className="font-display text-title text-on-surface">
                  {s.title}
                  {s.badge ? <span className="chip chip-warn ms-2 align-middle">{s.badge}</span> : null}
                </h3>
                <p className="mt-2 text-on-surface-variant">{s.body}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
