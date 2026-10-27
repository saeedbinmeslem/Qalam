/**
 * @file page.tsx
 * @description تعديل درس ومراجعته: معاينة المقطع كما سيراه المتعلم، ثم اعتماد الدرس أو تعديله.
 * اعتماد الدرس قرار المالك وحده بعد المشاهدة؛ وأي تعديل على المحتوى يسحب الاعتماد تلقائيًا.
 */
import { createLessonId, createPathId, formatTimecode } from '@qalam/domain';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Card,
  ErrorBanner,
  Field,
  ReviewBadge,
  dangerButton,
  ghostButton,
  primaryButton,
} from '../../../../../../components/admin-ui';
import { LessonFields } from '../../../../../../components/lesson-fields';
import { YouTubePlayer } from '../../../../../../components/youtube-player';
import { getAdminContainer } from '../../../../../../composition/admin';
import { ConfirmSubmit } from '../../../../../../components/confirm-submit';
import {
  addQuestionAction,
  approveQuestionAction,
  deleteQuestionAction,
  generateQuestionsAction,
  setLessonReviewAction,
  updateLessonAction,
  updateQuestionAction,
} from '../../../../actions';

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
  const questions = await admin.listLessonQuestions.execute({ actor: admin.actor, lessonId });
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
                notes: lesson.notes,
              }}
            />
            <button type="submit" className={primaryButton}>
              حفظ التعديلات
            </button>
            <p className="text-xs text-muted">أي تعديل على المحتوى يسحب اعتماد المراجعة ليُراجَع من جديد.</p>
          </form>
        </Card>
      </div>

      <div className="mt-10">
        <Card title="أسئلة الاختبار">
          <p className="mb-4 text-sm text-muted">
            يولّد الذكاء الاصطناعي مسودات أسئلة من «ملاحظاتك» أعلاه فقط. لا يرى المتعلم أي سؤال قبل أن تعتمده أنت، وتعديل السؤال
            يعيده مسودة.
          </p>

          <form action={generateQuestionsAction} className="mb-6 flex flex-wrap items-end gap-3">
            <input type="hidden" name="pathId" value={pathId} />
            <input type="hidden" name="lessonId" value={lessonId} />
            <label className="block">
              <span className="block text-sm font-medium text-ink">عدد الأسئلة</span>
              <input type="number" name="count" defaultValue={3} min={1} max={8} className="mt-1.5 w-24 rounded-lg border border-rule bg-sheet px-3 py-2" />
            </label>
            <button type="submit" className={primaryButton} disabled={!lesson.notes} title={lesson.notes ? undefined : 'اكتب ملاحظات الدرس أولًا'}>
              ولّد أسئلة بالذكاء الاصطناعي
            </button>
            {lesson.notes ? null : <span className="text-sm text-red-700">اكتب ملاحظات الدرس واحفظها أولًا.</span>}
          </form>

          <details className="mb-6 rounded-lg border border-rule bg-paper p-4">
            <summary className="cursor-pointer font-medium text-ink">أو اكتب سؤالًا بنفسك</summary>
            <form action={addQuestionAction} className="mt-4 space-y-3">
              <input type="hidden" name="pathId" value={pathId} />
              <input type="hidden" name="lessonId" value={lessonId} />
              <Field label="نص السؤال" name="prompt" required rows={2} />
              <fieldset>
                <legend className="text-sm font-medium text-ink">الخيارات (3 إلى 5، اختر الصحيح)</legend>
                <div className="mt-2 space-y-2">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input type="radio" name="correctIndex" value={i} defaultChecked={i === 0} aria-label={`الخيار ${i + 1} هو الصحيح`} />
                      <input name="choice" className="w-full rounded-lg border border-rule bg-sheet px-3 py-1.5" aria-label={`الخيار ${i + 1}`} />
                    </div>
                  ))}
                </div>
              </fieldset>
              <Field label="الشرح" name="explanation" rows={2} />
              <button type="submit" className={primaryButton}>
                إضافة السؤال (مسودة)
              </button>
            </form>
          </details>

          {questions.length === 0 ? (
            <p className="text-sm text-muted">لا أسئلة بعد.</p>
          ) : (
            <ul className="space-y-4">
              {questions.map((q, index) => (
                <li key={q.id} className="rounded-lg border border-rule p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-medium text-ink">سؤال {index + 1}</span>
                    {q.isApproved ? (
                      <span className="rounded-full bg-sea/10 px-2.5 py-0.5 font-medium text-sea-dark">معتمد</span>
                    ) : (
                      <span className="rounded-full bg-highlighter/25 px-2.5 py-0.5 font-medium text-ink">مسودة</span>
                    )}
                    <span className="text-muted">{q.origin === 'ai' ? 'من الذكاء الاصطناعي' : 'يدوي'}</span>
                  </div>

                  <form action={updateQuestionAction} className="space-y-3">
                    <input type="hidden" name="pathId" value={pathId} />
                    <input type="hidden" name="lessonId" value={lessonId} />
                    <input type="hidden" name="questionId" value={q.id} />
                    <Field label="نص السؤال" name="prompt" defaultValue={q.prompt} required rows={2} />
                    <fieldset>
                      <legend className="text-sm font-medium text-ink">الخيارات (اختر الصحيح)</legend>
                      <div className="mt-2 space-y-2">
                        {q.choices.map((choice, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <input type="radio" name="correctIndex" value={i} defaultChecked={i === q.correctIndex} aria-label={`الخيار ${i + 1} هو الصحيح`} />
                            <input name="choice" defaultValue={choice} className="w-full rounded-lg border border-rule bg-sheet px-3 py-1.5" aria-label={`الخيار ${i + 1}`} />
                          </div>
                        ))}
                      </div>
                    </fieldset>
                    <Field label="الشرح" name="explanation" defaultValue={q.explanation} rows={2} />
                    <button type="submit" className={ghostButton}>
                      حفظ التعديل (يعيده مسودة)
                    </button>
                  </form>

                  <div className="mt-3 flex flex-wrap gap-2 border-t border-rule pt-3">
                    {q.isApproved ? null : (
                      <form action={approveQuestionAction}>
                        <input type="hidden" name="pathId" value={pathId} />
                        <input type="hidden" name="lessonId" value={lessonId} />
                        <input type="hidden" name="questionId" value={q.id} />
                        <button type="submit" className={primaryButton}>
                          راجعتُ السؤال وأعتمده
                        </button>
                      </form>
                    )}
                    <form action={deleteQuestionAction}>
                      <input type="hidden" name="pathId" value={pathId} />
                      <input type="hidden" name="lessonId" value={lessonId} />
                      <input type="hidden" name="questionId" value={q.id} />
                      <ConfirmSubmit message="حذف هذا السؤال؟" className={dangerButton}>
                        حذف
                      </ConfirmSubmit>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
