import { describe, expect, it } from 'vitest';
import { InvalidCredentialsError } from '@qalam/application';
import { Email, Password } from '@qalam/domain';
import { DevCookieAuth, type CookieJar } from './dev-cookie-auth.js';
import { SupabaseAuth, type SupabaseAuthClient } from './supabase-auth.js';

class MapJar implements CookieJar {
  private map = new Map<string, string>();
  get = (n: string) => this.map.get(n);
  set = (n: string, v: string) => void this.map.set(n, v);
  delete = (n: string) => void this.map.delete(n);
}

describe('DevCookieAuth', () => {
  it('يسجّل الدخول ثم الخروج عبر ملف الارتباط', async () => {
    const auth = new DevCookieAuth(new MapJar());
    expect(await auth.getCurrentUser()).toBeNull();
    expect(await auth.requestSignInCode(new Email('a@b.co'), 'pw')).toEqual({ signedIn: true });
    expect(await auth.getCurrentUser()).toEqual({ id: 'dev-a@b.co', email: 'a@b.co' });
    await auth.signOut();
    expect(await auth.getCurrentUser()).toBeNull();
  });

  it('ينشئ الحساب ويدخل فورًا', async () => {
    const auth = new DevCookieAuth(new MapJar());
    expect(await auth.signUp(new Email('a@b.co'), new Password('secret123'))).toEqual({ signedIn: true });
    expect(await auth.getCurrentUser()).not.toBeNull();
  });
});

