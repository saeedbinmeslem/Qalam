/**
 * @file auth.usecases.ts
 * @description حالات استخدام المصادقة: طلب رمز الدخول، التحقق منه، المستخدم الحالي، الخروج.
 */

import { Email } from '@qalam/domain';
import type { AuthPort, AuthUser } from '../ports/auth.port.js';

/** طول رمز الدخول (يطابق إعداد Supabase الافتراضي) */
export const SIGN_IN_CODE_LENGTH = 6;

export class RequestSignInUseCase {
  constructor(private readonly auth: AuthPort) {}

  /** يتحقق من البريد في Domain ثم يطلب إرسال رمز الدخول */
  async execute(request: { email: string }): Promise<{ signedIn: boolean }> {
    return this.auth.requestSignInCode(new Email(request.email));
  }
}

export class VerifySignInCodeUseCase {
  constructor(private readonly auth: AuthPort) {}

  /** يطبّع البريد ويشترط ستة أرقام قبل سؤال المنفذ، فلا نهدر محاولات على مدخلات مستحيلة */
  async execute(request: { email: string; code: string }): Promise<void> {
    const code = request.code.replace(/\s+/g, '');
    if (!new RegExp(`^\\d{${SIGN_IN_CODE_LENGTH}}$`).test(code)) {
      throw new Error('رمز الدخول غير صالح: يجب أن يكون ستة أرقام');
    }
    await this.auth.verifySignInCode(new Email(request.email), code);
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
