'use client';

/**
 * @file approve-dialog.tsx
 * @description نافذة تأكيد الاعتماد الجماعي (كورس أو وحدة) بهوية المنصة.
 * - وضع «الدروس»: تسأل عن اعتماد الدروس، مع خيار اعتماد اختباراتها معها (مفعّل افتراضيًا).
 * - وضع «الاختبارات»: يظهر حين لا يبقى درس معلّق وتبقى مسودات اختبارات، ويعتمد الاختبارات وحدها.
 * الإجراء نفسه (server action) يُمرَّر من الصفحة؛ والتحقق من الصلاحية في الخادم.
 */
import { useRef } from 'react';

interface ApproveDialogProps {
  /** approveLessonsAction في وضع الدروس، وapproveQuizzesAction في وضع الاختبارات */
  action: (data: FormData) => Promise<void>;
  /** حقول مخفية: pathId + (courseId أو moduleId) + returnTo */
  fields: Record<string, string>;
  mode: 'lessons' | 'quizzes';
  /** «الكورس» أو «الوحدة» */
  scope: string;
  pendingLessons: number;
  pendingQuizzes: number;
  className?: string;
}

export function ApproveDialog({ action, fields, mode, scope, pendingLessons, pendingQuizzes, className }: ApproveDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const isLessons = mode === 'lessons';
  const count = isLessons ? pendingLessons : pendingQuizzes;
  const trigger = `${isLessons ? 'اعتماد دروس' : 'اعتماد اختبارات'} ${scope} (${count})`;

  return (
    <>
      <button type="button" className={className} onClick={() => dialog.current?.showModal()}>
        {trigger}
      </button>

      <dialog
        ref={dialog}
        aria-labelledby="approve-dialog-title"
        onClick={(event) => {
          // النقر على الخلفية المعتمة يغلق النافذة
          if (event.target === dialog.current) dialog.current?.close();
        }}
        className="m-auto w-[min(92vw,28rem)] rounded-lg border border-outline-variant bg-surface-container-lowest p-0 text-on-surface shadow-xl backdrop:bg-scrim/50 backdrop:backdrop-blur-sm"
      >
        <form action={action} className="p-6">
          {Object.entries(fields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}

          <div className="mb-4 flex items-center gap-3">
            <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary-container text-lg text-on-secondary-container">
              ✓
            </span>
            <h2 id="approve-dialog-title" className="font-display text-lg font-bold">
              {isLessons ? 'اعتماد الدروس' : 'اعتماد الاختبارات'}
            </h2>
          </div>

          <p className="text-sm leading-relaxed text-on-surface-variant">
            {isLessons
              ? `هل تريد اعتماد ${pendingLessons} درسًا في ${scope}؟ تصبح الدروس بعد الاعتماد ظاهرة للمتعلمين.`
              : `دروس ${scope} معتمدة، وبقي ${pendingQuizzes} سؤالًا في الاختبارات بانتظار اعتمادك. هل تريد اعتمادها الآن؟`}
          </p>

          {isLessons && pendingQuizzes > 0 ? (
            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-md border border-outline-variant bg-surface-container-low p-3">
              <input type="checkbox" name="withQuizzes" defaultChecked className="mt-1 size-4 accent-[var(--color-primary)]" />
              <span className="text-sm">
                <span className="block font-medium">اعتماد الاختبارات مع الدروس</span>
                <span className="block text-xs text-on-surface-variant">
                  {pendingQuizzes} سؤالًا بانتظار الاعتماد. إن أزلت العلامة تُعتمد الدروس فقط ويتحول الزر إلى «اعتماد الاختبارات».
                </span>
              </span>
            </label>
          ) : null}

          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button type="button" className="btn-outlined btn-sm" onClick={() => dialog.current?.close()}>
              إلغاء
            </button>
            <button type="submit" className="btn-filled">
              {isLessons ? 'نعم، اعتمد' : 'اعتمد الاختبارات'}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
