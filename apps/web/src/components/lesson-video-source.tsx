'use client';

/**
 * @file lesson-video-source.tsx
 * @description مصدر فيديو الدرس: رابط يوتيوب (تضمين رسمي) أو رفع ملف من الجهاز إلى Cloudinary.
 * الرفع يتم من المتصفح مباشرة إلى Cloudinary بتوقيع من الخادم؛ ما يصل لنموذجنا رابط نصي ومدة فقط.
 */
import { useState } from 'react';

interface Props {
  defaults: { videoUrl?: string; start?: string; end?: string; mediaUrl?: string };
}

type UploadState =
  | { phase: 'idle' }
  | { phase: 'uploading'; percent: number }
  | { phase: 'error'; message: string };

const MAX_BYTES = 100 * 1024 * 1024; // حدّ رفع الفيديو الواحد في الخطة المجانية لـ Cloudinary

export function LessonVideoSource({ defaults }: Props) {
  const [mode, setMode] = useState<'youtube' | 'upload'>(defaults.mediaUrl ? 'upload' : 'youtube');
  const [mediaUrl, setMediaUrl] = useState(defaults.mediaUrl ?? '');
  const [duration, setDuration] = useState('');
  const [upload, setUpload] = useState<UploadState>({ phase: 'idle' });

  async function onPick(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setUpload({ phase: 'error', message: 'حجم الفيديو أكبر من 100 ميجابايت. اضغطه أو قصّه ثم أعد المحاولة.' });
      return;
    }
    setUpload({ phase: 'uploading', percent: 0 });
    try {
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
          if (event.lengthComputable) setUpload({ phase: 'uploading', percent: Math.round((event.loaded / event.total) * 100) });
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

      setMediaUrl(result.secure_url);
      setDuration(result.duration ? String(result.duration) : '');
      setUpload({ phase: 'idle' });
    } catch (error) {
      setUpload({ phase: 'error', message: error instanceof Error ? error.message : 'فشل الرفع' });
    }
  }

  const isUpload = mode === 'upload';
  return (
    <div className="space-y-4 md:col-span-2">
      <fieldset>
        <legend className="text-label text-on-surface">مصدر الفيديو</legend>
        <div className="mt-2 flex flex-wrap gap-4">
          <label className="flex items-center gap-2">
            <input type="radio" name="videoSource" checked={!isUpload} onChange={() => setMode('youtube')} />
            رابط يوتيوب
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="videoSource" checked={isUpload} onChange={() => setMode('upload')} />
            رفع فيديو من الجهاز
          </label>
        </div>
      </fieldset>

      {isUpload ? (
        <div className="space-y-2">
          <input type="hidden" name="mediaUrl" value={mediaUrl} />
          <input type="hidden" name="mediaDurationSeconds" value={duration} />
          <label className="block">
            <span className="block text-label text-on-surface">
              ملف الفيديو <span className="text-error">*</span>
            </span>
            <input
              type="file"
              accept="video/*"
              className="field"
              disabled={upload.phase === 'uploading'}
              onChange={(event) => void onPick(event.target.files?.[0])}
            />
          </label>
          {upload.phase === 'uploading' ? (
            <p role="status" className="text-sm text-muted">
              جارٍ الرفع… {upload.percent}%
            </p>
          ) : null}
          {upload.phase === 'error' ? (
            <p role="alert" className="text-sm text-error">
              {upload.message}
            </p>
          ) : null}
          {mediaUrl ? (
            <p className="break-all text-xs text-muted" dir="ltr">
              تم الرفع: {mediaUrl}
            </p>
          ) : (
            <p className="text-xs text-muted">يُرفع إلى Cloudinary ويُحفظ رابطه نصًا فقط. الحد 100 ميجابايت.</p>
          )}
        </div>
      ) : (
        <label className="block">
          <span className="block text-label text-on-surface">
            رابط الفيديو على يوتيوب <span className="text-error">*</span>
          </span>
          <input
            name="videoUrl"
            defaultValue={defaults.videoUrl}
            dir="ltr"
            required
            placeholder="https://www.youtube.com/watch?v=..."
            className="field"
          />
          <span className="field-hint">تضمين رسمي فقط: لا ننسخ الفيديو ولا نعيد استضافته.</span>
        </label>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="block text-label text-on-surface">بداية المقطع</span>
          <input name="start" defaultValue={defaults.start ?? '0:00'} dir="ltr" required={!isUpload} className="field" />
          <span className="field-hint">مثل 0:00 أو 14:20 أو 1:02:03</span>
        </label>
        <label className="block">
          <span className="block text-label text-on-surface">
            نهاية المقطع {isUpload ? null : <span className="text-error">*</span>}
          </span>
          <input name="end" defaultValue={defaults.end} dir="ltr" required={!isUpload} className="field" />
          <span className="field-hint">{isUpload ? 'اتركها فارغة لتكون نهاية الفيديو كله.' : 'يجب أن تكون بعد البداية'}</span>
        </label>
      </div>
    </div>
  );
}
