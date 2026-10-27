/**
 * @file page.tsx
 * @description الصفحة الرئيسية: تعريف موجز بالمنصة وقائمة المسارات. بلا منطق عمل.
 */
import Link from 'next/link';
import { formatDuration, lessonsText, modulesText } from '../components/format';
import { getContainer } from '../composition/container';

export const dynamic = 'force-dynamic';

const steps = [
  { title: 'شخّص مستواك', body: 'اختبار قصير يحدد ما تعرفه، فتتخطى ما أتقنته.' },
  { title: 'اتبع مسارًا مرتبًا', body: 'مقاطع محددة بالدقيقة من يوتيوب، بدل مشاهدة فيديوهات كاملة بلا ترتيب.' },
  { title: 'اختبر فهمك', body: 'أسئلة وتمارين تكشف المفهوم الضعيف، فالمشاهدة وحدها لا تعني الفهم.' },
  { title: 'تتعدّل خطتك', body: 'مراجعة أو درس بديل أو تقدّم أسرع، مع ذكر سبب كل قرار.' },
];

export default async function HomePage() {
  const { listLearningPaths } = await getContainer();
  const paths = await listLearningPaths.execute();

  return (
    <>
      <section className="border-b border-rule bg-sheet">
        <div className="mx-auto grid max-w-5xl gap-12 px-5 py-16 md:grid-cols-[1.1fr_1fr] md:py-24">
          <div>
            <h1 className="font-display text-4xl font-extrabold leading-[1.45] text-ink md:text-5xl md:leading-[1.4]">
              تعلّم ما تحتاجه،
              <br />
              وأثبت لنفسك أنك فهمته.
            </h1>
            <p className="mt-6 max-w-[34rem] text-lg text-muted">
              دروس مجانية مبعثرة في كل مكان. قلم يرتّبها لك في مسار واحد، ثم يقيس فهمك فعليًا
              ويغيّر الخطة بحسب أدائك.
            </p>
            <Link
              href="#paths"
              className="mt-8 inline-block rounded-lg bg-ink px-6 py-3 font-medium text-white transition-colors hover:bg-ink-soft"
            >
              تصفّح المسارات
            </Link>
          </div>

          <ol className="stroke-list self-center" aria-label="كيف يعمل قلم">
            {steps.map((step, index) => (
              <li key={step.title} className="stroke-item">
                <span className="stroke-node" aria-hidden="true">
                  {index + 1}
                </span>
                <h2 className="font-display text-lg font-semibold text-ink">{step.title}</h2>
                <p className="mt-1 text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="paths" className="mx-auto max-w-5xl scroll-mt-6 px-5 pt-16">
        <h2 className="font-display text-2xl font-extrabold text-ink">المسارات المتاحة</h2>

        {paths.length === 0 ? (
          <p className="mt-6 rounded-lg border border-dashed border-rule p-8 text-muted">
            لا توجد مسارات منشورة بعد. أضف أول مسار من إدارة المنصة.
          </p>
        ) : (
          <ul className="mt-6 divide-y divide-rule border-y border-rule">
            {paths.map((path) => (
              <li key={path.id}>
                <Link
                  href={`/paths/${path.id}`}
                  className="group grid gap-2 py-6 md:grid-cols-[1fr_auto] md:items-center md:gap-8"
                >
                  <div>
                    <p className="text-sm font-medium text-sea">{path.subject}</p>
                    <h3 className="font-display text-xl font-semibold text-ink group-hover:underline">
                      {path.title}
                    </h3>
                    <p className="mt-1 max-w-[40rem] text-muted">{path.description}</p>
                  </div>
                  <p className="text-sm text-muted md:text-end">
                    {modulesText(path.modulesCount)}
                    <br />
                    {lessonsText(path.lessonsCount)}
                    <br />
                    {formatDuration(path.totalDurationSeconds)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
