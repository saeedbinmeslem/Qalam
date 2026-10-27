/**
 * @file errors.ts
 * @description أخطاء طبقة التطبيق التي تميّزها الواجهة (تحويل لصفحة الدخول أو 404).
 * أخطاء التحقق من البيانات تأتي من Domain كـ Error عادي برسالة عربية.
 */

export class UnauthenticatedError extends Error {
  constructor() {
    super('سجّل الدخول أولًا');
    this.name = 'UnauthenticatedError';
  }
}

export class ForbiddenError extends Error {
  constructor() {
    super('هذه الصفحة لمديري المنصة فقط');
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends Error {
  constructor(what: string) {
    super(`${what} غير موجود`);
    this.name = 'NotFoundError';
  }
}
