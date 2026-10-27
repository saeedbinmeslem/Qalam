import { describe, expect, it } from 'vitest';
import type { Email } from '@qalam/domain';
import type { AuthPort, AuthUser } from '../ports/auth.port.js';
import { GetCurrentUserUseCase, RequestSignInUseCase, SignOutUseCase } from './auth.usecases.js';

class FakeAuth implements AuthPort {
  sent: Array<{ email: string; redirectTo: string }> = [];
  user: AuthUser | null = { id: 'u1', email: 'a@b.co' };

  async sendMagicLink(email: Email, redirectTo: string) {
    this.sent.push({ email: email.value, redirectTo });
    return { signedIn: false };
  }
  async getCurrentUser() {
    return this.user;
  }
  async signOut() {
    this.user = null;
  }
}

describe('حالات استخدام المصادقة', () => {
  it('يطبّع البريد قبل إرسال الرابط', async () => {
    const auth = new FakeAuth();
    await new RequestSignInUseCase(auth).execute({ email: ' Sara@Example.com ', redirectTo: '/cb' });
    expect(auth.sent).toEqual([{ email: 'sara@example.com', redirectTo: '/cb' }]);
  });

  it('يرفض بريدًا غير صالح دون استدعاء المنفذ', async () => {
    const auth = new FakeAuth();
    await expect(new RequestSignInUseCase(auth).execute({ email: 'x', redirectTo: '/cb' })).rejects.toThrow();
    expect(auth.sent).toHaveLength(0);
  });

  it('يعيد المستخدم الحالي ثم يخرج', async () => {
    const auth = new FakeAuth();
    expect(await new GetCurrentUserUseCase(auth).execute()).toEqual({ id: 'u1', email: 'a@b.co' });
    await new SignOutUseCase(auth).execute();
    expect(await new GetCurrentUserUseCase(auth).execute()).toBeNull();
  });
});
