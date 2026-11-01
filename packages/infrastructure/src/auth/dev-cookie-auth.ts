/**
 * @file dev-cookie-auth.ts
 * @description محوّل مصادقة تطويري: يسجّل الدخول فورًا بملف ارتباط دون كلمة مرور ولا بريد.
 * للتطوير المحلي فقط حين لا تتوفر مفاتيح Supabase؛ التركيب في الواجهة يمنع استعماله في الإنتاج.
 */

import type { AuthPort, AuthUser, CodePurpose } from '@qalam/application';
import type { Email, Password } from '@qalam/domain';

export interface CookieJar {
  get(name: string): string | undefined;
  set(name: string, value: string): void;
  delete(name: string): void;
}

export const DEV_AUTH_COOKIE = 'qalam_dev_user';

export class DevCookieAuth implements AuthPort {
  constructor(private readonly cookies: CookieJar) {}

  async signUp(email: Email, _password: Password): Promise<{ signedIn: boolean }> {
    this.cookies.set(DEV_AUTH_COOKIE, email.value);
    return { signedIn: true };
  }

  async requestSignInCode(email: Email, _password: string): Promise<{ signedIn: boolean }> {
    this.cookies.set(DEV_AUTH_COOKIE, email.value);
    return { signedIn: true };
  }

  /** لا بريد في الوضع التطويري: لا شيء يُعاد إرساله */
  async resendCode(_email: Email, _purpose: CodePurpose): Promise<void> {}

  /** لا كلمات مرور في الوضع التطويري: لا شيء يُستعاد */
  async requestPasswordReset(_email: Email): Promise<void> {}

  async resetPassword(_email: Email, _code: string, _newPassword: Password): Promise<void> {}

  /** لا رمز في الوضع التطويري: الدخول يتم فور الطلب */
  async verifySignInCode(email: Email, _code: string): Promise<void> {
    this.cookies.set(DEV_AUTH_COOKIE, email.value);
  }

  async verifySignUpCode(email: Email, _code: string): Promise<void> {
    this.cookies.set(DEV_AUTH_COOKIE, email.value);
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    const email = this.cookies.get(DEV_AUTH_COOKIE);
    return email ? { id: `dev-${email}`, email } : null;
  }

  async signOut(): Promise<void> {
    this.cookies.delete(DEV_AUTH_COOKIE);
  }
}
