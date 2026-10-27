/**
 * @file lesson-fields.tsx
 * @description حقول نموذج الدرس المشتركة بين الإضافة والتعديل.
 */
import Link from 'next/link';
import { Field, inputClass } from './admin-ui';

export interface LessonDefaults {
  title?: string;
  conceptId?: string;
  videoUrl?: string;
  start?: string;
  end?: string;
  channelName?: string;
  language?: string;
  summary?: string;
  notes?: string;
}

export function LessonFields({
  concepts,
  defaults = {},
}: {
  concepts: Array<{ id: string; name: string }>;
  defaults?: LessonDefaults;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <Field label="عنوان الدرس" name="title" defaultValue={defaults.title} required />
      </div>
      <div className="md:col-span-2">
        <Field
          label="رابط الفيديو على يوتيوب"
          name="videoUrl"
          defaultValue={defaults.videoUrl}
          dir="ltr"
          required
          placeholder="https://www.youtube.com/watch?v=..."
          hint="تضمين رسمي فقط: لا ننسخ الفيديو ولا نعيد استضافته."
        />
      </div>
      <Field label="بداية المقطع" name="start" defaultValue={defaults.start ?? '0:00'} dir="ltr" required hint="مثل 0:00 أو 14:20 أو 1:02:03" />
      <Field label="نهاية المقطع" name="end" defaultValue={defaults.end} dir="ltr" required hint="يجب أن تكون بعد البداية" />
      <Field label="اسم القناة" name="channelName" defaultValue={defaults.channelName} required hint="يُعرض دائمًا مع الدرس حفظًا للحقوق." />
      <label className="block">
        <span className="block text-sm font-medium text-ink">لغة الشرح</span>
        <select name="language" defaultValue={defaults.language ?? 'ar'} className={inputClass}>
          <option value="ar">العربية</option>
          <option value="en">الإنجليزية</option>
        </select>
      </label>
      <div className="md:col-span-2">
        <label className="block">
          <span className="block text-sm font-medium text-ink">
            المفهوم الذي يغطيه الدرس <span className="text-red-700">*</span>
          </span>
          <select name="conceptId" defaultValue={defaults.conceptId} required className={inputClass}>
            {concepts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        {concepts.length === 0 ? (
          <p className="mt-1 text-xs text-red-700">
            لا توجد مفاهيم بعد.{' '}
            <Link href="/admin/concepts" className="underline">
              أضف مفهومًا أولًا
            </Link>
          </p>
        ) : null}
      </div>
      <div className="md:col-span-2">
        <Field label="ملخص قصير" name="summary" defaultValue={defaults.summary} rows={3} />
      </div>
      <div className="md:col-span-2">
        <Field
          label="ملاحظاتك عن محتوى الدرس (لا تظهر للمتعلم)"
          name="notes"
          defaultValue={defaults.notes}
          rows={6}
          hint="اكتب النقاط والتعريفات التي شرحها الفيديو. هذه المصدر الوحيد الذي يبني عليه الذكاء الاصطناعي أسئلة الاختبار، فكلما كانت أدق كانت الأسئلة أصح."
        />
      </div>
    </div>
  );
}
