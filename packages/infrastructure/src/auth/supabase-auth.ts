/**
 * @file supabase-auth.ts
 * @description محوّل المصادقة عبر Supabase Auth (رمز من 6 أرقام بالبريد).
 * يعتمد على واجهة هيكلية صغيرة لعميل Supabase، فيستقبل العميل المُنشأ في طبقة العرض
 * (الذي يربط الجلسة بملفات الارتباط الخاصة بالطلب) دون أن تعرف هذه الحزمة Next.js.
 */

import type { AuthPort, AuthUser } from '@qalam/application';
import type { Email } from '@qalam/domain';

export interface SupabaseAuthClient {
  auth: {
    signInWithOtp(args: { email: string }): Promise<{ error: { message: string } | null }>;
    verifyOtp(args: {
      email: string;
      token: string;
      type: 'email';
    }): Promise<{ error: { message: string } | null }>;
    getUser(): Promise<{
      data: { user: { id: string; email?: string | undefined } | null };
    }>;
    signOut(): Promise<{ error: { message: string } | null }>;
  };
}

export class SupabaseAuth implements AuthPort {
  constructor(private readonly client: SupabaseAuthClient) {}

  async requestSignInCode(email: Email): Promise<{ signedIn: boolean }> {
    // بلا emailRedirectTo: يرسل Supabase قالب «رمز الدخول» ({{ .Token }}) لا الرابط السحري
    const { error } = await this.client.auth.signInWithOtp({ email: email.value });
    if (error) throw new Error(`تعذّر إرسال رمز الدخول: ${error.message}`);
    return { signedIn: false };
  }

  async verifySignInCode(email: Email, code: string): Promise<void> {
    const { error } = await this.client.auth.verifyOtp({ email: email.value, token: code, type: 'email' });
    if (error) throw new Error(`رمز الدخول خاطئ أو منتهي: ${error.message}`);
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    const { data } = await this.client.auth.getUser();
    const user = data.user;
    if (!user?.email) return null;
    return { id: user.id, email: user.email };
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut();
    if (error) throw new Error(`تعذّر تسجيل الخروج: ${error.message}`);
  }
}
