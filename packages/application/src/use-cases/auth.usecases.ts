/**
 * @file auth.usecases.ts
 * @description حالات استخدام المصادقة: إنشاء حساب، طلب رمز الدخول (بعد كلمة المرور)،
 * التحقق من الرمز، إعادة الإرسال، المستخدم الحالي، الخروج.
 */

import { Email, Password } from '@qalam/domain';
import {
  InvalidCredentialsError,
  type AuthPort,
  type AuthUser,
  type CodePurpose,
} from '../ports/auth.port.js';

/** طول رمز الدخول (يطابق إعداد Supabase الافتراضي) */
export const SIGN_IN_CODE_LENGTH = 6;

/** يشترط ستة أرقام قبل سؤال المنفذ، فلا نهدر محاولات على مدخلات مستحيلة */
function normalizeCode(raw: string): string {
  const code = raw.replace(/\s+/g, '');
  if (!new RegExp(`^\\d{${SIGN_IN_CODE_LENGTH}}$`).test(code)) {
    throw new Error('رمز الدخول غير صالح: يجب أن يكون ستة أرقام');
  }
  return code;
}

export class SignUpUseCase {
  constructor(private readonly auth: AuthPort) {}

  /** يتحقق من البريد وقوة كلمة المرور في Domain ثم ينشئ الحساب */
  async execute(request: { email: string; password: string }): Promise<{ signedIn: boolean }> {
    return this.auth.signUp(new Email(request.email), new Password(request.password));
  }
}

export class RequestSignInUseCase {
  constructor(private readonly auth: AuthPort) {}

  /** يتحقق من البريد ثم يطلب من المنفذ فحص كلمة المرور وإرسال رمز الدخول */
  async execute(request: { email: string; password: string }): Promise<{ signedIn: boolean }> {
    const email = new Email(request.email);
    // لا نطبّق سياسة القوة هنا: حسابات قديمة قد تسبقها، والمنفذ هو من يطابق الكلمة
    if (request.password.length === 0) throw new InvalidCredentialsError();
    return this.auth.requestSignInCode(email, request.password);
  }
}

export class ResendCodeUseCase {
  constructor(private readonly auth: AuthPort) {}

  execute(request: { email: string; purpose: CodePurpose }): Promise<void> {
    return this.auth.resendCode(new Email(request.email), request.purpose);
  }
}

export class RequestPasswordResetUseCase {
  constructor(private readonly auth: AuthPort) {}

  execute(request: { email: string }): Promise<void> {
    return this.auth.requestPasswordReset(new Email(request.email));
  }
}

export class ResetPasswordUseCase {
  constructor(private readonly auth: AuthPort) {}

  /** يتحقق من الرمز وقوة كلمة المرور الجديدة قبل سؤال المنفذ */
  async execute(request: { email: string; code: string; newPassword: string }): Promise<void> {
    const code = normalizeCode(request.code);
    await this.auth.resetPassword(new Email(request.email), code, new Password(request.newPassword));
  }
}

export class VerifySignInCodeUseCase {
  constructor(private readonly auth: AuthPort) {}

  async execute(request: { email: string; code: string }): Promise<void> {
    await this.auth.verifySignInCode(new Email(request.email), normalizeCode(request.code));
  }
}

export class VerifySignUpCodeUseCase {
  constructor(private readonly auth: AuthPort) {}

  async execute(request: { email: string; code: string }): Promise<void> {
    await this.auth.verifySignUpCode(new Email(request.email), normalizeCode(request.code));
  }
}

export class GetCurrentUserUseCase {
  constructor(private readonly auth: AuthPort) {}

  execute(): Promise<AuthUser | null> {
    return this.auth.getCurrentUser();
  }
}

export class SignOutUseCase {
  constructor(private readonly auth: AuthPort) {}

  execute(): Promise<void> {
    return this.auth.signOut();
  }
}
