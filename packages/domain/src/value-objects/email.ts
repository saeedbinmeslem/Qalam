/**
 * @file email.ts
 * @description كائن قيمة للبريد الإلكتروني: يُطبَّع (حروف صغيرة وبلا مسافات) ويُتحقق من شكله عند الإنشاء.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export class Email {
  readonly value: string;

  constructor(raw: string) {
    const normalized = raw.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(normalized)) {
      throw new Error('البريد الإلكتروني غير صالح');
    }
    this.value = normalized;
  }

  toString(): string {
    return this.value;
  }
}
