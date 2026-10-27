import { describe, expect, it } from 'vitest';
import { AdminPolicy } from './admin-policy.js';

describe('AdminPolicy (سياسة المديرين)', () => {
  it('يسمح لبريد القائمة فقط بلا حساسية لحالة الأحرف', () => {
    const policy = AdminPolicy.fromList(' Owner@Qalam.dev , second@x.com ');
    expect(policy.isAdmin('owner@qalam.dev')).toBe(true);
    expect(policy.isAdmin('SECOND@x.com')).toBe(true);
    expect(policy.isAdmin('other@x.com')).toBe(false);
  });

  it('يرفض الجميع عند غياب القائمة، ويرفض الزائر دائمًا', () => {
    expect(AdminPolicy.fromList(undefined).isAdmin('a@x.com')).toBe(false);
    expect(AdminPolicy.fromList('').isAdmin('a@x.com')).toBe(false);
    expect(AdminPolicy.fromList('a@x.com', true).isAdmin(null)).toBe(false);
  });

  it('وضع التطوير يسمح لأي مستخدم مسجَّل', () => {
    expect(AdminPolicy.fromList(undefined, true).isAdmin('anyone@x.com')).toBe(true);
  });
});
