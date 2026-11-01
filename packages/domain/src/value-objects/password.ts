/**
 * @file password.ts
 * @description كائن قيمة لكلمة المرور عند إنشاء الحساب: يفرض الحد الأدنى من القوة عند الإنشاء.
 * الحد الأعلى 72 حرفًا لأن bcrypt (الذي يستخدمه Supabase) يتجاهل ما بعده.
 */

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

export class Password {
  readonly value: string;

  constructor(raw: string) {
    if (raw.length < PASSWORD_MIN_LENGTH || raw.length > PASSWORD_MAX_LENGTH) {
      throw new Error(`كلمة المرور غير صالحة: من ${PASSWORD_MIN_LENGTH} إلى ${PASSWORD_MAX_LENGTH} حرفًا`);
    }
    if (!/\p{L}/u.test(raw) || !/\d/.test(raw)) {
      throw new Error('كلمة المرور غير صالحة: يجب أن تحوي حرفًا ورقمًا على الأقل');
    }
    this.value = raw;
  }

  /** لا نطبع كلمة المرور في السجلات بالخطأ */
  toString(): string {
    return '***';
  }
}
