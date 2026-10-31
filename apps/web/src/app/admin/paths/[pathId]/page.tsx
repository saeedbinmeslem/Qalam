/**
 * @file page.tsx
 * @description محرر المسار: بياناته ومفاهيمه، وتحت كل مفهوم كورساته، وفي كل كورس وحداته ودروسه.
 * الهيكل: مسار ← مفهوم ← كورس ← وحدة ← درس (الدرس لا يُنسب لمفهوم بمفرده، بل يتبع كورسًا يتبع مفهومًا).
 */
import { createPathId, formatTimecode, type Course, type LearningPath, type Module } from '@qalam/domain';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Card,
  ErrorBanner,
  Field,
  ReviewBadge,
  dangerButton,
  ghostButton,
  inputClass,
  primaryButton,
} from '../../../../components/admin-ui';
import { ConfirmSubmit } from '../../../../components/confirm-submit';
import { formatDuration } from '../../../../components/format';
import { InlinePending, PendingButton } from '../../../../components/inline-pending';
import { LessonFields } from '../../../../components/lesson-fields';
import { getAdminContainer } from '../../../../composition/admin';
import {
  addCourseAction,
  addLessonAction,
  addModuleAction,
  deleteCourseAction,
  deleteLessonAction,
  deleteModuleAction,
  deletePathAction,
  enrichPathAction,
  importPlaylistAction,
  moveCourseAction,
  moveLessonAction,
  moveModuleAction,
  setLessonReviewAction,
  updateCourseAction,
  updateModuleAction,
  updatePathAction,
} from '../../actions';

/** زر نموذج صغير يحمل حقولًا مخفية ويستدعي إجراءً */
function MiniForm({
  action,
  fields,
  label,
  title,
  className = ghostButton,
}: {
  action: (data: FormData) => Promise<void>;
  fields: Record<string, string>;
  label: string;
  title?: string;
  className?: string;
}) {
  return (
    <form action={action}>
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <button type="submit" className={className} aria-label={title ?? label} title={title}>
        {label}
      </button>
    </form>
  );
}

