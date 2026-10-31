/**
 * @file page.tsx
 * @description صفحة كورس واحد في لوحة التحكم: وحداته ودروسه، وزر إكمال الملاحظات والملخصات والأسئلة لهذا الكورس وحده.
 */
import { createPathId } from '@qalam/domain';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ErrorBanner, ghostButton } from '../../../../../../components/admin-ui';
import { CourseSection } from '../../../../../../components/admin-course';
import { InlinePending, PendingButton } from '../../../../../../components/inline-pending';
import { getAdminContainer } from '../../../../../../composition/admin';
import { enrichPathAction } from '../../../../actions';

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
  const concepts = await admin.listConcepts.execute({ actor: admin.actor, pathId: path.id });
  const conceptOptions = concepts.map((c) => ({ id: c.id as string, name: c.name }));
  const conceptName = concepts.find((c) => c.id === course.conceptId)?.name;

  return (
    <>
      <ErrorBanner message={error} />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/admin/paths/${path.id}`} className="text-sm text-muted hover:text-ink">
            ← {path.title}
          </Link>
          <h1 className="font-display text-2xl font-extrabold text-ink">{course.title}</h1>
          {conceptName ? <p className="text-sm text-muted">المفهوم: {conceptName}</p> : null}
        </div>
        <Link href={`/paths/${path.id}`} className={ghostButton}>
          عرض كما يراه المتعلم
        </Link>
      </div>

      {pendingText > 0 ? (
        <form action={enrichPathAction} data-inline-loader className="mb-6 card-outlined p-5">
          <input type="hidden" name="pathId" value={path.id} />
          <input type="hidden" name="courseId" value={course.id} />
          <p className="mb-3 text-sm text-muted">
            {pendingText} درسًا في هذا الكورس بلا ملاحظات أو ملخص بعد. إن لم تكتمل الخلفية (أو انتهت حصة النموذج) فأكملها من هنا.
          </p>
          <PendingButton className={ghostButton}>أكمل الملاحظات والملخصات والأسئلة</PendingButton>
          <InlinePending label="جارٍ توليد الملاحظات والملخصات…" />
        </form>
      ) : null}

      <CourseSection path={path} course={course} concepts={conceptOptions} />
    </>
  );
}
