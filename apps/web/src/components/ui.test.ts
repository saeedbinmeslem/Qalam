import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EmptyState, ProgressRing } from './ui';

describe('ProgressRing', () => {
  it('يعرض النسبة وdash-offset متناسبًا ودور progressbar', () => {
    const html = renderToStaticMarkup(createElement(ProgressRing, { percent: 25, label: 'تقدمك' }));
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="25"');
    expect(html).toContain('25%');
    const circumference = 2 * Math.PI * 28;
    expect(html).toContain(`stroke-dashoffset="${circumference * 0.75}"`);
    expect(html).toContain('--color-secondary-strong');
  });

  it('عند الاكتمال تصير ذهبية، وتُقيَّد القيم خارج 0..100', () => {
    expect(renderToStaticMarkup(createElement(ProgressRing, { percent: 100, label: 'x' }))).toContain('--color-highlighter');
    const over = renderToStaticMarkup(createElement(ProgressRing, { percent: 140, label: 'x' }));
    expect(over).toContain('aria-valuenow="100"');
    expect(renderToStaticMarkup(createElement(ProgressRing, { percent: -5, label: 'x' }))).toContain('aria-valuenow="0"');
  });
});

describe('EmptyState', () => {
  it('يعرض الرسم والعنوان والوصف والإجراء بلا حد منقّط', () => {
    const html = renderToStaticMarkup(createElement(EmptyState, { title: 'لا مسارات', body: 'ابدأ بمسار', action: 'زر' }));
    expect(html).toContain('<svg');
    expect(html).toContain('لا مسارات');
    expect(html).toContain('ابدأ بمسار');
    expect(html).toContain('زر');
    expect(html).not.toContain('border-dashed');
  });
});