/** وحدة بدروسها: ترتيب، مراجعة، حذف، إضافة درس، تعديل الوحدة */
function ModuleCard({ path, module }: { path: LearningPath; module: Module }) {
  return (
    <Card
      title={`${module.orderIndex}. ${module.title}`}
      actions={
        <div className="flex flex-wrap gap-2">
          <MiniForm action={moveModuleAction} fields={{ pathId: path.id, moduleId: module.id, direction: 'up' }} label="▲" title="تقديم الوحدة" />
          <MiniForm action={moveModuleAction} fields={{ pathId: path.id, moduleId: module.id, direction: 'down' }} label="▼" title="تأخير الوحدة" />
        </div>
      }
    >
      {module.description ? <p className="-mt-2 mb-4 text-sm text-muted">{module.description}</p> : null}

      {module.lessons.length === 0 ? (
        <p className="text-sm text-muted">لا دروس في هذه الوحدة بعد.</p>
      ) : (
        <ul className="divide-y divide-rule card-outlined">
          {module.lessons.map((lesson, index) => (
            <li key={lesson.id} className="grid gap-2 p-3 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <Link href={`/admin/paths/${path.id}/lessons/${lesson.id}`} className="font-medium text-ink hover:underline">
                  {index + 1}. {lesson.title}
                </Link>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                  <span dir="ltr">
                    {formatTimecode(lesson.segment.startSeconds)}–{formatTimecode(lesson.segment.endSeconds)}
                  </span>
                  <span>{formatDuration(lesson.segment.durationSeconds)}</span>
                  <span>{lesson.channelName}</span>
                  <ReviewBadge reviewed={lesson.reviewedByHuman} />
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <MiniForm action={moveLessonAction} fields={{ pathId: path.id, lessonId: lesson.id, direction: 'up' }} label="▲" title="تقديم الدرس" />
                <MiniForm action={moveLessonAction} fields={{ pathId: path.id, lessonId: lesson.id, direction: 'down' }} label="▼" title="تأخير الدرس" />
                <Link href={`/admin/paths/${path.id}/lessons/${lesson.id}`} className={ghostButton}>
                  تعديل ومراجعة
                </Link>
                {lesson.reviewedByHuman ? (
                  <MiniForm
                    action={setLessonReviewAction}
                    fields={{ pathId: path.id, lessonId: lesson.id, reviewed: 'false' }}
                    label="سحب الاعتماد"
                  />
                ) : null}
                <form action={deleteLessonAction}>
                  <input type="hidden" name="pathId" value={path.id} />
                  <input type="hidden" name="lessonId" value={lesson.id} />
                  <ConfirmSubmit message={`حذف الدرس «${lesson.title}»؟`} className={dangerButton}>
                    حذف
                  </ConfirmSubmit>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      <details className="mt-4 card-filled p-4">
        <summary className="cursor-pointer font-medium text-ink">إضافة درس إلى هذه الوحدة</summary>
        <form action={addLessonAction} className="mt-4 space-y-4">
          <input type="hidden" name="pathId" value={path.id} />
          <input type="hidden" name="moduleId" value={module.id} />
          <LessonFields />
          <button type="submit" className={primaryButton}>
            إضافة الدرس
          </button>
          <p className="text-xs text-muted">يُضاف الدرس «بانتظار المراجعة» ولا يُعتمد إلا بعد مشاهدتك له.</p>
        </form>
      </details>

      <details className="mt-3 card-filled p-4">
        <summary className="cursor-pointer font-medium text-ink">تعديل الوحدة أو حذفها</summary>
        <form action={updateModuleAction} className="mt-4 grid gap-4 md:grid-cols-2">
          <input type="hidden" name="pathId" value={path.id} />
          <input type="hidden" name="moduleId" value={module.id} />
          <Field label="عنوان الوحدة" name="title" defaultValue={module.title} required />
          <Field label="وصف الوحدة" name="description" defaultValue={module.description} />
          <div>
            <button type="submit" className={primaryButton}>
              حفظ الوحدة
            </button>
          </div>
        </form>
        <form action={deleteModuleAction} className="mt-4 border-t border-rule pt-4">
          <input type="hidden" name="pathId" value={path.id} />
          <input type="hidden" name="moduleId" value={module.id} />
          <ConfirmSubmit message={`حذف الوحدة «${module.title}» مع ${module.lessonsCount} من الدروس؟`} className={dangerButton}>
            حذف الوحدة وكل دروسها
          </ConfirmSubmit>
        </form>
      </details>
    </Card>
  );
}

/** كورس بوحداته، مع تعديله ونقله إلى مفهوم آخر وإضافة وحدة */
function CourseSection({
  path,
  course,
  concepts,
}: {
  path: LearningPath;
  course: Course;
  concepts: Array<{ id: string; name: string }>;
}) {
  return (
    <section className="card-outlined p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="font-display text-lg font-extrabold text-ink">
            {course.orderIndex}. {course.title}
          </h4>
          <p className="text-xs text-muted">
            {course.modules.length} وحدة · {course.lessonsCount} درس · {formatDuration(course.totalDurationSeconds)}
          </p>
          {course.description ? <p className="mt-1 text-sm text-muted">{course.description}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <MiniForm action={moveCourseAction} fields={{ pathId: path.id, courseId: course.id, direction: 'up' }} label="▲" title="تقديم الكورس" />
          <MiniForm action={moveCourseAction} fields={{ pathId: path.id, courseId: course.id, direction: 'down' }} label="▼" title="تأخير الكورس" />
        </div>
      </div>

      <div className="space-y-4">
        {course.modules.map((module) => (
          <ModuleCard key={module.id} path={path} module={module} />
        ))}
      </div>

      <details className="mt-4 card-filled p-4">
        <summary className="cursor-pointer font-medium text-ink">وحدة جديدة في هذا الكورس</summary>
        <form action={addModuleAction} className="mt-4 grid gap-4 md:grid-cols-2">
          <input type="hidden" name="pathId" value={path.id} />
          <input type="hidden" name="courseId" value={course.id} />
          <Field label="عنوان الوحدة" name="title" required />
          <Field label="وصف الوحدة" name="description" />
          <div>
            <button type="submit" className={primaryButton}>
              إضافة الوحدة
            </button>
          </div>
        </form>
      </details>

      <details className="mt-3 card-filled p-4">
        <summary className="cursor-pointer font-medium text-ink">تعديل الكورس أو نقله أو حذفه</summary>
        <form action={updateCourseAction} className="mt-4 grid gap-4 md:grid-cols-2">
          <input type="hidden" name="pathId" value={path.id} />
          <input type="hidden" name="courseId" value={course.id} />
          <Field label="عنوان الكورس" name="title" defaultValue={course.title} required />
          <label className="block">
            <span className="block text-sm font-medium text-ink">المفهوم</span>
            <select name="conceptId" defaultValue={course.conceptId} className={inputClass}>
              {concepts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <div className="md:col-span-2">
            <Field label="وصف الكورس" name="description" defaultValue={course.description} />
          </div>
          <div>
            <button type="submit" className={primaryButton}>
              حفظ الكورس
            </button>
          </div>
        </form>
        <form action={deleteCourseAction} className="mt-4 border-t border-rule pt-4">
          <input type="hidden" name="pathId" value={path.id} />
          <input type="hidden" name="courseId" value={course.id} />
          <ConfirmSubmit
            message={`حذف الكورس «${course.title}» مع ${course.modules.length} وحدة و${course.lessonsCount} درس؟`}
            className={dangerButton}
          >
            حذف الكورس بكل وحداته ودروسه
          </ConfirmSubmit>
        </form>
      </details>
    </section>
  );
}

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
  // الفيديو المرفوع لا يقرؤه النموذج فلا يُحسب
  const pendingText = path.modules.flatMap((m) => m.lessons).filter((l) => !l.mediaUrl && (!l.notes || !l.studyGuide)).length;
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
          <InlinePending label="جارٍ قراءة القائمة وبناء الكورس…" />
          <p className="text-xs text-muted">
            حتى 50 فيديو في الدفعة، والمكرر يُتجاوز. بعد البناء تُولَّد الملاحظات وملخصات القراءة ومسودات الأسئلة في الخلفية
            (قد تستغرق دقائق؛ حدّث الصفحة). كل شيء يدخل «بانتظار المراجعة» ولا يراه المتعلم معتمدًا إلا بعد موافقتك.
          </p>
        </form>
        {pendingText > 0 ? (
          <form action={enrichPathAction} data-inline-loader className="mt-4 border-t border-rule pt-4">
            <input type="hidden" name="pathId" value={path.id} />
            <p className="mb-3 text-sm text-muted">
              {pendingText} درسًا بلا ملاحظات أو ملخص بعد. إن لم تكتمل الخلفية (أو انتهت حصة النموذج) فأكملها من هنا.
            </p>
            <PendingButton className={ghostButton}>أكمل الملاحظات والملخصات والأسئلة</PendingButton>
            <InlinePending label="جارٍ توليد الملاحظات والملخصات…" />
          </form>
        ) : null}
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
                {courses.map((course) => (
                  <CourseSection key={course.id} path={path} course={course} concepts={conceptOptions} />
                ))}
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
