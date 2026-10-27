/**
 * @file admin-policy.ts
 * @description سياسة تحديد مديري المنصة: قائمة بريد صريحة فقط. الافتراض هو الرفض،
 * ولا استثناء لأي بيئة (تطوير أو إنتاج): من ليس في القائمة ليس مديرًا.
 */

export class AdminPolicy {
  private readonly emails: ReadonlySet<string>;

  constructor(emails: readonly string[]) {
    this.emails = new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean));
  }

  /** «a@x.com, B@y.com» → سياسة بهذين البريدين */
  static fromList(list: string | undefined): AdminPolicy {
    return new AdminPolicy((list ?? '').split(','));
  }

  isAdmin(email: string | null | undefined): boolean {
    return Boolean(email) && this.emails.has((email as string).trim().toLowerCase());
  }
}
