/**
 * @file service-client.ts
 * @description عميل Supabase بمفتاح الخدمة (على الخادم فقط، لا يصل للمتصفح). تحتاجه لوحة التحكم
 * وجدول أسئلة الاختبارات (الإجابات الصحيحة لا تُقرأ من الواجهة مباشرة).
 */
import { createSupabaseServiceClient, type SupabaseDataClient } from '@qalam/infrastructure';
import { isSupabaseConfigured } from './auth';

export function getServiceClient(): SupabaseDataClient {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!isSupabaseConfigured() || !key) {
    throw new Error('هذه الميزة تحتاج SUPABASE_SERVICE_ROLE_KEY في إعدادات الخادم');
  }
  return createSupabaseServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, key);
}
