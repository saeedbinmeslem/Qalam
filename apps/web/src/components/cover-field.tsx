'use client';

/**
 * @file cover-field.tsx
 * @description حقل صورة الغلاف في لوحة التحكم: معاينة، رفع صورة إلى Cloudinary، إزالة. الحقل المخفي `coverUrl`
 * هو ما يصل للإجراء (فارغ = إزالة الغلاف فيظهر غلاف الحرف). عند غياب الصورة تُعرض المعاينة بغلاف الحرف نفسه.
 */
import { useId, useState } from 'react';
import { uploadImage } from './cloudinary-upload';
import { CoverArt } from './cover-art';

interface Props {
  /** معرّف يحدد لون غلاف الحرف (معرّف المسار) */
  seed: string;
  /** العنوان الذي يؤخذ منه الحرف الأول في المعاينة */
  title: string;
  defaultValue?: string | undefined;
}

type UploadState = { phase: 'idle' } | { phase: 'uploading'; percent: number } | { phase: 'error'; message: string };

export function CoverField({ seed, title, defaultValue }: Props) {
  const inputId = useId();
  const [url, setUrl] = useState(defaultValue ?? '');
  const [upload, setUpload] = useState<UploadState>({ phase: 'idle' });

  async function onPick(file: File | undefined) {
    if (!file) return;
    setUpload({ phase: 'uploading', percent: 0 });
    try {
      setUrl(await uploadImage(file, (percent) => setUpload({ phase: 'uploading', percent })));
      setUpload({ phase: 'idle' });
    } catch (error) {
      setUpload({ phase: 'error', message: error instanceof Error ? error.message : 'فشل الرفع' });
    }
  }

  const uploading = upload.phase === 'uploading';
  return (
    <div className="grid gap-4 sm:grid-cols-[14rem_1fr] sm:items-start">
      <input type="hidden" name="coverUrl" value={url} />
      <CoverArt seed={seed} title={title} imageUrl={url || undefined} className="aspect-video w-full rounded-md border border-outline-variant" />
      <div className="space-y-3">
        <p className="text-label text-on-surface">صورة الغلاف</p>
        <p className="field-hint !mt-0">
          {url ? 'الصورة تظهر خلفية للبطاقة والترويسة.' : 'لا صورة: يظهر غلاف بالحرف الأول من العنوان.'}
        </p>
        <div className="flex flex-wrap gap-2">
          <label htmlFor={inputId} className={`btn-outlined btn-sm ${uploading ? 'pointer-events-none opacity-50' : ''}`}>
            {url ? 'استبدال الصورة' : 'رفع صورة'}
          </label>
          <input
            id={inputId}
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={uploading}
            onChange={(event) => {
              void onPick(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
          {url ? (
            <button type="button" className="btn-danger btn-sm" onClick={() => setUrl('')} disabled={uploading}>
              إزالة الصورة
            </button>
          ) : null}
        </div>
        {uploading ? (
          <p role="status" className="text-sm text-on-surface-variant">
            جارٍ الرفع… {upload.percent}%
          </p>
        ) : null}
        {upload.phase === 'error' ? (
          <p role="alert" className="text-sm text-error">
            {upload.message}
          </p>
        ) : null}
        <p className="field-hint">
          تُحفظ الصورة عند الضغط على «حفظ». يُنصح بأفقية 16:9، ويقصّها الموقع ويصغّرها تلقائيًا.
        </p>
      </div>
    </div>
  );
}
