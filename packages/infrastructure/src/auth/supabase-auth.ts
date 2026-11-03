/**
 * @file supabase-auth.ts
 * @description محوّل المصادقة عبر Supabase Auth: كلمة مرور ثم رمز من 6 أرقام بالبريد.
 * يعتمد على واجهة هيكلية صغيرة لعميل Supabase، فيستقبل العميل المُنشأ في طبقة العرض
 * (الذي يربط الجلسة بملفات الارتباط الخاصة بالطلب) دون أن تعرف هذه الحزمة Next.js.
 *
 * يتطلب إعداد Supabase: تفعيل «Confirm email»، وأن يعرض قالبا «Confirm signup» و«Magic Link»
 * الرمز ({{ .Token }}) لا الرابط.
 */

import {
  EmailAlreadyRegisteredError,
  InvalidCredentialsError,
  type AuthPort,
  type AuthUser,
  type CodePurpose,
} from '@qalam/application';
import type { Email, Password } from '@qalam/domain';

type AuthError = { message: string } | null;

export interface SupabaseAuthClient {
  auth: {
    signUp(args: { email: string; password: string }): Promise<{
      data: { user: { identities?: unknown[] | null } | null; session: unknown | null };
      error: AuthError;
    }>;
    signInWithPassword(args: { email: string; password: string }): Promise<{ error: AuthError }>;
    signInWithOtp(args: {
      email: string;
      options?: { shouldCreateUser?: boolean };
    }): Promise<{ error: AuthError }>;
    resend(args: { type: 'signup'; email: string }): Promise<{ error: AuthError }>;
    verifyOtp(args: {
      email: string;
      token: string;
      type: 'email' | 'signup' | 'recovery';
    }): Promise<{ error: AuthError }>;
    resetPasswordForEmail(email: string): Promise<{ error: AuthError }>;
    updateUser(args: { password: string }): Promise<{ error: AuthError }>;
    getUser(): Promise<{
      data: { user: { id: string; email?: string | undefined } | null };
    }>;
    signOut(args?: { scope?: 'local' | 'global' | 'others' }): Promise<{ error: AuthError }>;
  };
}

export class SupabaseAuth implements AuthPort {
  constructor(private readonly client: SupabaseAuthClient) {}

  async signUp(email: Email, password: Password): Promise<{ signedIn: boolean }> {
    const { data, error } = await this.client.auth.signUp({ email: email.value, password: password.value });
    if (error) throw new Error(`تعذّر إنشاء الحساب: ${error.message}`);
    // بريد مؤكَّد مسبقًا: Supabase لا يعيد خطأ بل مستخدمًا بلا هويات
    if (data.user?.identities?.length === 0) throw new EmailAlreadyRegisteredError();
    if (data.session) {
      // «Confirm email» معطّل: فُتحت جلسة بلا رمز بريد. نغلقها ونرفض بدل أن نتجاوز العامل الثاني
      await this.client.auth.signOut({ scope: 'local' });
      throw new Error('تعذّر إنشاء الحساب: تأكيد البريد غير مفعّل في Supabase');
    }
    return { signedIn: false };
  }

  async requestSignInCode(email: Email, password: string): Promise<{ signedIn: boolean }> {
    const { error: passwordError } = await this.client.auth.signInWithPassword({ email: email.value, password });
    if (passwordError) throw new InvalidCredentialsError();
    // كلمة المرور صحيحة، لكن الجلسة لا تُفتح إلا بعد الرمز: نغلق جلسة كلمة المرور فورًا
    await this.client.auth.signOut({ scope: 'local' });
    // بلا emailRedirectTo: يرسل Supabase قالب «رمز الدخول» ({{ .Token }}) لا الرابط السحري
    const { error } = await this.client.auth.signInWithOtp({
      email: email.value,
      options: { shouldCreateUser: false },
    });
    if (error) throw new Error(`تعذّر إرسال رمز الدخول: ${error.message}`);
    return { signedIn: false };
  }

  async resendCode(email: Email, purpose: CodePurpose): Promise<void> {
    const { error } =
      purpose === 'signup'
        ? await this.client.auth.resend({ type: 'signup', email: email.value })
        : purpose === 'recovery'
          ? await this.client.auth.resetPasswordForEmail(email.value)
          : await this.client.auth.signInWithOtp({ email: email.value, options: { shouldCreateUser: false } });
    if (error) throw new Error(`تعذّر إرسال الرمز: ${error.message}`);
  }

  async verifySignInCode(email: Email, code: string): Promise<void> {
    const { error } = await this.client.auth.verifyOtp({ email: email.value, token: code, type: 'email' });
    if (error) throw new Error(`رمز الدخول خاطئ أو منتهي: ${error.message}`);
  }

  async verifySignUpCode(email: Email, code: string): Promise<void> {
    const { error } = await this.client.auth.verifyOtp({ email: email.value, token: code, type: 'signup' });
    if (error) throw new Error(`رمز التأكيد خاطئ أو منتهي: ${error.message}`);
  }

  async requestPasswordReset(email: Email): Promise<void> {
    // قالب «Reset Password» في Supabase يجب أن يعرض {{ .Token }}؛ ولا خطأ لبريد غير مسجَّل
    const { error } = await this.client.auth.resetPasswordForEmail(email.value);
    if (error) throw new Error(`تعذّر إرسال رمز الاستعادة: ${error.message}`);
  }

  async resetPassword(email: Email, code: string, newPassword: Password): Promise<void> {
    const { error: verifyError } = await this.client.auth.verifyOtp({
      email: email.value,
      token: code,
      type: 'recovery',
    });
    if (verifyError) throw new Error(`رمز الاستعادة خاطئ أو منتهي: ${verifyError.message}`);
    const { error } = await this.client.auth.updateUser({ password: newPassword.value });
    // جلسة الاستعادة مؤقتة: نغلقها في الحالتين ليمرّ المتعلم بالدخول الكامل (كلمة المرور ثم الرمز)
    await this.client.auth.signOut({ scope: 'local' });
    if (error) throw new Error(`تعذّر تغيير كلمة المرور: ${error.message}`);
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    const { data } = await this.client.auth.getUser();
    const user = data.user;
    if (!user?.email) return null;
    return { id: user.id, email: user.email };
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut({ scope: 'local' });
    if (error) throw new Error(`تعذّر تسجيل الخروج: ${error.message}`);
  }
}
