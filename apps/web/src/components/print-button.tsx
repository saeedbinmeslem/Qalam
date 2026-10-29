'use client';

/**
 * @file print-button.tsx
 * @description زر «احفظ كـ PDF»: يفتح نافذة الطباعة في المتصفح حيث يختار المتعلم «حفظ كـ PDF».
 * هذا يحفظ الخط العربي وتشكيل الحروف بدقة (أضمن من توليد PDF على الخادم بخط لا يدعم الربط).
 */
export function PrintButton({ className }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.print()}>
      احفظ كـ PDF / اطبع
    </button>
  );
}
