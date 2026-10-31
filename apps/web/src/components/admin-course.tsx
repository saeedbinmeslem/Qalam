/**
 * @file admin-course.tsx
 * @description مكوّنات إدارة الكورس في لوحة التحكم: الوحدة بدروسها، والكورس بوحداته.
 * تُعرض داخل صفحة الكورس؛ و`back` هو مسار العودة بعد كل إجراء (حتى يبقى المالك في صفحة الكورس).
 */
import { formatTimecode, type Course, type LearningPath, type Module } from '@qalam/domain';
import Link from 'next/link';
import {
  addLessonAction,
  addModuleAction,
  approveLessonsAction,
  deleteCourseAction,
  deleteLessonAction,
  deleteModuleAction,
  moveCourseAction,
  moveLessonAction,
  moveModuleAction,
  setLessonReviewAction,
  updateCourseAction,
  updateModuleAction,
} from '../app/admin/actions';
import { Card, Field, ReviewBadge, dangerButton, ghostButton, inputClass, primaryButton } from './admin-ui';
import { ConfirmSubmit } from './confirm-submit';
import { formatDuration } from './format';
import { LessonFields } from './lesson-fields';

/** زر نموذج صغير يحمل حقولًا مخفية ويستدعي إجراءً */
function MiniForm({
  action,
  fields,
  label,
  title,
  back,
  className = ghostButton,
}: {
  action: (data: FormData) => Promise<void>;
  fields: Record<string, string>;
  label: string;
  title?: string;
  back: string;
  className?: string;
}) {
  return (
    <form action={action}>
      {Object.entries({ ...fields, returnTo: back }).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <button type="submit" className={className} aria-label={title ?? label} title={title}>
        {label}
      </button>
    </form>
  );
}

/** وحدة بدروسها: ترتيب، مراجعة، حذف، إضافة درس، تعديل الوحدة */
function ModuleCard({ path, module, back }: { path: LearningPath; module: Module; back: string }) {
  const pending = module.lessons.filter((l) => !l.reviewedByHuman).length;
  return (
    <Card
      title={`${module.orderIndex}. ${module.title}`}
      actions={
        <div className="flex flex-wrap gap-2">
          {pending > 0 ? (
            <MiniForm
              action={approveLessonsAction}
              fields={{ pathId: path.id, moduleId: module.id }}
              label={`اعتماد دروس الوحدة (${pending})`}
              className={primaryButton}
              back={back}
            />
          ) : null}
          <MiniForm action={moveModuleAction} fields={{ pathId: path.id, moduleId: module.id, direction: 'up' }} label="▲" title="تقديم الوحدة" back={back} />
          <MiniForm action={moveModuleAction} fields={{ pathId: path.id, moduleId: module.id, direction: 'down' }} label="▼" title="تأخير الوحدة" back={back} />
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
                <MiniForm action={moveLessonAction} fields={{ pathId: path.id, lessonId: lesson.id, direction: 'up' }} label="▲" title="تقديم الدرس" back={back} />
                <MiniForm action={moveLessonAction} fields={{ pathId: path.id, lessonId: lesson.id, direction: 'down' }} label="▼" title="تأخير الدرس" back={back} />
                <Link href={`/admin/paths/${path.id}/lessons/${lesson.id}`} className={ghostButton}>
                  تعديل ومراجعة
                </Link>
                {lesson.reviewedByHuman ? (
                  <MiniForm
                    action={setLessonReviewAction}
                    fields={{ pathId: path.id, lessonId: lesson.id, reviewed: 'false' }}
                    label="سحب الاعتماد"
                    back={back}
                  />
                ) : null}
                <form action={deleteLessonAction}>
                  <input type="hidden" name="pathId" value={path.id} />
                  <input type="hidden" name="lessonId" value={lesson.id} />
                  <input type="hidden" name="returnTo" value={back} />
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
          <input type="hidden" name="returnTo" value={back} />
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
          <input type="hidden" name="returnTo" value={back} />
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
          <input type="hidden" name="returnTo" value={back} />
          <ConfirmSubmit message={`حذف الوحدة «${module.title}» مع ${module.lessonsCount} من الدروس؟`} className={dangerButton}>
            حذف الوحدة وكل دروسها
          </ConfirmSubmit>
        </form>
      </details>
    </Card>
  );
}

/** كورس بوحداته، مع تعديله ونقله إلى مفهوم آخر وإضافة وحدة */
export function CourseSection({
  path,
  course,
  concepts,
}: {
  path: LearningPath;
  course: Course;
  concepts: Array<{ id: string; name: string }>;
}) {
  const back = `/admin/paths/${path.id}/courses/${course.id}`;
  const pending = course.modules.flatMap((m) => m.lessons).filter((l) => !l.reviewedByHuman).length;
  return (
    <section className="card-outlined p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-4">
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
          {pending > 0 ? (
            <MiniForm
              action={approveLessonsAction}
              fields={{ pathId: path.id, courseId: course.id }}
              label={`اعتماد كل دروس الكورس (${pending})`}
              className={primaryButton}
              back={back}
            />
          ) : course.lessonsCount > 0 ? (
            <span className="chip chip-primary">كل الدروس معتمدة</span>
          ) : null}
          <MiniForm action={moveCourseAction} fields={{ pathId: path.id, courseId: course.id, direction: 'up' }} label="▲" title="تقديم الكورس" back={back} />
          <MiniForm action={moveCourseAction} fields={{ pathId: path.id, courseId: course.id, direction: 'down' }} label="▼" title="تأخير الكورس" back={back} />
        </div>
      </div>

      <div className="space-y-4">
        {course.modules.map((module) => (
          <ModuleCard key={module.id} path={path} module={module} back={back} />
        ))}
      </div>

      <details className="mt-4 card-filled p-4">
        <summary className="cursor-pointer font-medium text-ink">وحدة جديدة في هذا الكورس</summary>
        <form action={addModuleAction} className="mt-4 grid gap-4 md:grid-cols-2">
          <input type="hidden" name="pathId" value={path.id} />
          <input type="hidden" name="courseId" value={course.id} />
          <input type="hidden" name="returnTo" value={back} />
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
          <input type="hidden" name="returnTo" value={back} />
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
