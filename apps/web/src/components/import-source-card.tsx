'use client';

/**
 * @file import-source-card.tsx
 * @description كارد إضافة محتوى إلى المسار في مكان واحد، بنوعين:
 * - «قائمة يوتيوب»: رابط واحد يُستورد كورسًا كاملًا (بنية بالذكاء الاصطناعي).
 * - «فيديوهات مستقلة»: صفوف مرتبة بترتيب الإضافة، كل صف رابط يوتيوب أو فيديو من الجهاز، وتُستورد كلها بضغطة واحدة كورسًا واحدًا.
 * الإرسال لإجراءات الخادم؛ رفع الملفات يتم من المتصفح مباشرة إلى Cloudinary ولا يصلنا إلا الرابط.
 */
import { useState } from 'react';
import { importPlaylistAction, importVideosAction } from '../app/admin/actions';
import { Field, ghostButton, inputClass, primaryButton } from './admin-ui';
import { JobLoader } from './background-jobs';
import { InlinePending, PendingButton } from './inline-pending';
import { uploadVideo } from './cloudinary-upload';

type Mode = 'playlist' | 'videos';

interface Row {
  key: number;
  kind: 'youtube' | 'upload';
  url: string;
  mediaUrl: string;
  title: string;
  durationSeconds: number;
  status: 'idle' | 'uploading' | 'error';
  percent: number;
  error: string;
}

const emptyRow = (key: number): Row => ({
  key,
  kind: 'youtube',
  url: '',
  mediaUrl: '',
  title: '',
  durationSeconds: 0,
  status: 'idle',
  percent: 0,
  error: '',
});

/** اسم الملف بلا امتداده عنوانًا مبدئيًا يعدّله المالك */
const titleFromFile = (name: string) => name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();

