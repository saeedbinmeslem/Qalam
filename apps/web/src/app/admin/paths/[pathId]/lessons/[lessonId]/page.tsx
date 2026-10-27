/**
 * @file page.tsx
 * @description تعديل درس ومراجعته: معاينة المقطع كما سيراه المتعلم، ثم اعتماد الدرس أو تعديله.
 * اعتماد الدرس قرار المالك وحده بعد المشاهدة؛ وأي تعديل على المحتوى يسحب الاعتماد تلقائيًا.
 */
import { createLessonId, createPathId, formatTimecode } from '@qalam/domain';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, ErrorBanner, ReviewBadge, ghostButton, primaryButton } from '../../../../../../components/admin-ui';
import { LessonFields } from '../../../../../../components/lesson-fields';
import { YouTubePlayer } from '../../../../../../components/youtube-player';
import { getAdminContainer } from '../../../../../../composition/admin';
import { setLessonReviewAction, updateLessonAction } from '../../../../actions';

export default async function AdminLessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ pathId: string; lessonId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { pathId, lessonId } = await params;
  const { error } = await searchParams;
  const admin = await getAdminContainer();

  const result = await admin.getPath.execute({ pathId: createPathId(pathId) }).catch(() => null);
  const found = result?.path.findLesson(createLessonId(lessonId));
  if (!result || !found) notFound();
  const { lesson } = found;
  const concepts = (await admin.listConcepts.execute({ actor: admin.actor })).map((c) => ({
    id: c.id as string,
    name: c.name,
  }));
  const here = `/admin/paths/${pathId}/lessons/${lessonId}`;

  return (
    <>
      <ErrorBanner message={error} />
      <Link href={`/admin/paths/${pathId}`} className="text-sm text-muted hover:text-ink">
        ← {result.path.title}
      </Link>
      <h1 className="mb-6 mt-1 font-display text-2xl font-extrabold text-ink">{lesson.title}</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <YouTubePlayer
            embedUrl={lesson.segment.toEmbedUrl()}
            title={lesson.title}
            channelName={lesson.channelName}
            sourceUrl={lesson.sourceUrl}
          />
          <Card title="المراجعة البشرية">
            <p className="mb-3 flex items-center gap-3 text-sm text-muted">
              الحالة الحالية: <ReviewBadge reviewed={lesson.reviewedByHuman} />
            </p>
            <p className="mb-4 text-sm text-muted">
              المقطع {formatTimecode(lesson.segment.startSeconds)}–{formatTimecode(lesson.segment.endSeconds)}. شاهده
              وتحقق من الصحة والوضوح ومناسبة المستوى وجودة الصوت واللغة، ثم اعتمده.
            </p>
            <form action={setLessonReviewAction}>
              <input type="hidden" name="pathId" value={pathId} />
              <input type="hidden" name="lessonId" value={lessonId} />
              <input type="hidden" name="returnTo" value={here} />
              <input type="hidden" name="reviewed" value={lesson.reviewedByHuman ? 'false' : 'true'} />
              <button type="submit" className={lesson.reviewedByHuman ? ghostButton : primaryButton}>
                {lesson.reviewedByHuman ? 'سحب الاعتماد' : 'شاهدت المقطع وأعتمد الدرس'}
              </button>
            </form>
          </Card>
        </div>

        <Card title="بيانات الدرس">
          <form action={updateLessonAction} className="space-y-4">
            <input type="hidden" name="pathId" value={pathId} />
            <input type="hidden" name="lessonId" value={lessonId} />
            <LessonFields
              concepts={concepts}
              defaults={{
                title: lesson.title,
                conceptId: lesson.conceptId,
                videoUrl: lesson.sourceUrl,
                start: formatTimecode(lesson.segment.startSeconds),
                end: formatTimecode(lesson.segment.endSeconds),
                channelName: lesson.channelName,
                language: lesson.language,
                summary: lesson.summary,
              }}
            />
            <button type="submit" className={primaryButton}>
              حفظ التعديلات
            </button>
            <p className="text-xs text-muted">أي تعديل على المحتوى يسحب اعتماد المراجعة ليُراجَع من جديد.</p>
          </form>
        </Card>
      </div>
    </>
  );
}
