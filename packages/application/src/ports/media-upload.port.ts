/**
 * @file media-upload.port.ts
 * @description منفذ رفع الفيديو. المتصفح يرفع الملف **مباشرة** إلى Cloudinary (لا يمر عبر خادمنا، فلا حدّ
 * لحجم الطلب في Vercel)، والخادم يوقّع الطلب فقط حتى لا يظهر السر. في قاعدة البيانات نحفظ الرابط نصًا.
 */

export interface UploadTicket {
  /** عنوان الرفع المباشر */
  uploadUrl: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  /** توقيع الطلب (حقول الرفع الموقّعة) */
  signature: string;
}

/** نوع الملف المرفوع: فيديو درس، أو صورة غلاف */
export type UploadKind = 'video' | 'image';

export interface MediaUploadSignerPort {
  /** يعيد null إذا لم تُضبط بيانات الخدمة (فلا يعرض النموذج الرفع) */
  sign(kind?: UploadKind): UploadTicket | null;
}
