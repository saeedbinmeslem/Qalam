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
  /** يرسل رمز دخول من 6 أرقام إلى البريد، ويعيد المستخدم مباشرة فقط في التنفيذ التطويري الذي لا يرسل بريدًا */
  requestSignInCode(email: Email): Promise<{ signedIn: boolean }>;
  /** يتحقق من الرمز ويفتح الجلسة؛ يرمي استثناءً إن كان الرمز خاطئًا أو منتهيًا */
  verifySignInCode(email: Email, code: string): Promise<void>;
  /** المستخدم الحالي أو null */
  getCurrentUser(): Promise<AuthUser | null>;
  signOut(): Promise<void>;
}
