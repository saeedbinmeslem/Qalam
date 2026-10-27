/**
 * @file dev-cookie-auth.ts
 * @description محوّل مصادقة تطويري: يسجّل الدخول فورًا بملف ارتباط دون إرسال بريد.
 * للتطوير المحلي فقط حين لا تتوفر مفاتيح Supabase؛ التركيب في الواجهة يمنع استعماله في الإنتاج.
 */

import type { AuthPort, AuthUser } from '@qalam/application';
import type { Email } from '@qalam/domain';

export interface CookieJar {
  get(name: string): string | undefined;
  set(name: string, value: string): void;
  delete(name: string): void;
}

export const DEV_AUTH_COOKIE = 'qalam_dev_user';

export class DevCookieAuth implements AuthPort {
  constructor(private readonly cookies: CookieJar) {}

  async sendMagicLink(email: Email, _redirectTo: string): Promise<{ signedIn: boolean }> {
    this.cookies.set(DEV_AUTH_COOKIE, email.value);
    return { signedIn: true };
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    const email = this.cookies.get(DEV_AUTH_COOKIE);
    return email ? { id: `dev-${email}`, email } : null;
  }

  async signOut(): Promise<void> {
    this.cookies.delete(DEV_AUTH_COOKIE);
  }
}
