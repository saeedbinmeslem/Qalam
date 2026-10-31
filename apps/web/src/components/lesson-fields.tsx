/**
 * @file lesson-fields.tsx
 * @description حقول نموذج الدرس المشتركة بين الإضافة والتعديل.
 */
import { Field, inputClass } from './admin-ui';
import { LessonVideoSource } from './lesson-video-source';

export interface LessonDefaults {
  title?: string;
  videoUrl?: string;
  mediaUrl?: string;
  start?: string;
  end?: string;
  channelName?: string;
  language?: string;
  summary?: string;
  notes?: string;
}

export function LessonFields({ defaults = {} }: { defaults?: LessonDefaults }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <Field label="عنوان الدرس" name="title" defaultValue={defaults.title} required />
      </div>
      <LessonVideoSource
        defaults={{ videoUrl: defaults.videoUrl, start: defaults.start, end: defaults.end, mediaUrl: defaults.mediaUrl }}
      />
      <Field label="اسم القناة أو المصدر" name="channelName" defaultValue={defaults.channelName} required hint="يُعرض دائمًا مع الدرس حفظًا للحقوق (للفيديو المرفوع اكتب اسم صاحب المحتوى)." />
      <label className="block">
        <span className="block text-sm font-medium text-ink">لغة الشرح</span>
        <select name="language" defaultValue={defaults.language ?? 'ar'} className={inputClass}>
          <option value="ar">العربية</option>
          <option value="en">الإنجليزية</option>
        </select>
      </label>
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
