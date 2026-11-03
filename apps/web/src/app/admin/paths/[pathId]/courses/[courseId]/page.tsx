/**
 * @file page.tsx
 * @description صفحة كورس واحد في لوحة التحكم: وحداته ودروسه، وزر إكمال الملاحظات والملخصات والأسئلة لهذا الكورس وحده.
 */
import { createPathId } from '@qalam/domain';
import { BackLink } from '../../../../../../components/back-link';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ErrorBanner, Field, ghostButton } from '../../../../../../components/admin-ui';
import { CourseSection } from '../../../../../../components/admin-course';
import { JobLoader } from '../../../../../../components/background-jobs';
import { InlinePending, PendingButton } from '../../../../../../components/inline-pending';
import { getAdminContainer } from '../../../../../../composition/admin';
import { needsArabicTitle } from '@qalam/application';
import { enrichPathAction, fetchTranscriptsAction, importPlaylistAction, translateTitlesAction } from '../../../../actions';

/** إكمال الملاحظات والملخصات يعمل تحت هذه المهلة */
export const maxDuration = 300;

export default async function AdminCoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ pathId: string; courseId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { pathId, courseId } = await params;
  const { error } = await searchParams;
  const admin = await getAdminContainer();

  const result = await admin.getPath.execute({ pathId: createPathId(pathId) }).catch(() => null);
  const course = result?.path.courses.find((c) => c.id === courseId);
  if (!result || !course) notFound();
  const { path } = result;

  // الفيديو المرفوع لا يقرؤه النموذج فلا يُحسب
  const pendingText = course.modules
    .flatMap((m) => m.lessons)
    .filter((l) => !l.mediaUrl && (!l.notes || !l.studyGuide)).length;
  const englishTitles = course.modules.flatMap((m) => m.lessons).filter((l) => needsArabicTitle(l.title)).length;
  const concepts = await admin.listConcepts.execute({ actor: admin.actor, pathId: path.id });
  const conceptOptions = concepts.map((c) => ({ id: c.id as string, name: c.name }));
  const coverage = await admin.countTranscripts.execute({ actor: admin.actor, pathId: path.id, courseId: course.id });
  const draftQuizzes = await admin.countDraftQuestions.execute({ actor: admin.actor, pathId: path.id, courseId: course.id });
  const conceptName =concepts.find((c) => c.id === course.conceptId)?.name;

  return (
    <>
      <ErrorBanner message={error} />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <BackLink href={`/admin/paths/${path.id}`}>{path.title}</BackLink>
          <h1 className="font-display text-headline text-on-surface">{course.title}</h1>
          {conceptName ? <p className="text-sm text-on-surface-variant">المفهوم: {conceptName}</p> : null}
        </div>
        <Link href={`/paths/${path.id}`} className={ghostButton}>
          عرض كما يراه المتعلم
        </Link>
      </div>

      {coverage.total > coverage.stored ? (
        <form action={fetchTranscriptsAction} data-inline-loader className="mb-6 card-outlined p-5">
          <input type="hidden" name="pathId" value={path.id} />
          <input type="hidden" name="courseId" value={course.id} />
          <p className="mb-2 text-sm text-on-surface">
            النصوص المفرّغة: <strong>{coverage.stored}</strong> من {coverage.total} درسًا. الدروس بلا نص تقرؤها Gemini بالفيديو، وهذا الأبطأ والأكثر استهلاكًا للحصة.
          </p>
          <p className="mb-3 text-sm text-on-surface-variant">
            <strong>متى تستخدمه؟</strong> اضغطه <strong>قبل</strong> «أكمل الملاحظات والملخصات والأسئلة». إن فشل برسالة رفض من يوتيوب (يحجب خوادم الاستضافة أحيانًا)
            فشغّل هذا الأمر من الطرفية على جهازك ثم ارجع: <code dir="ltr">npm run fetch-transcripts</code>
          </p>
          <PendingButton className={ghostButton}>اجلب النصوص المفرّغة</PendingButton>
          <InlinePending label="جارٍ بدء العملية…" />
          <JobLoader matchKey={`transcripts:${path.id}:${course.id}`} label="جارٍ جلب النصوص المفرّغة…" />
        </form>
      ) : coverage.total > 0 ? (
        <p className="mb-6 text-sm text-on-surface-variant">النصوص المفرّغة مكتملة لدروس هذا الكورس ({coverage.total}).</p>
      ) : null}

      {pendingText > 0 ? (
        <form action={enrichPathAction} data-inline-loader className="mb-6 card-outlined p-5">
          <input type="hidden" name="pathId" value={path.id} />
          <input type="hidden" name="courseId" value={course.id} />
          <p className="mb-3 text-sm text-on-surface-variant">
            {pendingText} من أصل {course.lessonsCount} درسًا في هذا الكورس بلا ملاحظات أو ملخص بعد. إن لم تكتمل الخلفية (أو انتهت حصة النموذج) فأكملها من هنا.
          </p>
          <PendingButton className={ghostButton}>أكمل الملاحظات والملخصات والأسئلة</PendingButton>
          <InlinePending label="جارٍ بدء العملية…" />
          <JobLoader matchKey={`enrich:${path.id}:${course.id}`} label="جارٍ توليد الملاحظات والملخصات والأسئلة…" />
        </form>
      ) : null}

      {englishTitles > 0 ? (
        <form action={translateTitlesAction} data-inline-loader className="mb-6 card-outlined p-5">
          <input type="hidden" name="pathId" value={path.id} />
          <input type="hidden" name="courseId" value={course.id} />
          <p className="mb-3 text-sm text-on-surface-variant">
            {englishTitles} درسًا عنوانه بالإنجليزية (من يوتيوب). تُترجم إلى العربية مع إبقاء المصطلحات التقنية كما هي.
          </p>
          <PendingButton className={ghostButton}>ترجمة العناوين إلى العربية</PendingButton>
          <InlinePending label="جارٍ بدء العملية…" />
          <JobLoader matchKey={`titles:${path.id}:${course.id}`} label="جارٍ ترجمة العناوين…" />
        </form>
      ) : null}

      <details className="mb-6 card-outlined p-5">
        <summary className="cursor-pointer font-medium text-on-surface">إكمال إضافة دروس القائمة (إن لم تُضَف كاملة)</summary>
        <form action={importPlaylistAction} data-inline-loader className="mt-4 space-y-4">
          <input type="hidden" name="pathId" value={path.id} />
          <input type="hidden" name="courseId" value={course.id} />
          <Field
            label="رابط القائمة نفسها"
            name="playlistUrl"
            required
            dir="ltr"
            placeholder="https://www.youtube.com/playlist?list=..."
            hint="يقرأ القائمة كاملة ويضيف إلى هذا الكورس الفيديوهات الناقصة فقط (في وحدة «تكملة القائمة») دون تكرار ما أُضيف، ثم يولّد ملاحظاتها وأسئلتها في الخلفية."
          />
          <PendingButton className={ghostButton}>أكمل إضافة الدروس</PendingButton>
          <InlinePending label="جارٍ بدء العملية…" />
          <JobLoader matchKey={`import:${path.id}:${course.id}`} label="جارٍ إضافة الدروس وتوليد محتواها…" />
        </form>
      </details>

      <CourseSection path={path} course={course} concepts={conceptOptions} draftQuizzes={draftQuizzes} />
    </>
  );
}
