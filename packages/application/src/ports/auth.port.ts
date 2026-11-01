/**
 * @file auth.port.ts
 * @description منفذ المصادقة. يُنشأ تنفيذه لكل طلب (لأن الجلسة مرتبطة بالطلب الحالي).
 * الدخول عاملان: كلمة المرور ثم رمز من 6 أرقام يصل إلى البريد؛ ولا تُفتح الجلسة إلا بعد الرمز.
 */

import type { Email, Password } from '@qalam/domain';

export interface AuthUser {
  id: string;
  email: string;
}

/** الغرض من الرمز: دخول حساب قائم، أو تأكيد بريد حساب جديد، أو استعادة كلمة المرور */
export type CodePurpose = 'signin' | 'signup' | 'recovery';

/** البريد أو كلمة المرور خاطئان (لا نكشف أيهما) */
export class InvalidCredentialsError extends Error {
  constructor() {
    super('البريد أو كلمة المرور غير صحيحة');
    this.name = 'InvalidCredentialsError';
  }
}

/** يوجد حساب مؤكَّد بهذا البريد مسبقًا */
export class EmailAlreadyRegisteredError extends Error {
  constructor() {
    super('هذا البريد مسجَّل مسبقًا');
    this.name = 'EmailAlreadyRegisteredError';
  }
}

export interface AuthPort {
  /** ينشئ الحساب ويرسل رمز تأكيد البريد؛ يعيد المستخدم مباشرة فقط في التنفيذ التطويري الذي لا يرسل بريدًا */
  signUp(email: Email, password: Password): Promise<{ signedIn: boolean }>;
  /** يتحقق من كلمة المرور ثم يرسل رمز دخول من 6 أرقام؛ يرمي InvalidCredentialsError إن لم تطابق */
  requestSignInCode(email: Email, password: string): Promise<{ signedIn: boolean }>;
  /** يعيد إرسال الرمز (بلا كلمة المرور: الخطوة الأولى تحققت منها سابقًا) */
  resendCode(email: Email, purpose: CodePurpose): Promise<void>;
  /** يتحقق من رمز الدخول ويفتح الجلسة؛ يرمي استثناءً إن كان الرمز خاطئًا أو منتهيًا */
  verifySignInCode(email: Email, code: string): Promise<void>;
  /** يتحقق من رمز تأكيد البريد ويفتح الجلسة */
  verifySignUpCode(email: Email, code: string): Promise<void>;
  /** يرسل رمز استعادة إلى البريد؛ لا يكشف إن كان الحساب موجودًا */
  requestPasswordReset(email: Email): Promise<void>;
  /** يتحقق من رمز الاستعادة ويغيّر كلمة المرور، ثم يغلق الجلسة المؤقتة فيعود المتعلم للدخول العادي */
  resetPassword(email: Email, code: string, newPassword: Password): Promise<void>;
  /** المستخدم الحالي أو null */
  getCurrentUser(): Promise<AuthUser | null>;
  signOut(): Promise<void>;
}
