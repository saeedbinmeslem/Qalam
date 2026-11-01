/**
 * @file auth.ts
 * @description تركيب المصادقة لكل طلب: Supabase عند توفر المفاتيح، وإلا دخول تطويري بملف ارتباط
 * (ممنوع في الإنتاج). الصفحات تستخدم حالات الاستخدام فقط ولا تعرف أي محوّل.
 */
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
  type AuthPort,
} from '@qalam/application';
import { DevCookieAuth, SupabaseAuth } from '@qalam/infrastructure';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export interface AuthUseCases {
  signUp: SignUpUseCase;
  requestSignIn: RequestSignInUseCase;
  resendCode: ResendCodeUseCase;
  requestPasswordReset: RequestPasswordResetUseCase;
  resetPassword: ResetPasswordUseCase;
  verifySignInCode: VerifySignInCodeUseCase;
  verifySignUpCode: VerifySignUpCodeUseCase;
  getCurrentUser: GetCurrentUserUseCase;
  signOut: SignOutUseCase;
  /** في الوضع التطويري لا يُرسل بريد ويُسجَّل الدخول فورًا */
  mode: 'supabase' | 'dev';
}

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export async function createSupabaseServerClient() {
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (items) => {
          // الكتابة غير مسموحة داخل Server Components؛ يتولاها middleware وroute handlers
          try {
            items.forEach(({ name, value, options }) => store.set(name, value, options));
          } catch {
            /* تجاهل */
          }
        },
      },
    },
  );
}

function buildAuth(auth: AuthPort, mode: AuthUseCases['mode']): AuthUseCases {
  return {
    signUp: new SignUpUseCase(auth),
    requestSignIn: new RequestSignInUseCase(auth),
    resendCode: new ResendCodeUseCase(auth),
    requestPasswordReset: new RequestPasswordResetUseCase(auth),
    resetPassword: new ResetPasswordUseCase(auth),
    verifySignInCode: new VerifySignInCodeUseCase(auth),
    verifySignUpCode: new VerifySignUpCodeUseCase(auth),
    getCurrentUser: new GetCurrentUserUseCase(auth),
    signOut: new SignOutUseCase(auth),
    mode,
  };
}

export async function getAuth(): Promise<AuthUseCases> {
  if (isSupabaseConfigured()) {
    return buildAuth(new SupabaseAuth(await createSupabaseServerClient()), 'supabase');
  }

  if (process.env.NODE_ENV === 'production') {
    // الإنتاج بلا مفاتيح: لا دخول تطويري. الزائر يُعامل كغير مسجَّل، ومحاولة الدخول تفشل بوضوح
    const fail = (message: string) => async () => {
      throw new Error(`${message}: مفاتيح Supabase غير مضبوطة`);
    };
    const unconfigured: AuthPort = {
      signUp: fail('تعذّر إنشاء الحساب'),
      requestSignInCode: fail('تعذّر إرسال رمز الدخول'),
      resendCode: fail('تعذّر إرسال الرمز'),
      requestPasswordReset: fail('تعذّر إرسال رمز الاستعادة'),
      resetPassword: fail('تعذّر تغيير كلمة المرور'),
      verifySignInCode: fail('رمز الدخول خاطئ'),
      verifySignUpCode: fail('رمز التأكيد خاطئ'),
      getCurrentUser: async () => null,
      signOut: async () => {},
    };
    return buildAuth(unconfigured, 'supabase');
  }

  const store = await cookies();
  const auth = new DevCookieAuth({
    get: (name) => store.get(name)?.value,
    set: (name, value) => store.set(name, value, { httpOnly: true, sameSite: 'lax', path: '/' }),
    delete: (name) => store.delete(name),
  });
  return buildAuth(auth, 'dev');
}
