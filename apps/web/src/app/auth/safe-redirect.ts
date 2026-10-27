/**
 * @file safe-redirect.ts
 * @description يمنع إعادة التوجيه المفتوحة: يقبل مسارًا نسبيًا داخل الموقع فقط.
 */
export function safeRedirectPath(raw: string | null | undefined, fallback = '/'): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return fallback;
  return raw;
}
