/**
 * @file auth.ts
 * @description تركيب المصادقة لكل طلب: Supabase عند توفر المفاتيح، وإلا دخول تطويري بملف ارتباط
 * (ممنوع في الإنتاج). الصفحات تستخدم حالات الاستخدام فقط ولا تعرف أي محوّل.
 */
import {
  GetCurrentUserUseCase,
  RequestSignInUseCase,
  SignOutUseCase,
  type AuthPort,
} from '@qalam/application';
import { DevCookieAuth, SupabaseAuth } from '@qalam/infrastructure';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export interface AuthUseCases {
  requestSignIn: RequestSignInUseCase;
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

export async function getAuth(): Promise<AuthUseCases> {
  if (isSupabaseConfigured()) {
    const auth = new SupabaseAuth(await createSupabaseServerClient());
    return {
      requestSignIn: new RequestSignInUseCase(auth),
      getCurrentUser: new GetCurrentUserUseCase(auth),
      signOut: new SignOutUseCase(auth),
      mode: 'supabase',
    };
  }

  if (process.env.NODE_ENV === 'production') {
    // الإنتاج بلا مفاتيح: لا دخول تطويري. الزائر يُعامل كغير مسجَّل، ومحاولة الدخول تفشل بوضوح
    const unconfigured: AuthPort = {
      sendMagicLink: async () => {
        throw new Error('تعذّر إرسال رابط الدخول: مفاتيح Supabase غير مضبوطة');
      },
      getCurrentUser: async () => null,
      signOut: async () => {},
    };
    return {
      requestSignIn: new RequestSignInUseCase(unconfigured),
      getCurrentUser: new GetCurrentUserUseCase(unconfigured),
      signOut: new SignOutUseCase(unconfigured),
      mode: 'supabase',
    };
  }

  const store = await cookies();
  const auth = new DevCookieAuth({
    get: (name) => store.get(name)?.value,
    set: (name, value) => store.set(name, value, { httpOnly: true, sameSite: 'lax', path: '/' }),
    delete: (name) => store.delete(name),
  });
  return {
    requestSignIn: new RequestSignInUseCase(auth),
    getCurrentUser: new GetCurrentUserUseCase(auth),
    signOut: new SignOutUseCase(auth),
    mode: 'dev',
  };
}
