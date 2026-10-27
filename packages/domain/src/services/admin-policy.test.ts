import { describe, expect, it } from 'vitest';
import { AdminPolicy } from './admin-policy.js';

describe('AdminPolicy (سياسة المديرين)', () => {
  it('يسمح لبريد القائمة فقط بلا حساسية لحالة الأحرف', () => {
    const policy = AdminPolicy.fromList(' Owner@Qalam.dev , second@x.com ');
    expect(policy.isAdmin('owner@qalam.dev')).toBe(true);
    expect(policy.isAdmin('SECOND@x.com')).toBe(true);
    expect(policy.isAdmin('other@x.com')).toBe(false);
  });

  it('يرفض الجميع عند غياب القائمة', () => {
    expect(AdminPolicy.fromList(undefined).isAdmin('a@x.com')).toBe(false);
    expect(AdminPolicy.fromList('').isAdmin('a@x.com')).toBe(false);
    expect(AdminPolicy.fromList(' , ,').isAdmin('a@x.com')).toBe(false);
  });

  it('يرفض الزائر (بلا بريد) دائمًا', () => {
    const policy = AdminPolicy.fromList('a@x.com');
    expect(policy.isAdmin(null)).toBe(false);
    expect(policy.isAdmin(undefined)).toBe(false);
    expect(policy.isAdmin('')).toBe(false);
  });
});
