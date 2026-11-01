/**
 * @file cloudinary-media.ts
 * @description التحقق من رابط فيديو مرفوع إلى Cloudinary. نخزّن الرابط نصًا فقط (لا الفيديو نفسه)،
 * فنقبل روابط التسليم الرسمية `https://res.cloudinary.com/<cloud>/video/upload/...` فقط، منعًا لوضع
 * روابط عشوائية أو غير آمنة كمصدر للمشغّل.
 */

export interface CloudinaryVideo {
  /** الرابط المعتمد (https) */
  url: string;
  /** معرّف الملف داخل Cloudinary (يصلح معرّفًا للمقطع) */
  publicId: string;
}

export function parseCloudinaryVideoUrl(input: string): CloudinaryVideo {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new Error('رابط الفيديو المرفوع غير صالح');
  }
  if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com') {
    throw new Error('رابط الفيديو يجب أن يكون من Cloudinary (res.cloudinary.com) عبر https');
  }
  // /<cloud>/video/upload/[تحويلات/][v123/]<publicId>.<ext>
  const parts = url.pathname.split('/').filter(Boolean);
  const uploadIndex = parts.indexOf('upload');
  if (parts[1] !== 'video' || uploadIndex !== 2 || parts.length <= uploadIndex + 1) {
    throw new Error('الرابط ليس رابط فيديو مرفوعًا في Cloudinary');
  }
  const last = parts[parts.length - 1] ?? '';
  const publicId = last.replace(/\.[A-Za-z0-9]+$/, '');
  if (!publicId) throw new Error('الرابط ليس رابط فيديو مرفوعًا في Cloudinary');
  return { url: url.toString(), publicId };
}

/**
 * رابط صورة غلاف مرفوعة إلى Cloudinary: `https://res.cloudinary.com/<cloud>/image/upload/...` فقط (نفس منطق الفيديو).
 * يعيد الرابط المعتمد، أو undefined إن كان الإدخال فارغًا (= لا غلاف، فيظهر غلاف الحرف).
 */
export function normalizeCoverUrl(input: string | undefined | null): string | undefined {
  const trimmed = (input ?? '').trim();
  if (!trimmed) return undefined;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error('رابط صورة الغلاف غير صالح');
  }
  const parts = url.pathname.split('/').filter(Boolean);
  if (
    url.protocol !== 'https:' ||
    url.hostname !== 'res.cloudinary.com' ||
    parts[1] !== 'image' ||
    parts[2] !== 'upload' ||
    parts.length <= 3
  ) {
    throw new Error('صورة الغلاف يجب أن تكون مرفوعة في Cloudinary (res.cloudinary.com/.../image/upload) عبر https');
  }
  return url.toString();
}
