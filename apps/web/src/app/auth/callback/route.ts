/**
 * @file route.ts
 * @description وجهة الرابط السحري: يبدّل الرمز المؤقت بجلسة ثم يعيد المستخدم إلى وجهته.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient, isSupabaseConfigured } from '../../../composition/auth';
import { safeRedirectPath } from '../safe-redirect';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeRedirectPath(searchParams.get('next'));
  const code = searchParams.get('code');

  if (isSupabaseConfigured() && code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/login?error=failed`);
}
