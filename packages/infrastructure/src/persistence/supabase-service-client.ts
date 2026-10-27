/**
 * @file supabase-service-client.ts
 * @description عميل Supabase بمفتاح الخدمة لكتابات لوحة التحكم (يتجاوز RLS).
 * لا يُستعمل إلا من مسارات إدارية خلف التحقق من المدير، ولا يصل للمتصفح أبدًا.
 */

import { createClient } from '@supabase/supabase-js';
import type { SupabaseDataClient } from './supabase-path.repository.js';

export function createSupabaseServiceClient(url: string, serviceRoleKey: string): SupabaseDataClient {
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }) as unknown as SupabaseDataClient;
}
