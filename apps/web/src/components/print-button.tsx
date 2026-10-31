'use client';

import { useState } from 'react';

/**
 * @file print-button.tsx
 * @description زر «تنزيل كـ PDF»: يسأل المتعلم أولًا (موافق / إلغاء) ثم ينزّل ملف PDF مباشرة
 * دون فتح نافذة الطباعة. يلتقط عنصر الشرح فقط (هيدر الموقع وفوتره خارجه)، ويوزّعه على
 * عدد الصفحات اللازم، ويقطع عند حدود الأقسام (`[data-pdf-block]`) كي لا ينقسم نص بين صفحتين.
 * الالتقاط كصورة يحفظ الخط العربي وتشكيل الحروف بدقة.
 */
export function PrintButton({
  className,
  targetId,
  fileName,
}: {
  className?: string;
  targetId: string;
  fileName: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    const target = document.getElementById(targetId);
    if (!target) return;
    setBusy(true);
    setError(null);
    try {
      // تحميل المكتبتين عند الحاجة فقط حتى لا تثقل الصفحة.
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas-pro'), import('jspdf')]);

      const scale = 2;
      const canvas = await html2canvas(target, {
        scale,
        backgroundColor: '#ffffff',
        useCORS: true,
        // الملف دائمًا بالألوان الفاتحة مهما كان وضع الموقع.
        onclone: (doc) => {
          doc.documentElement.setAttribute('data-theme', 'light');
        },
      });

      // نقاط القطع الآمنة (بداية كل قسم) بإحداثيات الصورة.
      const rootTop = target.getBoundingClientRect().top;
      const blockTops = Array.from(target.querySelectorAll<HTMLElement>('[data-pdf-block]'))
        .map((el) => Math.round((el.getBoundingClientRect().top - rootTop) * scale))
        .filter((y) => y > 0);

      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentW = pageW - margin * 2;
      const contentH = pageH - margin * 2;
      const pxPerMm = canvas.width / contentW;
      const pagePx = Math.floor(contentH * pxPerMm);

      let start = 0;
      let page = 0;
      while (start < canvas.height) {
        let end = Math.min(start + pagePx, canvas.height);
        if (end < canvas.height) {
          // أبعد بداية قسم ضمن الصفحة (بشرط أن تملأ نصفها على الأقل)، وإلا نقطع حيث وصلنا.
          const safe = blockTops.filter((y) => y > start + pagePx * 0.5 && y <= end);
          if (safe.length > 0) end = safe[safe.length - 1]!;
        }
        const slice = document.createElement('canvas');
        slice.width = canvas.width;
        slice.height = end - start;
        const ctx = slice.getContext('2d');
        if (!ctx) throw new Error('canvas');
        ctx.drawImage(canvas, 0, start, canvas.width, end - start, 0, 0, canvas.width, end - start);
        if (page > 0) pdf.addPage();
        pdf.addImage(slice.toDataURL('image/jpeg', 0.95), 'JPEG', margin, margin, contentW, (end - start) / pxPerMm);
        start = end;
        page += 1;
      }
      pdf.save(`${fileName}.pdf`);
      setConfirming(false);
    } catch {
      setError('تعذّر إنشاء الملف، حاول مرة أخرى.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className={className} onClick={() => setConfirming(true)}>
        تنزيل الشرح كـ PDF
      </button>
      {confirming ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <div className="w-full max-w-sm rounded-2xl bg-sheet p-6 shadow-xl">
            <p className="text-lg font-semibold text-ink">سيتم تنزيل الشرح كملف PDF</p>
            <p className="mt-2 text-sm text-muted">إذا كان الشرح طويلًا فسيُقسَّم تلقائيًا على عدد الصفحات اللازم.</p>
            {error ? <p className="mt-3 text-sm text-error">{error}</p> : null}
            <div className="mt-5 flex gap-3">
              <button type="button" className="btn-filled" onClick={download} disabled={busy}>
                {busy ? 'جارٍ التجهيز…' : 'موافق'}
              </button>
              <button
                type="button"
                className="btn-outlined"
                onClick={() => {
                  setConfirming(false);
                  setError(null);
                }}
                disabled={busy}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
