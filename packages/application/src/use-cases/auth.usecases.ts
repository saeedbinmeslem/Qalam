/**
 * @file auth.usecases.ts
 * @description حالات استخدام المصادقة: طلب الدخول، المستخدم الحالي، الخروج.
 */

import { Email } from '@qalam/domain';
import type { AuthPort, AuthUser } from '../ports/auth.port.js';

export class RequestSignInUseCase {
  constructor(private readonly auth: AuthPort) {}

  /** يتحقق من البريد في Domain ثم يطلب الرابط السحري */
  async execute(request: { email: string; redirectTo: string }): Promise<{ signedIn: boolean }> {
    return this.auth.sendMagicLink(new Email(request.email), request.redirectTo);
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
