/**
 * @file page.tsx
 * @description ملخص الدرس للقراءة، مهيّأ للطباعة وحفظه PDF. عرض بحت؛ التحليل في Domain.
 */
import { createLessonId, createPathId, parseStudyGuide } from '@qalam/domain';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { QalamLogo } from '../../../../../../components/brand';
import { PrintButton } from '../../../../../../components/print-button';
import { getAuth } from '../../../../../../composition/auth';
import { getContainer } from '../../../../../../composition/container';

export const dynamic = 'force-dynamic';

export default async function LessonSummaryPage({ params }: { params: Promise<{ pathId: string; lessonId: string }> }) {
  const { pathId, lessonId } = await params;
  const user = await (await getAuth()).getCurrentUser.execute();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/paths/${pathId}/lessons/${lessonId}/summary`)}`);

  const { getLesson } = await getContainer();
  const result = await getLesson
    .execute({ pathId: createPathId(pathId), lessonId: createLessonId(lessonId) })
    .catch(() => null);
  if (!result || !result.lesson.studyGuide) notFound();
  const { lesson, pathTitle, module } = result;
  const sections = parseStudyGuide(lesson.studyGuide ?? '');

  return (
    <article className="mx-auto max-w-3xl px-5 py-10 print:max-w-none print:px-0 print:py-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/paths/${pathId}/lessons/${lessonId}`} className="text-sm text-on-surface-variant hover:underline">
          ← العودة إلى الدرس
        </Link>
        <PrintButton className="btn-filled" targetId="summary-sheet" fileName={`ملخص-${lesson.title}`} />
      </div>

      <div id="summary-sheet" className="bg-surface-container-lowest p-2">
      <header className="mb-6 flex items-center justify-between border-b-2 border-primary pb-4">
        <QalamLogo size={40} />
        <span className="text-sm text-on-surface-variant">ملخص من منصة قلم · qalam</span>
      </header>
      <p className="text-sm text-on-surface-variant">
        {pathTitle} / {module.title}
      </p>
      <h1 className="mt-2 font-display text-display text-on-surface">{lesson.title}</h1>
      <p className="mt-1 text-sm text-on-surface-variant">المصدر: {lesson.channelName}</p>

      <div className="mt-8 space-y-7">
        {sections.map((section, index) => (
          <section key={index} data-pdf-block className="break-inside-avoid">
            {section.heading ? <h2 className="font-display text-xl font-semibold text-on-surface">{section.heading}</h2> : null}
            {section.paragraphs.map((paragraph, i) => (
              <p key={i} className="mt-2 leading-8 text-on-surface">
                {paragraph}
              </p>
            ))}
            {section.points.length > 0 ? (
              <ul className="mt-2 list-disc space-y-1 ps-6 leading-8 text-on-surface">
                {section.points.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>

      <p data-pdf-block className="mt-10 border-t border-outline-variant pt-4 text-xs text-on-surface-variant">
        أُعدّ هذا الملخص بواسطة منصة «قلم» بالذكاء الاصطناعي اعتمادًا على محتوى الدرس. الفيديو هو المرجع الأصلي، وراجعه عند أي التباس.
      </p>
      <footer className="mt-6 flex items-center justify-center gap-2 text-sm text-on-surface-variant">
        <QalamLogo size={22} /> <span>منصة قلم للتعلّم الذكي</span>
      </footer>
      </div>
    </article>
  );
}