export function ImportSourceCard({
  pathId,
  concepts,
}: {
  pathId: string;
  concepts: Array<{ id: string; name: string }>;
}) {
  const [mode, setMode] = useState<Mode>('playlist');
  const [rows, setRows] = useState<Row[]>([emptyRow(0)]);
  const [nextKey, setNextKey] = useState(1);

  const patch = (key: number, changes: Partial<Row>) =>
    setRows((current) => current.map((r) => (r.key === key ? { ...r, ...changes } : r)));

  async function onPick(key: number, file: File | undefined) {
    if (!file) return;
    patch(key, { status: 'uploading', percent: 0, error: '', mediaUrl: '', title: titleFromFile(file.name) });
    try {
      const uploaded = await uploadVideo(file, (percent) => patch(key, { percent }));
      patch(key, { status: 'idle', mediaUrl: uploaded.url, durationSeconds: uploaded.durationSeconds });
    } catch (error) {
      patch(key, { status: 'error', error: error instanceof Error ? error.message : 'فشل الرفع' });
    }
  }

  const addRow = () => {
    setRows((current) => [...current, emptyRow(nextKey)]);
    setNextKey(nextKey + 1);
  };
  const removeRow = (key: number) => setRows((current) => (current.length > 1 ? current.filter((r) => r.key !== key) : current));

  const ready = rows.filter((r) => (r.kind === 'youtube' ? r.url.trim() : r.mediaUrl));
  const uploading = rows.some((r) => r.status === 'uploading');
  const items = JSON.stringify(
    ready.map((r) =>
      r.kind === 'youtube'
        ? { kind: 'youtube', url: r.url.trim() }
        : { kind: 'upload', mediaUrl: r.mediaUrl, title: r.title, durationSeconds: r.durationSeconds },
    ),
  );

  const tab = (value: Mode, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === value}
      onClick={() => setMode(value)}
      className={mode === value ? 'btn-filled btn-sm' : 'btn-outlined btn-sm'}
    >
      {label}
    </button>
  );

  return (
    <section className="card-outlined p-5">
      <h2 className="mb-4 font-display text-lg font-bold text-on-surface">إضافة محتوى إلى المسار</h2>
      <div role="tablist" aria-label="نوع الإضافة" className="mb-5 flex flex-wrap gap-2">
        {tab('playlist', 'قائمة يوتيوب (استيراد دفعة واحدة)')}
        {tab('videos', 'فيديوهات مستقلة (روابط أو من الجهاز)')}
      </div>

      {mode === 'playlist' ? (
        <form action={importPlaylistAction} data-inline-loader className="space-y-4">
          <input type="hidden" name="pathId" value={pathId} />
          <Field
            label="رابط القائمة"
            name="playlistUrl"
            required
            dir="ltr"
            placeholder="https://www.youtube.com/playlist?list=..."
            hint="الصق الرابط فقط. تصير القائمة كلها كورسًا واحدًا: يحدد الذكاء الاصطناعي مفهومه من مفاهيم هذا المسار (أو ينشئ مفهومًا جديدًا بمتطلباته)، ويقسّمه إلى وحدات ودروس، وتؤخذ المدة والقناة والمصدر من يوتيوب."
          />
          <PendingButton className={primaryButton}>استيراد الكورس</PendingButton>
          <InlinePending label="جارٍ بدء العملية…" />
          <JobLoader matchKey={`import:${pathId}:new`} label="جارٍ استيراد القائمة وتوليد محتواها…" />
          <p className="text-xs text-on-surface-variant">
            تُستورد القائمة كاملة دفعة واحدة مهما طالت، والمكرر يُتجاوز. بعد البناء تُولَّد الملاحظات وملخصات القراءة ومسودات الأسئلة في الخلفية
            (قد تستغرق دقائق؛ تابع حالتها في الشريط أعلى الصفحة وتصفّح بحرية). كل شيء يدخل «بانتظار المراجعة» ولا يراه المتعلم معتمدًا إلا بعد موافقتك.
          </p>
        </form>
      ) : (
        <form action={importVideosAction} data-inline-loader className="space-y-4">
          <input type="hidden" name="pathId" value={pathId} />
          <input type="hidden" name="items" value={items} />
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="عنوان الكورس" name="courseTitle" required hint="تصير الفيديوهات كلها كورسًا واحدًا بهذا العنوان." />
            <label className="block">
              <span className="block text-label text-on-surface">المفهوم</span>
              <select name="conceptId" className={inputClass} defaultValue="">
                <option value="">مفهوم جديد باسم الكورس</option>
                {concepts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <ol className="space-y-3">
            {rows.map((row, index) => (
              <li key={row.key} className="card-filled space-y-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-on-surface">الفيديو {index + 1}</span>
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name={`kind-${row.key}`}
                        checked={row.kind === 'youtube'}
                        onChange={() => patch(row.key, { kind: 'youtube' })}
                      />
                      رابط يوتيوب
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name={`kind-${row.key}`}
                        checked={row.kind === 'upload'}
                        onChange={() => patch(row.key, { kind: 'upload' })}
                      />
                      من الجهاز
                    </label>
                    {rows.length > 1 ? (
                      <button type="button" className={ghostButton} onClick={() => removeRow(row.key)}>
                        إزالة
                      </button>
                    ) : null}
                  </div>
                </div>

                {row.kind === 'youtube' ? (
                  <input
                    aria-label={`رابط الفيديو ${index + 1}`}
                    value={row.url}
                    onChange={(e) => patch(row.key, { url: e.target.value })}
                    dir="ltr"
                    placeholder="https://www.youtube.com/watch?v=..."
                    className={inputClass}
                  />
                ) : (
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="video/*"
                      aria-label={`ملف الفيديو ${index + 1}`}
                      className="field"
                      disabled={row.status === 'uploading'}
                      onChange={(e) => void onPick(row.key, e.target.files?.[0])}
                    />
                    {row.status === 'uploading' ? (
                      <p role="status" className="text-sm text-on-surface-variant">
                        جارٍ الرفع… {row.percent}%
                      </p>
                    ) : null}
                    {row.status === 'error' ? (
                      <p role="alert" className="text-sm text-error">
                        {row.error}
                      </p>
                    ) : null}
                    {row.mediaUrl ? (
                      <input
                        aria-label={`عنوان الدرس ${index + 1}`}
                        value={row.title}
                        onChange={(e) => patch(row.key, { title: e.target.value })}
                        placeholder="عنوان الدرس"
                        className={inputClass}
                      />
                    ) : (
                      <p className="text-xs text-on-surface-variant">يُرفع إلى Cloudinary ويُحفظ رابطه نصًا فقط. الحد 100 ميجابايت.</p>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ol>

          <button type="button" className={ghostButton} onClick={addRow}>
            + إضافة فيديو آخر
          </button>

          <div className="space-y-3 border-t border-outline-variant pt-4">
            <PendingButtonDisabled disabled={uploading || ready.length === 0}>
              استيراد {ready.length > 0 ? `${ready.length} ` : ''}فيديو ككورس
            </PendingButtonDisabled>
            <InlinePending label="جارٍ بدء العملية…" />
            <JobLoader matchKey={`import:${pathId}:new`} label="جارٍ استيراد الفيديوهات…" />
            <p className="text-xs text-on-surface-variant">
              تدخل الدروس بترتيب إضافتك لها. {uploading ? 'انتظر انتهاء الرفع. ' : ''}كل شيء يدخل «بانتظار المراجعة» ولا يراه المتعلم معتمدًا إلا بعد موافقتك.
            </p>
          </div>
        </form>
      )}
    </section>
  );
}

/** زر الإرسال مع تعطيل إضافي (رفع جارٍ أو لا عناصر جاهزة) فوق تعطيل الانتظار */
function PendingButtonDisabled({ children, disabled }: { children: React.ReactNode; disabled: boolean }) {
  return (
    <fieldset disabled={disabled} className="contents">
      <PendingButton className={primaryButton}>{children}</PendingButton>
    </fieldset>
  );
}
