/**
 * @file cloudinary-upload.ts
 * @description رفع ملف فيديو من المتصفح مباشرة إلى Cloudinary بتوقيع من الخادم (تذكرة المدير).
 * يشترك فيه نموذج الدرس واستيراد الفيديوهات المستقلة؛ ما يصل لنموذجنا رابط نصي ومدة فقط.
 */

/** حدّ رفع الفيديو الواحد في الخطة المجانية لـ Cloudinary */
export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

export interface UploadedVideo {
  url: string;
  durationSeconds: number;
}

export async function uploadVideo(file: File, onProgress: (percent: number) => void): Promise<UploadedVideo> {
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('حجم الفيديو أكبر من 100 ميجابايت. اضغطه أو قصّه ثم أعد المحاولة.');

  const response = await fetch('/api/admin/upload-ticket', { method: 'POST' });
  const ticket = await response.json();
  if (!response.ok) throw new Error(ticket.error ?? 'تعذّر بدء الرفع');

  const body = new FormData();
  body.set('file', file);
  body.set('api_key', ticket.apiKey);
  body.set('timestamp', String(ticket.timestamp));
  body.set('folder', ticket.folder);
  body.set('signature', ticket.signature);

  const result = await new Promise<{ secure_url: string; duration?: number }>((resolve, reject) => {
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
  return { url: result.secure_url, durationSeconds: result.duration ?? 0 };
}
