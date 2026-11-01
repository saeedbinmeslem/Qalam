import { describe, expect, it } from 'vitest';
import type { Email, Password } from '@qalam/domain';
import { InvalidCredentialsError, type AuthPort, type AuthUser, type CodePurpose } from '../ports/auth.port.js';
import {
  GetCurrentUserUseCase,
  RequestPasswordResetUseCase,
  RequestSignInUseCase,
  ResendCodeUseCase,
  ResetPasswordUseCase,
  SignOutUseCase,
  SignUpUseCase,
  VerifySignInCodeUseCase,
  VerifySignUpCodeUseCase,
} from './auth.usecases.js';

class FakeAuth implements AuthPort {
  signedUp: Array<{ email: string; password: string }> = [];
  sent: Array<{ email: string; password: string }> = [];
  resent: Array<{ email: string; purpose: CodePurpose }> = [];
  verified: Array<{ email: string; code: string }> = [];
  verifiedSignUp: Array<{ email: string; code: string }> = [];
  user: AuthUser | null = { id: 'u1', email: 'a@b.co' };

  async signUp(email: Email, password: Password) {
    this.signedUp.push({ email: email.value, password: password.value });
    return { signedIn: false };
  }
  async requestSignInCode(email: Email, password: string) {
    this.sent.push({ email: email.value, password });
    return { signedIn: false };
  }
  async resendCode(email: Email, purpose: CodePurpose) {
    this.resent.push({ email: email.value, purpose });
  }
  async verifySignInCode(email: Email, code: string) {
    this.verified.push({ email: email.value, code });
  }
  async verifySignUpCode(email: Email, code: string) {
    this.verifiedSignUp.push({ email: email.value, code });
  }
  resets: Array<{ email: string; code: string; password: string }> = [];
  resetRequested: string[] = [];
  async requestPasswordReset(email: Email) {
    this.resetRequested.push(email.value);
  }
  async resetPassword(email: Email, code: string, password: Password) {
    this.resets.push({ email: email.value, code, password: password.value });
  }
  async getCurrentUser() {
    return this.user;
  }
  async signOut() {
    this.user = null;
  }
}

describe('حالات استخدام المصادقة', () => {
  it('يطبّع البريد ويمرّر كلمة المرور عند طلب رمز الدخول', async () => {
    const auth = new FakeAuth();
    await new RequestSignInUseCase(auth).execute({ email: ' Sara@Example.com ', password: 'secret123' });
    expect(auth.sent).toEqual([{ email: 'sara@example.com', password: 'secret123' }]);
  });

  it('يرفض بريدًا غير صالح أو كلمة مرور فارغة دون استدعاء المنفذ', async () => {
    const auth = new FakeAuth();
    const request = new RequestSignInUseCase(auth);
    await expect(request.execute({ email: 'x', password: 'secret123' })).rejects.toThrow();
    await expect(request.execute({ email: 'a@b.co', password: '' })).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
    expect(auth.sent).toHaveLength(0);
  });

  it('ينشئ حسابًا بكلمة مرور قوية ويرفض الضعيفة', async () => {
    const auth = new FakeAuth();
    const signUp = new SignUpUseCase(auth);
    await signUp.execute({ email: ' Sara@Example.com ', password: 'secret123' });
    expect(auth.signedUp).toEqual([{ email: 'sara@example.com', password: 'secret123' }]);
    for (const password of ['short1', 'allletters', '12345678', '']) {
      await expect(signUp.execute({ email: 'a@b.co', password })).rejects.toThrow('كلمة المرور');
    }
    expect(auth.signedUp).toHaveLength(1);
  });

  it('يتحقق من الرمز بعد تطبيع البريد وإزالة المسافات', async () => {
    const auth = new FakeAuth();
    await new VerifySignInCodeUseCase(auth).execute({ email: ' Sara@Example.com ', code: '123 456' });
    expect(auth.verified).toEqual([{ email: 'sara@example.com', code: '123456' }]);
    await new VerifySignUpCodeUseCase(auth).execute({ email: 'sara@example.com', code: '654321' });
    expect(auth.verifiedSignUp).toEqual([{ email: 'sara@example.com', code: '654321' }]);
  });

  it('يرفض رمزًا ليس ستة أرقام دون استدعاء المنفذ', async () => {
    const auth = new FakeAuth();
    const verify = new VerifySignInCodeUseCase(auth);
    for (const code of ['12345', '1234567', 'abcdef', '']) {
      await expect(verify.execute({ email: 'a@b.co', code })).rejects.toThrow('غير صالح');
    }
    expect(auth.verified).toHaveLength(0);
  });

  it('يعيد إرسال الرمز لغرضه', async () => {
    const auth = new FakeAuth();
    await new ResendCodeUseCase(auth).execute({ email: 'A@b.co', purpose: 'signup' });
    expect(auth.resent).toEqual([{ email: 'a@b.co', purpose: 'signup' }]);
  });

  it('يعيد المستخدم الحالي ثم يخرج', async () => {
    const auth = new FakeAuth();
    expect(await new GetCurrentUserUseCase(auth).execute()).toEqual({ id: 'u1', email: 'a@b.co' });
    await new SignOutUseCase(auth).execute();
    expect(await new GetCurrentUserUseCase(auth).execute()).toBeNull();
  });

  it('يطلب رمز الاستعادة ويغيّر كلمة المرور بعد التحقق من الرمز والقوة', async () => {
    const auth = new FakeAuth();
    await new RequestPasswordResetUseCase(auth).execute({ email: ' Sara@Example.com ' });
    expect(auth.resetRequested).toEqual(['sara@example.com']);

    const reset = new ResetPasswordUseCase(auth);
    await reset.execute({ email: 'a@b.co', code: '123 456', newPassword: 'newpass99' });
    expect(auth.resets).toEqual([{ email: 'a@b.co', code: '123456', password: 'newpass99' }]);
    await expect(reset.execute({ email: 'a@b.co', code: '12', newPassword: 'newpass99' })).rejects.toThrow('غير صالح');
    await expect(reset.execute({ email: 'a@b.co', code: '123456', newPassword: 'weak' })).rejects.toThrow('كلمة المرور');
    expect(auth.resets).toHaveLength(1);
  });
});
