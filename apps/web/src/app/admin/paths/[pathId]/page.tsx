/**
 * @file page.tsx
 * @description محرر المسار: بياناته ومفاهيمه، وتحت كل مفهوم كورساته، وفي كل كورس وحداته ودروسه.
 * الهيكل: مسار ← مفهوم ← كورس ← وحدة ← درس (الدرس لا يُنسب لمفهوم بمفرده، بل يتبع كورسًا يتبع مفهومًا).
 */
import { createPathId } from '@qalam/domain';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Card,
  ErrorBanner,
  Field,
  dangerButton,
  ghostButton,
  inputClass,
  primaryButton,
} from '../../../../components/admin-ui';
import { ConfirmSubmit } from '../../../../components/confirm-submit';
import { formatDuration } from '../../../../components/format';
import { InlinePending, PendingButton } from '../../../../components/inline-pending';
import { getAdminContainer } from '../../../../composition/admin';
import { addCourseAction, deletePathAction, importPlaylistAction, updatePathAction } from '../../actions';

/** إجراءات هذه الصفحة (الاستيراد والإكمال الخلفي) تعمل تحت هذه المهلة */
export const maxDuration = 300;

export default async function AdminPathPage({
  params,
  searchParams,
}: {
  params: Promise<{ pathId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { pathId } = await params;
  const { error } = await searchParams;
  const admin = await getAdminContainer();

  const result = await admin.getPath.execute({ pathId: createPathId(pathId) }).catch(() => null);
  if (!result) notFound();
  const { path } = result;
  const concepts = await admin.listConcepts.execute({ actor: admin.actor, pathId: path.id });
  const conceptOptions = concepts.map((c) => ({ id: c.id as string, name: c.name }));

  return (
    <>
      <ErrorBanner message={error} />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin" className="text-sm text-muted hover:text-ink">
            ← كل المسارات
          </Link>
          <h1 className="font-display text-2xl font-extrabold text-ink">{path.title}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/concepts?path=${path.id}`} className={ghostButton}>
            مفاهيم المسار
          </Link>
          <Link href={`/paths/${path.id}`} className={ghostButton}>
            عرض كما يراه المتعلم
          </Link>
        </div>
      </div>

      <Card title="بيانات المسار">
        <form action={updatePathAction} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="pathId" value={path.id} />
          <Field label="عنوان المسار" name="title" defaultValue={path.title} required />
          <Field label="المجال" name="subject" defaultValue={path.subject} required />
          <div className="md:col-span-2">
            <Field label="الهدف التعليمي" name="targetGoal" defaultValue={path.targetGoal} required />
          </div>
          <div className="md:col-span-2">
            <Field label="وصف المسار" name="description" defaultValue={path.description} rows={3} />
          </div>
          <div>
            <button type="submit" className={primaryButton}>
              حفظ بيانات المسار
            </button>
          </div>
        </form>
      </Card>

      <Card title="استيراد قائمة يوتيوب ككورس">
        <form action={importPlaylistAction} data-inline-loader className="space-y-4">
          <input type="hidden" name="pathId" value={path.id} />
          <Field
            label="رابط القائمة"
            name="playlistUrl"
            required
            dir="ltr"
            placeholder="https://www.youtube.com/playlist?list=..."
            hint="الصق الرابط فقط. تصير القائمة كلها كورسًا واحدًا: يحدد الذكاء الاصطناعي مفهومه من مفاهيم هذا المسار (أو ينشئ مفهومًا جديدًا بمتطلباته)، ويقسّمه إلى وحدات ودروس، وتؤخذ المدة والقناة والمصدر من يوتيوب."
          />
          <PendingButton className={primaryButton}>استيراد الكورس</PendingButton>
          <InlinePending label="جارٍ بدء العملية…" />
          <p className="text-xs text-muted">
            تُستورد القائمة كاملة دفعة واحدة مهما طالت، والمكرر يُتجاوز. بعد البناء تُولَّد الملاحظات وملخصات القراءة ومسودات الأسئلة في الخلفية
            (قد تستغرق دقائق؛ تابع حالتها في الشريط أعلى الصفحة وتصفّح بحرية). كل شيء يدخل «بانتظار المراجعة» ولا يراه المتعلم معتمدًا إلا بعد موافقتك.
          </p>
        </form>
      </Card>

      <h2 className="mb-4 mt-12 font-display text-xl font-extrabold text-ink">المفاهيم والكورسات</h2>
      {concepts.length === 0 ? (
        <p className="text-muted">
          لا مفاهيم في هذا المسار بعد. استورد قائمة (ينشئ النموذج المفهوم) أو{' '}
          <Link href={`/admin/concepts?path=${path.id}`} className="underline">
            أضف مفهومًا
          </Link>
          .
        </p>
      ) : null}
      <div className="space-y-8">
        {concepts.map((concept) => {
          const courses = path.courses.filter((c) => c.conceptId === concept.id);
          return (
            <section key={concept.id} aria-labelledby={`concept-${concept.id}`}>
              <h3 id={`concept-${concept.id}`} className="font-display text-lg font-extrabold text-ink">
                المفهوم: {concept.name}
              </h3>
              {concept.description ? <p className="mb-3 text-sm text-muted">{concept.description}</p> : null}
              <div className="space-y-4">
                {courses.length === 0 ? <p className="text-sm text-muted">لا كورسات في هذا المفهوم بعد.</p> : null}
                {courses.map((course) => {
                  const pending = course.modules.flatMap((m) => m.lessons).filter((l) => !l.reviewedByHuman).length;
                  return (
                    <Link
                      key={course.id}
                      href={`/admin/paths/${path.id}/courses/${course.id}`}
                      className="card-outlined block p-5 shadow-sm transition hover:border-ink"
                    >
                      <h4 className="font-display text-lg font-extrabold text-ink">
                        {course.orderIndex}. {course.title}
                      </h4>
                      <p className="mt-1 text-xs text-muted">
                        {course.modules.length} وحدة · {course.lessonsCount} درس · {formatDuration(course.totalDurationSeconds)}
                        {pending > 0 ? ` · ${pending} بانتظار المراجعة` : course.lessonsCount > 0 ? ' · كل الدروس معتمدة' : ''}
                      </p>
                      {course.description ? <p className="mt-2 text-sm text-muted">{course.description}</p> : null}
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}

        {conceptOptions.length > 0 ? (
          <Card title="كورس جديد (يدويًا)">
            <form action={addCourseAction} className="grid gap-4 md:grid-cols-2">
              <input type="hidden" name="pathId" value={path.id} />
              <Field label="عنوان الكورس" name="title" required />
              <label className="block">
                <span className="block text-sm font-medium text-ink">المفهوم</span>
                <select name="conceptId" required className={inputClass}>
                  {conceptOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="md:col-span-2">
                <Field label="وصف الكورس" name="description" />
              </div>
              <div>
                <button type="submit" className={primaryButton}>
                  إضافة الكورس
                </button>
              </div>
            </form>
          </Card>
        ) : null}
      </div>

      <div className="mt-12 border-t border-rule pt-6">
        <form action={deletePathAction}>
          <input type="hidden" name="pathId" value={path.id} />
          <ConfirmSubmit
            message={`حذف المسار «${path.title}» نهائيًا مع كل مفاهيمه وكورساته ودروسه؟`}
            className={dangerButton}
          >
            حذف المسار نهائيًا
          </ConfirmSubmit>
        </form>
      </div>
    </>
  );
}