describe('SupabaseAuth', () => {
  const email = new Email('a@b.co');

  function client(overrides: Partial<SupabaseAuthClient['auth']> = {}): SupabaseAuthClient {
    return {
      auth: {
        signUp: async () => ({ data: { user: { identities: [{}] }, session: null }, error: null }),
        signInWithPassword: async () => ({ error: null }),
        signInWithOtp: async () => ({ error: null }),
        resend: async () => ({ error: null }),
        resetPasswordForEmail: async () => ({ error: null }),
        updateUser: async () => ({ error: null }),
        verifyOtp: async () => ({ error: null }),
        getUser: async () => ({ data: { user: { id: 'u1', email: 'a@b.co' } } }),
        signOut: async () => ({ error: null }),
        ...overrides,
      },
    };
  }

  it('يفحص كلمة المرور ثم يغلق جلستها ثم يرسل الرمز بلا إنشاء مستخدم', async () => {
    const calls: string[] = [];
    let otpArgs: unknown;
    const auth = new SupabaseAuth(
      client({
        signInWithPassword: async () => (calls.push('password'), { error: null }),
        signOut: async () => (calls.push('signOut'), { error: null }),
        signInWithOtp: async (args) => {
          calls.push('otp');
          otpArgs = args;
          return { error: null };
        },
      }),
    );
    expect(await auth.requestSignInCode(email, 'secret123')).toEqual({ signedIn: false });
    expect(calls).toEqual(['password', 'signOut', 'otp']);
    expect(otpArgs).toEqual({ email: 'a@b.co', options: { shouldCreateUser: false } });
  });

  it('لا يرسل رمزًا إن كانت كلمة المرور خاطئة', async () => {
    let otpCalled = false;
    const auth = new SupabaseAuth(
      client({
        signInWithPassword: async () => ({ error: { message: 'Invalid login credentials' } }),
        signInWithOtp: async () => {
          otpCalled = true;
          return { error: null };
        },
      }),
    );
    await expect(auth.requestSignInCode(email, 'wrong')).rejects.toBeInstanceOf(InvalidCredentialsError);
    expect(otpCalled).toBe(false);
  });

  it('ينشئ الحساب بلا جلسة، ويرفض بريدًا مسجلًا أو تأكيدًا معطّلًا', async () => {
    const password = new Password('secret123');
    expect(await new SupabaseAuth(client()).signUp(email, password)).toEqual({ signedIn: false });

    const existing = new SupabaseAuth(
      client({ signUp: async () => ({ data: { user: { identities: [] }, session: null }, error: null }) }),
    );
    await expect(existing.signUp(email, password)).rejects.toThrow('مسجَّل مسبقًا');

    let signedOut = false;
    const noConfirm = new SupabaseAuth(
      client({
        signUp: async () => ({ data: { user: { identities: [{}] }, session: {} }, error: null }),
        signOut: async () => ((signedOut = true), { error: null }),
      }),
    );
    await expect(noConfirm.signUp(email, password)).rejects.toThrow('غير مفعّل');
    expect(signedOut).toBe(true);
  });

  it('يتحقق من الرمز بنوعه ويرمي عند الخطأ', async () => {
    const received: unknown[] = [];
    const ok = new SupabaseAuth(client({ verifyOtp: async (args) => (received.push(args), { error: null }) }));
    await ok.verifySignInCode(email, '123456');
    await ok.verifySignUpCode(email, '123456');
    expect(received).toEqual([
      { email: 'a@b.co', token: '123456', type: 'email' },
      { email: 'a@b.co', token: '123456', type: 'signup' },
    ]);
    const bad = new SupabaseAuth(client({ verifyOtp: async () => ({ error: { message: 'expired' } }) }));
    await expect(bad.verifySignInCode(email, '000000')).rejects.toThrow('expired');
  });

  it('يعيد الإرسال بحسب الغرض', async () => {
    const calls: string[] = [];
    const auth = new SupabaseAuth(
      client({
        resend: async () => (calls.push('resend'), { error: null }),
        signInWithOtp: async () => (calls.push('otp'), { error: null }),
      }),
    );
    await auth.resendCode(email, 'signup');
    await auth.resendCode(email, 'signin');
    expect(calls).toEqual(['resend', 'otp']);
  });

  it('يحوّل خطأ Supabase إلى استثناء ويعيد null بلا مستخدم', async () => {
    const failing = new SupabaseAuth(client({ signInWithOtp: async () => ({ error: { message: 'rate' } }) }));
    await expect(failing.requestSignInCode(email, 'secret123')).rejects.toThrow('rate');
    const anon = new SupabaseAuth(client({ getUser: async () => ({ data: { user: null } }) }));
    expect(await anon.getCurrentUser()).toBeNull();
  });

  it('يستعيد كلمة المرور: رمز recovery ثم تحديث ثم إغلاق الجلسة المؤقتة', async () => {
    const calls: string[] = [];
    const auth = new SupabaseAuth(
      client({
        verifyOtp: async (args) => (calls.push(`verify:${args.type}`), { error: null }),
        updateUser: async (args) => (calls.push(`update:${args.password}`), { error: null }),
        signOut: async () => (calls.push('signOut'), { error: null }),
      }),
    );
    await auth.resetPassword(email, '123456', new Password('newpass99'));
    expect(calls).toEqual(['verify:recovery', 'update:newpass99', 'signOut']);
  });

  it('لا يغيّر كلمة المرور برمز خاطئ، ويغلق الجلسة إن فشل التحديث', async () => {
    let updated = false;
    const badCode = new SupabaseAuth(
      client({
        verifyOtp: async () => ({ error: { message: 'expired' } }),
        updateUser: async () => ((updated = true), { error: null }),
      }),
    );
    await expect(badCode.resetPassword(email, '000000', new Password('newpass99'))).rejects.toThrow('expired');
    expect(updated).toBe(false);

    let signedOut = false;
    const failing = new SupabaseAuth(
      client({
        updateUser: async () => ({ error: { message: 'same password' } }),
        signOut: async () => ((signedOut = true), { error: null }),
      }),
    );
    await expect(failing.resetPassword(email, '123456', new Password('newpass99'))).rejects.toThrow('same password');
    expect(signedOut).toBe(true);
  });

  it('يرسل رمز الاستعادة ويعيده بغرض recovery', async () => {
    const calls: string[] = [];
    const auth = new SupabaseAuth(
      client({ resetPasswordForEmail: async (e) => (calls.push(e), { error: null }) }),
    );
    await auth.requestPasswordReset(email);
    await auth.resendCode(email, 'recovery');
    expect(calls).toEqual(['a@b.co', 'a@b.co']);
  });
});
