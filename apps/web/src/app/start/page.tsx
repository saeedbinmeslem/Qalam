/**
 * @file page.tsx
 * @description التعارف: المتعلم يصف شغفه والمجال بدقة ومستواه ووقته، فيختار قلم مساره ويبني خطته. بلا منطق عمل.
 */
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PageHeader, pageWidth } from '../../components/ui';
import { getAuth } from '../../composition/auth';
import { startOnboardingAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'ابدأ خطتك — قلم' };

export default async function StartPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const user = await (await getAuth()).getCurrentUser.execute();
  if (!user) redirect('/login?next=/start');

  return (
    <>
      <PageHeader
        eyebrow="ابدأ هنا"
        title="أخبرنا بما يشغفك، ونبني لك خطتك"
        description="كلما كنت أدقّ في وصف مجالك كان المسار أنسب. بعد ذلك تختبر مستواك لنتخطى ما تعرفه، ثم نرتّب الباقي في أسابيع تناسب وقتك."
      />
      <div className={`${pageWidth} max-w-2xl py-10`}>
        {error ? (
          <p role="alert" className="mb-6 rounded-md bg-error-container p-4 text-on-error-container">
            {error}
          </p>
        ) : null}
        <form action={startOnboardingAction} className="space-y-5">
          <label className="block">
            <span className="block text-label text-on-surface">ما الذي يشغفك؟ <span className="text-error">*</span></span>
            <textarea name="interest" rows={3} required className="field" placeholder="مثال: أحب الألعاب وأتمنى أن أصنع لعبة بنفسي" />
          </label>
          <label className="block">
            <span className="block text-label text-on-surface">ما المجال الذي تريده بالضبط؟ <span className="text-error">*</span></span>
            <input name="field" required className="field" placeholder="مثال: أساسيات البرمجة، أو فهم الحاسوب من الصفر" />
          </label>
          <div className="grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="block text-label text-on-surface">مستواك الحالي</span>
              <select name="level" defaultValue="beginner" className="field">
                <option value="beginner">مبتدئ</option>
                <option value="intermediate">متوسط</option>
                <option value="advanced">متقدم</option>
              </select>
            </label>
            <label className="block">
              <span className="block text-label text-on-surface">كم ساعة تتفرغ أسبوعيًا؟</span>
              <input name="hoursPerWeek" type="number" min={1} max={40} defaultValue={3} className="field" />
            </label>
          </div>
          <button type="submit" className="btn-filled">
            اختر لي المسار وابنِ خطتي
          </button>
          <p className="text-sm text-muted">
            يختار الذكاء الاصطناعي من مسارات المنصة فقط، ولا يخترع مصادر. تستطيع أيضًا{' '}
            <Link href="/paths" className="text-primary underline">
              تصفح المسارات بنفسك
            </Link>
            .
          </p>
        </form>
      </div>
    </>
  );
}
