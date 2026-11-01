/**
 * @file cloudinary-upload.ts
 * @description رفع ملف من المتصفح مباشرة إلى Cloudinary بتوقيع من الخادم (تذكرة المدير): فيديو الدرس، أو صورة غلاف.
 * يشترك فيه نموذج الدرس واستيراد الفيديوهات المستقلة وحقل الغلاف؛ ما يصل لنموذجنا رابط نصي (ومدة للفيديو) فقط.
 */

/** حدّ رفع الفيديو الواحد في الخطة المجانية لـ Cloudinary */
export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

/** حدّ صورة الغلاف: تُصغَّر عند العرض، فلا حاجة لملفات ثقيلة */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export interface UploadedVideo {
  url: string;
  durationSeconds: number;
}

type UploadKind = 'video' | 'image';

async function uploadToCloudinary(
  kind: UploadKind,
  file: File,
  onProgress: (percent: number) => void,
): Promise<{ secure_url: string; duration?: number }> {
  const response = await fetch(`/api/admin/upload-ticket?kind=${kind}`, { method: 'POST' });
  const ticket = await response.json();
  if (!response.ok) throw new Error(ticket.error ?? 'تعذّر بدء الرفع');

  const body = new FormData();
  body.set('file', file);
  body.set('api_key', ticket.apiKey);
  body.set('timestamp', String(ticket.timestamp));
  body.set('folder', ticket.folder);
  body.set('signature', ticket.signature);

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', ticket.uploadUrl);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => {
      try {
        const json = JSON.parse(request.responseText);
        if (request.status >= 200 && request.status < 300) resolve(json);
        else reject(new Error(json.error?.message ?? 'رفضت Cloudinary الملف'));
      } catch {
        reject(new Error('ردّ غير مفهوم من Cloudinary'));
      }
    };
    request.onerror = () => reject(new Error('انقطع الاتصال أثناء الرفع'));
    request.send(body);
  });
}

export async function uploadVideo(file: File, onProgress: (percent: number) => void): Promise<UploadedVideo> {
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('حجم الفيديو أكبر من 100 ميجابايت. اضغطه أو قصّه ثم أعد المحاولة.');
  const result = await uploadToCloudinary('video', file, onProgress);
  return { url: result.secure_url, durationSeconds: result.duration ?? 0 };
}

/** يرفع صورة غلاف ويعيد رابطها */
export async function uploadImage(file: File, onProgress: (percent: number) => void): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('اختر ملف صورة (JPG أو PNG أو WebP).');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('حجم الصورة أكبر من 10 ميجابايت. صغّرها ثم أعد المحاولة.');
  const result = await uploadToCloudinary('image', file, onProgress);
  return result.secure_url;
}
