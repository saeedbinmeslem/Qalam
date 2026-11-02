/**
 * @file back-link.tsx
 * @description زر الرجوع إلى الصفحة السابقة: حبة بإطار وخلفية واضحة وسهم يشير إلى جهة «الخلف» في RTL (يمينًا).
 * يُستعمل بدل النص الرمادي «← …» الذي كان يضيع في الصفحة.
 */
import Link from 'next/link';
import type { ReactNode } from 'react';

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="back-link">
      <svg aria-hidden viewBox="0 0 20 20" className="back-link-arrow" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 10h12M11 5l5 5-5 5" />
      </svg>
      <span>{children}</span>
    </Link>
  );
}
