/**
 * @file ui.tsx
 * @description مكوّنات عرض مشتركة للمنصة العامة (رأس الصفحة، بطاقة المسار، شريط التقدم، حالة فارغة).
 * بحت للعرض بلا منطق عمل. الأنماط من فئات Material Design 3 في globals.css.
 */
import Link from 'next/link';
import type { ReactNode } from 'react';
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
    <section className="border-b border-outline-variant bg-surface-container-low">
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

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-outline bg-surface-container-lowest p-10 text-center">
      <p className="font-display text-title text-on-surface">{title}</p>
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
}

/** بطاقة مسار: الموضوع، العنوان، الوصف، حجم المحتوى، وتقدم المتعلم إن وُجد */
export function PathCard({ path }: { path: PathCardData }) {
  return (
    <Link
      href={`/paths/${path.id}`}
      className="card-outlined card-interactive group flex h-full flex-col p-6"
    >
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
    </Link>
  );
}
