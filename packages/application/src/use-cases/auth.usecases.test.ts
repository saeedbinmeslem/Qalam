import { describe, expect, it } from 'vitest';
import type { Email } from '@qalam/domain';
import type { AuthPort, AuthUser } from '../ports/auth.port.js';
import {
  GetCurrentUserUseCase,
  RequestSignInUseCase,
  SignOutUseCase,
  VerifySignInCodeUseCase,
} from './auth.usecases.js';

class FakeAuth implements AuthPort {
  sent: string[] = [];
  verified: Array<{ email: string; code: string }> = [];
  user: AuthUser | null = { id: 'u1', email: 'a@b.co' };

  async requestSignInCode(email: Email) {
    this.sent.push(email.value);
    return { signedIn: false };
  }
  async verifySignInCode(email: Email, code: string) {
    this.verified.push({ email: email.value, code });
  }
  async getCurrentUser() {
    return this.user;
  }
  async signOut() {
    this.user = null;
  }
}

describe('حالات استخدام المصادقة', () => {
  it('يطبّع البريد قبل إرسال الرمز', async () => {
    const auth = new FakeAuth();
    await new RequestSignInUseCase(auth).execute({ email: ' Sara@Example.com ' });
    expect(auth.sent).toEqual(['sara@example.com']);
  });

  it('يرفض بريدًا غير صالح دون استدعاء المنفذ', async () => {
    const auth = new FakeAuth();
    await expect(new RequestSignInUseCase(auth).execute({ email: 'x' })).rejects.toThrow();
    expect(auth.sent).toHaveLength(0);
  });

  it('يتحقق من الرمز بعد تطبيع البريد وإزالة المسافات', async () => {
    const auth = new FakeAuth();
    await new VerifySignInCodeUseCase(auth).execute({ email: ' Sara@Example.com ', code: '123 456' });
    expect(auth.verified).toEqual([{ email: 'sara@example.com', code: '123456' }]);
  });

  it('يرفض رمزًا ليس ستة أرقام دون استدعاء المنفذ', async () => {
    const auth = new FakeAuth();
    const verify = new VerifySignInCodeUseCase(auth);
    for (const code of ['12345', '1234567', 'abcdef', '']) {
      await expect(verify.execute({ email: 'a@b.co', code })).rejects.toThrow('غير صالح');
    }
    expect(auth.verified).toHaveLength(0);
  });

  it('يعيد المستخدم الحالي ثم يخرج', async () => {
    const auth = new FakeAuth();
    expect(await new GetCurrentUserUseCase(auth).execute()).toEqual({ id: 'u1', email: 'a@b.co' });
    await new SignOutUseCase(auth).execute();
    expect(await new GetCurrentUserUseCase(auth).execute()).toBeNull();
  });
});
