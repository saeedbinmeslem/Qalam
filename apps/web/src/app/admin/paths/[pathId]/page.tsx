/**
 * @file page.tsx
 * @description محرر المسار: بياناته، وحداته، ودروسه (ترتيب، مراجعة، حذف، إضافة).
 */
import { createPathId, formatTimecode } from '@qalam/domain';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Card,
  ErrorBanner,
  Field,
  ReviewBadge,
  dangerButton,
  ghostButton,
  primaryButton,
} from '../../../../components/admin-ui';
import { ConfirmSubmit } from '../../../../components/confirm-submit';
import { formatDuration } from '../../../../components/format';
import { LessonFields } from '../../../../components/lesson-fields';
import { getAdminContainer } from '../../../../composition/admin';
import {
  addLessonAction,
  addModuleAction,
  deleteLessonAction,
  deleteModuleAction,
  deletePathAction,
  moveLessonAction,
  moveModuleAction,
  setLessonReviewAction,
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
  const concepts = (await admin.listConcepts.execute({ actor: admin.actor })).map((c) => ({
    id: c.id as string,
    name: c.name,
  }));

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
        <Link href={`/paths/${path.id}`} className={ghostButton}>
          عرض كما يراه المتعلم
        </Link>
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

      <h2 className="mb-4 mt-12 font-display text-xl font-extrabold text-ink">الوحدات والدروس</h2>
      <div className="space-y-6">
        {path.modules.map((module) => (
          <Card
            key={module.id}
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
                      <Link
                        href={`/admin/paths/${path.id}/lessons/${lesson.id}`}
                        className="font-medium text-ink hover:underline"
                      >
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
                <LessonFields concepts={concepts} />
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
                <ConfirmSubmit
                  message={`حذف الوحدة «${module.title}» مع ${module.lessonsCount} من الدروس؟`}
                  className={dangerButton}
                >
                  حذف الوحدة وكل دروسها
                </ConfirmSubmit>
              </form>
            </details>
          </Card>
        ))}

        <Card title="وحدة جديدة">
          <form action={addModuleAction} className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="pathId" value={path.id} />
            <Field label="عنوان الوحدة" name="title" required />
            <Field label="وصف الوحدة" name="description" />
            <div>
              <button type="submit" className={primaryButton}>
                إضافة الوحدة
              </button>
            </div>
          </form>
        </Card>
      </div>

      <div className="mt-12 border-t border-rule pt-6">
        <form action={deletePathAction}>
          <input type="hidden" name="pathId" value={path.id} />
          <ConfirmSubmit
            message={`حذف المسار «${path.title}» نهائيًا مع كل وحداته ودروسه؟`}
            className={dangerButton}
          >
            حذف المسار نهائيًا
          </ConfirmSubmit>
        </form>
      </div>
    </>
  );
}
