/**
 * @file auth.port.ts
 * @description منفذ المصادقة. يُنشأ تنفيذه لكل طلب (لأن الجلسة مرتبطة بالطلب الحالي).
 */

import type { Email } from '@qalam/domain';

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthPort {
  /** يرسل رابط دخول سحري إلى البريد، ويعيد المستخدم مباشرة فقط في التنفيذ التطويري الذي لا يرسل بريدًا */
  sendMagicLink(email: Email, redirectTo: string): Promise<{ signedIn: boolean }>;
  /** المستخدم الحالي أو null */
  getCurrentUser(): Promise<AuthUser | null>;
  signOut(): Promise<void>;
}
