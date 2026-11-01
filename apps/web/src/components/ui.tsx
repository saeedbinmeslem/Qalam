/**
 * @file ui.tsx
 * @description مكوّنات عرض مشتركة للمنصة العامة (رأس الصفحة، بطاقة المسار، شريط التقدم، حالة فارغة).
 * بحت للعرض بلا منطق عمل. الأنماط من فئات Material Design 3 في globals.css.
 */
import Link from 'next/link';
import type { ReactNode } from 'react';
import { CoverArt } from './cover-art';
import { formatDuration, lessonsText, modulesText } from './format';

export const pageWidth = 'mx-auto w-full max-w-6xl px-5 md:px-8';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  crumbs?: { label: string; href?: string }[];
  actions?: ReactNode;
}

/** ترويسة موحّدة لأقسام المنصة: مسار تنقّل، عنوان، وصف، وإجراء رئيسي */
export function PageHeader({ eyebrow, title, description, crumbs, actions }: PageHeaderProps) {
  return (
    <section className="paper border-b border-outline-variant bg-surface-container-low">
      <div className={`${pageWidth} py-10 md:py-14`}>
        {crumbs && crumbs.length > 0 ? (
          <nav aria-label="مسار التنقل" className="mb-4 flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
            {crumbs.map((c, i) => (
              <span key={c.label} className="flex items-center gap-2">
                {i > 0 ? <span aria-hidden="true">‹</span> : null}
                {c.href ? (
                  <Link href={c.href} className="hover:text-primary hover:underline">
                    {c.label}
                  </Link>
                ) : (
                  <span aria-current="page">{c.label}</span>
                )}
              </span>
            ))}
          </nav>
        ) : null}
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-3xl">
            {eyebrow ? <p className="text-label text-secondary-strong">{eyebrow}</p> : null}
            <h1 className="mt-1 font-display text-headline text-on-surface md:text-display">{title}</h1>
            {description ? <p className="text-body mt-3 text-on-surface-variant">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
        </div>
      </div>
    </section>
  );
}

export function ProgressBar({ percent, label }: { percent: number; label: string }) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-2 overflow-hidden rounded-full bg-surface-container-highest"
    >
      <div
        className="h-full rounded-full bg-secondary-strong transition-[width] duration-300 ease-[var(--ease-emphasized-decel)]"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export function StatTile({ value, label, hint }: { value: string; label: string; hint?: string }) {
  return (
    <div className="card-filled p-5">
      <p className="tabular font-display text-3xl font-bold text-on-surface">{value}</p>
      <p className="text-label mt-1 text-on-surface-variant">{label}</p>
      {hint ? <p className="text-caption mt-0.5 text-on-surface-variant">{hint}</p> : null}
    </div>
  );
}

/**
 * حلقة تقدم دائرية: المسار خافت والتعبئة تيل، وعند الاكتمال تصير ذهبية (الذهبي للإنجاز فقط).
 * الدور `progressbar` على الحاوية، والنسبة نص داخلها.
 */
export function ProgressRing({ percent, label, size = 72 }: { percent: number; label: string; size?: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const value = Math.max(0, Math.min(100, percent));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className="relative inline-grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 64 64" className="-rotate-90" aria-hidden="true" focusable="false">
        <circle cx="32" cy="32" r={radius} fill="none" stroke="var(--color-surface-container-highest)" strokeWidth="6" />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke={value >= 100 ? 'var(--color-highlighter)' : 'var(--color-secondary-strong)'}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - value / 100)}
        />
      </svg>
      <span className="tabular absolute font-display text-sm font-bold text-on-surface">{value}%</span>
    </div>
  );
}

/** حالة فارغة: ورقة بخطوط وضربة حبر بدل صندوق منقّط، ثم العنوان والوصف والإجراء */
export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="paper rounded-lg border border-outline-variant bg-surface-container-low p-10 text-center">
      <svg viewBox="0 0 120 64" width="96" height="52" className="mx-auto text-outline" aria-hidden="true" focusable="false">
        <rect x="26" y="4" width="68" height="56" rx="6" fill="var(--color-surface-container-lowest)" stroke="currentColor" strokeWidth="2" />
        <path d="M38 22h44M38 32h30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
        <path d="M30 50 C 46 42 58 56 74 48 S 98 44 108 48" fill="none" stroke="var(--color-secondary)" strokeWidth="4" strokeLinecap="round" />
      </svg>
      <p className="mt-4 font-display text-title text-on-surface">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-on-surface-variant">{body}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}

export interface PathCardData {
  id: string;
  title: string;
  description: string;
  subject: string;
  modulesCount: number;
  lessonsCount: number;
  totalDurationSeconds: number;
  /** نسبة تقدم المتعلم إن كان مسجَّلًا وبدأ المسار */
  percent?: number;
  /** صورة غلاف المسار المرفوعة؛ إن غابت يظهر غلاف الحرف */
  coverUrl?: string;
}

/** بطاقة مسار: الموضوع، العنوان، الوصف، حجم المحتوى، وتقدم المتعلم إن وُجد */
export function PathCard({ path }: { path: PathCardData }) {
  return (
    <Link
      href={`/paths/${path.id}`}
      className="card-outlined card-interactive group flex h-full flex-col overflow-hidden"
    >
      <CoverArt seed={path.id} title={path.title} imageUrl={path.coverUrl} className="aspect-video w-full" />
      <div className="flex flex-1 flex-col p-6">
      <span className="chip chip-primary self-start">{path.subject}</span>
      <h3 className="font-display text-title mt-4 text-on-surface group-hover:text-primary">{path.title}</h3>
      <p className="mt-2 line-clamp-2 flex-1 text-on-surface-variant">{path.description}</p>
      <dl className="mt-5 flex flex-wrap gap-x-4 gap-y-1 border-t border-outline-variant pt-4 text-sm text-on-surface-variant">
        <div>
          <dt className="sr-only">الوحدات</dt>
          <dd>{modulesText(path.modulesCount)}</dd>
        </div>
        <div>
          <dt className="sr-only">الدروس</dt>
          <dd>{lessonsText(path.lessonsCount)}</dd>
        </div>
        <div>
          <dt className="sr-only">المدة</dt>
          <dd>{formatDuration(path.totalDurationSeconds)}</dd>
        </div>
      </dl>
      {path.percent !== undefined ? (
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-on-surface-variant">
            <span>تقدّمك</span>
            {path.percent >= 100 ? (
              <span className="chip chip-mastery">✓ مكتمل</span>
            ) : (
              <span className="tabular">{path.percent}%</span>
            )}
          </div>
          <ProgressBar percent={path.percent} label={`تقدمك في ${path.title}`} />
        </div>
      ) : null}
      </div>
    </Link>
  );
}

/**
 * ضربة الحبر: خط متموّج بلون `currentColor` يُوضع تحت كلمة مميزة في عنوان.
 * يُستعمل مرة واحدة في المنظر الواحد (docs/design-system.md القسم 10).
 */
export function InkStroke({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 14" preserveAspectRatio="none" aria-hidden="true" focusable="false" className={className}>
      <path
        d="M3 9 C 40 2 70 13 110 7 S 170 3 197 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
