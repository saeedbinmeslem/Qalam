'use client';

/**
 * @file sign-out-dialog.tsx
 * @description زر تسجيل الخروج مع نافذة تأكيد بهوية المنصة، لتفادي الخروج بالخطأ.
 * الإجراء نفسه (signOutAction) يعمل في الخادم؛ النافذة تُغلق فور الضغط على أي زر فيها.
 */
import { useRef, type ReactNode } from 'react';
import { signOutAction } from '../app/auth/actions';

export function SignOutDialog({ className, children }: { className?: string; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button type="button" className={className} onClick={() => dialog.current?.showModal()}>
        {children}
      </button>

      <dialog
        ref={dialog}
        aria-labelledby="sign-out-dialog-title"
        onClick={(event) => {
          // النقر على الخلفية المعتمة يغلق النافذة
          if (event.target === dialog.current) dialog.current?.close();
        }}
        className="m-auto w-[min(92vw,26rem)] rounded-lg border border-outline-variant bg-surface-container-lowest p-0 text-on-surface shadow-xl backdrop:bg-scrim/50 backdrop:backdrop-blur-sm"
      >
        <form
          action={async () => {
            // تُغلق النافذة أولًا ثم يبدأ تسجيل الخروج في الخادم
            dialog.current?.close();
            await signOutAction();
          }}
          className="p-6"
        >
          <h2 id="sign-out-dialog-title" className="mb-3 font-display text-lg font-bold">
            تسجيل الخروج
          </h2>
          <p className="text-sm leading-relaxed text-on-surface-variant">هل تريد تسجيل الخروج من حسابك؟</p>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button type="button" className="btn-outlined btn-sm" onClick={() => dialog.current?.close()}>
              إلغاء
            </button>
            <button type="submit" className="btn-filled">
              نعم، اخرج
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
