/**
 * @file admin-policy.ts
 * @description سياسة تحديد مديري المنصة: قائمة بريد صريحة. الافتراض هو الرفض.
 * `allowAnySignedIn` للتطوير المحلي فقط ويقرره Composition Root، لا Domain.
 */

export class AdminPolicy {
  private readonly emails: ReadonlySet<string>;

  constructor(
    emails: readonly string[],
    private readonly allowAnySignedIn = false,
  ) {
    this.emails = new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean));
  }

  /** «a@x.com, B@y.com» → سياسة بهذين البريدين */
  static fromList(list: string | undefined, allowAnySignedIn = false): AdminPolicy {
    return new AdminPolicy((list ?? '').split(','), allowAnySignedIn);
  }

  isAdmin(email: string | null | undefined): boolean {
    if (!email) return false;
    return this.allowAnySignedIn || this.emails.has(email.trim().toLowerCase());
  }
}
