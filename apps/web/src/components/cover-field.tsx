'use client';

/**
 * @file cover-field.tsx
 * @description حقل صورة الغلاف في لوحة التحكم: معاينة، رفع صورة إلى Cloudinary، إزالة. الحقل المخفي `coverUrl`
 * هو ما يصل للإجراء (فارغ = إزالة الغلاف فيظهر غلاف الحرف). عند غياب الصورة تُعرض المعاينة بغلاف الحرف نفسه.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { coverKey, startCoverUpload, useCoverUpload, type CoverTarget } from './background-uploads';
import { MAX_IMAGE_BYTES } from './cloudinary-upload';
import { CoverArt } from './cover-art';
import { REBASE_EVENT } from './save-button';

interface Props {
  /** معرّف يحدد لون غلاف الحرف (معرّف المسار) */
  seed: string;
  /** العنوان الذي يؤخذ منه الحرف الأول في المعاينة */
  title: string;
  defaultValue?: string | undefined;
  /** صورة تُعرض تلقائيًا عند غياب المرفوعة (صورة أول درس للكورس)؛ لا تُحفظ في الحقل */
  fallbackUrl?: string | undefined;
  /** أين يُحفظ الغلاف تلقائيًا عند انتهاء الرفع الخلفي (المسار، أو كورس فيه) */
  target: CoverTarget;
}

export function CoverField({ seed, title, defaultValue, fallbackUrl, target }: Props) {
  const inputId = useId();
  const [url, setUrl] = useState(defaultValue ?? '');
  const [pickError, setPickError] = useState('');
  const upload = useCoverUpload(coverKey(target));
  const hiddenRef = useRef<HTMLInputElement>(null);

  // انتهى الرفع الخلفي وحُفظ الغلاف: تظهر الصورة الجديدة في المعاينة والحقل المخفي
  const finishedUrl = upload?.phase === 'done' ? upload.url : '';
  useEffect(() => {
    if (!finishedUrl) return;
    setUrl(finishedUrl);
    // الغلاف حُفظ على الخادم أصلًا: لا يُعدّ تعديلًا غير محفوظ في النموذج
    hiddenRef.current?.form?.dispatchEvent(new CustomEvent(REBASE_EVENT, { detail: { name: 'coverUrl', value: finishedUrl } }));
  }, [finishedUrl]);

  function onPick(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith('image/')) return setPickError('اختر ملف صورة (JPG أو PNG أو WebP).');
    if (file.size > MAX_IMAGE_BYTES) return setPickError('حجم الصورة أكبر من 10 ميجابايت. صغّرها ثم أعد المحاولة.');
    setPickError('');
    startCoverUpload(target, title, file);
  }

  const uploading = upload?.phase === 'uploading' || upload?.phase === 'saving';
  return (
    <div className="grid gap-4 sm:grid-cols-[14rem_1fr] sm:items-start">
      <input ref={hiddenRef} type="hidden" name="coverUrl" value={url} />
      <CoverArt seed={seed} title={title} imageUrl={url || fallbackUrl || undefined} className="aspect-video w-full rounded-md border border-outline-variant" />
      <div className="space-y-3">
        <p className="text-label text-on-surface">صورة الغلاف</p>
        <p className="field-hint !mt-0">
          {url
            ? 'الصورة تظهر خلفية للبطاقة والترويسة.'
            : fallbackUrl
              ? 'لا صورة مرفوعة: يأخذ الكورس تلقائيًا صورة أول درس فيه من يوتيوب.'
              : 'لا صورة: يظهر غلاف بالحرف الأول من العنوان.'}
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
              onPick(event.target.files?.[0]);
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
          <div role="status" className="space-y-1 text-sm text-on-surface-variant">
            <p>
              {upload.phase === 'saving' ? 'جارٍ حفظ الغلاف…' : `جارٍ الرفع… ${upload.percent}%`} يعمل في الخلفية، يمكنك متابعة التعديل أو التنقل.
            </p>
            <div className="h-1.5 overflow-hidden rounded-full bg-outline-variant">
              <div className="h-full bg-primary transition-[width]" style={{ width: `${upload.percent}%` }} />
            </div>
          </div>
        ) : null}
        {pickError || upload?.phase === 'failed' ? (
          <p role="alert" className="text-sm text-error">
            {pickError || upload?.message}
          </p>
        ) : null}
        <p className="field-hint">
          تُحفظ الصورة تلقائيًا فور انتهاء الرفع (وإزالتها تُحفظ بزر «حفظ» الذي يظهر عند التعديل). يُنصح بأفقية 16:9، ويقصّها الموقع ويصغّرها تلقائيًا.
        </p>
      </div>
    </div>
  );
}
