'use server';

/**
 * @file actions.ts
 * @description إجراءات الخادم للوحة التحكم: تحوّل النموذج إلى use cases فقط.
 * التحقق من الصلاحية يتم داخل كل use case (لا نعتمد على إخفاء الصفحة).
 * الأخطاء تعود للصفحة برسالة عربية في ?error=.
 */
import { ForbiddenError, UnauthenticatedError } from '@qalam/application';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { after } from 'next/server';
import { getAdminContainer, type AdminContainer } from '../../composition/admin';
import { safeRedirectPath } from '../auth/safe-redirect';

const text = (data: FormData, name: string): string => String(data.get(name) ?? '');
const direction = (data: FormData): 'up' | 'down' => (text(data, 'direction') === 'up' ? 'up' : 'down');

function withError(returnTo: string, message: string): string {
  const separator = returnTo.includes('?') ? '&' : '?';
  return `${returnTo}${separator}error=${encodeURIComponent(message)}`;
}

/** ينفّذ العمل ثم يوجّه؛ redirect يرمي استثناءً خاصًا فيُستدعى خارج try */
async function run(
  returnTo: string,
  work: (admin: AdminContainer) => Promise<string | void>,
): Promise<never> {
  let destination = returnTo;
  try {
    destination = (await work(await getAdminContainer())) ?? returnTo;
    revalidatePath('/', 'layout');
  } catch (error) {
    if (error instanceof UnauthenticatedError) destination = '/login?next=/admin';
    else if (error instanceof ForbiddenError) destination = '/admin';
    else destination = withError(returnTo, error instanceof Error ? error.message : 'حدث خطأ غير متوقع');
  }
  redirect(destination);
}

const pathPage = (pathId: string) => `/admin/paths/${pathId}`;

/** صفحة الكورس داخل المسار */
const coursePage = (pathId: string, courseId: string) => `${pathPage(pathId)}/courses/${courseId}`;

/** العودة لصفحة الكورس إن جاء منها النموذج (returnTo)، وإلا صفحة المسار؛ لا يُقبل إلا مسار هذا المسار */
function backTo(data: FormData, pathId: string): string {
  const back = safeRedirectPath(text(data, 'returnTo'));
  return back.startsWith(`${pathPage(pathId)}/`) ? back : pathPage(pathId);
}

const lessonFields = (data: FormData) => ({
  title: text(data, 'title'),
  videoUrl: text(data, 'videoUrl'),
  start: text(data, 'start'),
  end: text(data, 'end'),
  channelName: text(data, 'channelName'),
  language: text(data, 'language'),
  summary: text(data, 'summary'),
  notes: text(data, 'notes'),
  mediaUrl: text(data, 'mediaUrl'),
  mediaDurationSeconds: Number(text(data, 'mediaDurationSeconds')) || undefined,
});

const conceptFields = (data: FormData) => ({
  name: text(data, 'name'),
  description: text(data, 'description'),
  level: Number(text(data, 'level')) || 1,
  prerequisiteIds: data.getAll('prerequisiteIds').map(String),
});

// ───── المسارات ─────

export async function createPathAction(data: FormData): Promise<void> {
  await run('/admin', async (admin) => {
    const { pathId } = await admin.createPath.execute({
      actor: admin.actor,
      title: text(data, 'title'),
      description: text(data, 'description'),
      targetGoal: text(data, 'targetGoal'),
      subject: text(data, 'subject'),
    });
    return pathPage(pathId);
  });
}

export async function updatePathAction(data: FormData): Promise<void> {
  const pathId = text(data, 'pathId');
  await run(pathPage(pathId), (admin) =>
    admin.updatePath.execute({
      actor: admin.actor,
      pathId,
      title: text(data, 'title'),
      description: text(data, 'description'),
      targetGoal: text(data, 'targetGoal'),
      subject: text(data, 'subject'),
    }),
  );
}

export async function deletePathAction(data: FormData): Promise<void> {
  const pathId = text(data, 'pathId');
  await run(pathPage(pathId), async (admin) => {
    await admin.deletePath.execute({ actor: admin.actor, pathId });
    return '/admin';
  });
}

// ───── الكورسات ─────

export async function addCourseAction(data: FormData): Promise<void> {
  const pathId = text(data, 'pathId');
  await run(pathPage(pathId), async (admin) => {
    await admin.addCourse.execute({
      actor: admin.actor,
      pathId,
      conceptId: text(data, 'conceptId'),
      title: text(data, 'title'),
      description: text(data, 'description'),
    });
  });
}

export async function updateCourseAction(data: FormData): Promise<void> {
  const pathId = text(data, 'pathId');
  await run(backTo(data, pathId), (admin) =>
    admin.updateCourse.execute({
      actor: admin.actor,
      pathId,
      courseId: text(data, 'courseId'),
      conceptId: text(data, 'conceptId') || undefined,
      title: text(data, 'title'),
      description: text(data, 'description'),
    }),
  );
}

export async function deleteCourseAction(data: FormData): Promise<void> {
  const pathId = text(data, 'pathId');
  await run(pathPage(pathId), (admin) =>
    admin.deleteCourse.execute({ actor: admin.actor, pathId, courseId: text(data, 'courseId') }),
  );
}

export async function moveCourseAction(data: FormData): Promise<void> {
  const pathId = text(data, 'pathId');
  await run(backTo(data, pathId), (admin) =>
    admin.moveCourse.execute({ actor: admin.actor, pathId, courseId: text(data, 'courseId'), direction: direction(data) }),
  );
}

// ───── الوحدات ─────

export async function addModuleAction(data: FormData): Promise<void> {
  const pathId = text(data, 'pathId');
  await run(backTo(data, pathId), async (admin) => {
    await admin.addModule.execute({
      actor: admin.actor,
      pathId,
      courseId: text(data, 'courseId'),
      title: text(data, 'title'),
      description: text(data, 'description'),
    });
  });
}

export async function updateModuleAction(data: FormData): Promise<void> {
  const pathId = text(data, 'pathId');
  await run(backTo(data, pathId), (admin) =>
    admin.updateModule.execute({
      actor: admin.actor,
      pathId,
      moduleId: text(data, 'moduleId'),
      title: text(data, 'title'),
      description: text(data, 'description'),
    }),
  );
}

export async function deleteModuleAction(data: FormData): Promise<void> {
  const pathId = text(data, 'pathId');
  await run(backTo(data, pathId), (admin) =>
    admin.deleteModule.execute({ actor: admin.actor, pathId, moduleId: text(data, 'moduleId') }),
  );
}

export async function moveModuleAction(data: FormData): Promise<void> {
  const pathId = text(data, 'pathId');
  await run(backTo(data, pathId), (admin) =>
    admin.moveModule.execute({
      actor: admin.actor,
      pathId,
      moduleId: text(data, 'moduleId'),
      direction: direction(data),
    }),
  );
}

// ───── الدروس ─────

export async function addLessonAction(data: FormData): Promise<void> {
  const pathId = text(data, 'pathId');
  await run(backTo(data, pathId), async (admin) => {
    await admin.addLesson.execute({
      actor: admin.actor,
      pathId,
      moduleId: text(data, 'moduleId'),
      ...lessonFields(data),
    });
  });
}

/**
 * المالك يعطي رابط القائمة فقط: يُبنى الهيكل (وحدات ودروس ومفاهيم) فورًا، ثم تُولَّد الملاحظات والملخصات
 * ومسودات الأسئلة في الخلفية (`after`). الحاكم الزمني للخلفية هو maxDuration لصفحة المسار.
 * أدوات الطلب (الكوكيز) تُقرأ قبل `after` لأنها لا تتوفر داخله، فالـcontainer يُبنى هنا ويُمرَّر.
 */
export async function importPlaylistAction(data: FormData): Promise<void> {
  const pathId = text(data, 'pathId');
  // courseId = إكمال كورس موجود بالفيديوهات الناقصة من قائمته (بعد فشل أو انقطاع)
  const courseId = text(data, 'courseId') || undefined;
  await run(courseId ? coursePage(pathId, courseId) : pathPage(pathId), async (admin) => {
    await admin.importPlaylist.execute({ actor: admin.actor, pathId, courseId, playlistUrl: text(data, 'playlistUrl') });
    after(() =>
      admin.enrichPath.execute({ actor: admin.actor, pathId, courseId }).then(
        (result) => console.log(`[enrich] اكتمل ${result.completed}، متبقٍ ${result.remaining}، إخفاقات ${result.failures.length}`),
        (error) => console.error('[enrich] فشل الإكمال التلقائي', error),
      ),
    );
  });
}

/** يكمل الملاحظات والملخصات والأسئلة لما تبقى في كورس واحد (courseId) أو في المسار كله (بعد حصة منتهية أو مهلة) */
export async function enrichPathAction(data: FormData): Promise<void> {
  const pathId = text(data, 'pathId');
  const courseId = text(data, 'courseId') || undefined;
  await run(courseId ? coursePage(pathId, courseId) : pathPage(pathId), async (admin) => {
    const result = await admin.enrichPath.execute({ actor: admin.actor, pathId, courseId });
    if (result.remaining > 0 && result.failures.length > 0) {
      throw new Error(`اكتمل ${result.completed} وتعثّر ${result.failures.length}: ${result.failures[0]?.message ?? ''}`);
    }
  });
}

export async function updateLessonAction(data: FormData): Promise<void> {
  const pathId = text(data, 'pathId');
  const lessonId = text(data, 'lessonId');
  await run(`${pathPage(pathId)}/lessons/${lessonId}`, async (admin) => {
    await admin.updateLesson.execute({ actor: admin.actor, pathId, lessonId, ...lessonFields(data) });
    return backTo(data, pathId);
  });
}

export async function deleteLessonAction(data: FormData): Promise<void> {
  const pathId = text(data, 'pathId');
  await run(backTo(data, pathId), (admin) =>
    admin.deleteLesson.execute({ actor: admin.actor, pathId, lessonId: text(data, 'lessonId') }),
  );
}

export async function moveLessonAction(data: FormData): Promise<void> {
  const pathId = text(data, 'pathId');
  await run(backTo(data, pathId), (admin) =>
    admin.moveLesson.execute({
      actor: admin.actor,
      pathId,
      lessonId: text(data, 'lessonId'),
      direction: direction(data),
    }),
  );
}

export async function setLessonReviewAction(data: FormData): Promise<void> {
  const pathId = text(data, 'pathId');
  const lessonId = text(data, 'lessonId');
  // مسار العودة يُقبل داخل /admin فقط (منع إعادة التوجيه المفتوحة)
  const back = safeRedirectPath(text(data, 'returnTo'));
  await run(back.startsWith('/admin') ? back : pathPage(pathId), (admin) =>
    admin.setLessonReview.execute({
      actor: admin.actor,
      pathId,
      lessonId,
      reviewed: text(data, 'reviewed') === 'true',
    }),
  );
}

/** اعتماد كل دروس كورس (courseId) أو كل دروس وحدة (moduleId) بضغطة واحدة */
export async function approveLessonsAction(data: FormData): Promise<void> {
  const pathId = text(data, 'pathId');
  const courseId = text(data, 'courseId');
  await run(backTo(data, pathId), async (admin) => {
    await admin.approveLessons.execute(
      courseId
        ? { actor: admin.actor, pathId, courseId }
        : { actor: admin.actor, pathId, moduleId: text(data, 'moduleId') },
    );
  });
}

// ───── أسئلة الاختبارات ─────

const lessonPage = (pathId: string, lessonId: string) => `${pathPage(pathId)}/lessons/${lessonId}`;

export async function draftNotesAction(data: FormData): Promise<void> {
  const pathId = text(data, 'pathId');
  const lessonId = text(data, 'lessonId');
  await run(lessonPage(pathId, lessonId), async (admin) => {
    await admin.draftLessonNotes.execute({ actor: admin.actor, pathId, lessonId });
  });
}

export async function generateStudyGuideAction(data: FormData): Promise<void> {
  const pathId = text(data, 'pathId');
  const lessonId = text(data, 'lessonId');
  await run(lessonPage(pathId, lessonId), async (admin) => {
    await admin.generateStudyGuide.execute({ actor: admin.actor, pathId, lessonId });
  });
}

export async function saveStudyGuideAction(data: FormData): Promise<void> {
  const pathId = text(data, 'pathId');
  const lessonId = text(data, 'lessonId');
  await run(lessonPage(pathId, lessonId), async (admin) => {
    await admin.setStudyGuide.execute({ actor: admin.actor, pathId, lessonId, text: text(data, 'guide') });
  });
}

export async function generateQuestionsAction(data: FormData): Promise<void> {
  const pathId = text(data, 'pathId');
  const lessonId = text(data, 'lessonId');
  await run(lessonPage(pathId, lessonId), async (admin) => {
    await admin.generateQuestions.execute({
      actor: admin.actor,
      pathId,
      lessonId,
      count: Number(text(data, 'count')) || 3,
    });
  });
}

export async function addQuestionAction(data: FormData): Promise<void> {
  const pathId = text(data, 'pathId');
  const lessonId = text(data, 'lessonId');
  await run(lessonPage(pathId, lessonId), async (admin) => {
    const choices = data.getAll('choice').map(String);
    const correct = Number(text(data, 'correctIndex'));
    // الخيارات الفارغة تُحذف، فيُعاد حساب رقم الصحيحة ليبقى مشيرًا لنفس الخيار
    const kept = choices.map((c, i) => ({ c: c.trim(), i })).filter((x) => x.c !== '');
    await admin.addQuestion.execute({
      actor: admin.actor,
      pathId,
      lessonId,
      prompt: text(data, 'prompt'),
      choices: kept.map((x) => x.c),
      correctIndex: kept.findIndex((x) => x.i === correct),
      explanation: text(data, 'explanation'),
    });
  });
}

export async function approveQuestionAction(data: FormData): Promise<void> {
  await run(lessonPage(text(data, 'pathId'), text(data, 'lessonId')), (admin) =>
    admin.approveQuestion.execute({ actor: admin.actor, questionId: text(data, 'questionId') }),
  );
}

export async function approveAllQuestionsAction(data: FormData): Promise<void> {
  await run(lessonPage(text(data, 'pathId'), text(data, 'lessonId')), async (admin) => {
    await admin.approveLessonQuestions.execute({ actor: admin.actor, lessonId: text(data, 'lessonId') });
  });
}

export async function updateQuestionAction(data: FormData): Promise<void> {
  await run(lessonPage(text(data, 'pathId'), text(data, 'lessonId')), (admin) =>
    admin.updateQuestion.execute({
      actor: admin.actor,
      questionId: text(data, 'questionId'),
      prompt: text(data, 'prompt'),
      choices: data.getAll('choice').map(String).filter((c) => c.trim() !== ''),
      correctIndex: Number(text(data, 'correctIndex')),
      explanation: text(data, 'explanation'),
    }),
  );
}

export async function deleteQuestionAction(data: FormData): Promise<void> {
  await run(lessonPage(text(data, 'pathId'), text(data, 'lessonId')), (admin) =>
    admin.deleteQuestion.execute({ actor: admin.actor, questionId: text(data, 'questionId') }),
  );
}

// ───── المفاهيم ─────

const conceptsPage = (pathId: string) => `/admin/concepts?path=${encodeURIComponent(pathId)}`;

export async function createConceptAction(data: FormData): Promise<void> {
  const pathId = text(data, 'pathId');
  await run(conceptsPage(pathId), async (admin) => {
    await admin.createConcept.execute({ actor: admin.actor, pathId, ...conceptFields(data) });
  });
}

export async function updateConceptAction(data: FormData): Promise<void> {
  await run(conceptsPage(text(data, 'pathId')), (admin) =>
    admin.updateConcept.execute({ actor: admin.actor, conceptId: text(data, 'conceptId'), ...conceptFields(data) }),
  );
}

export async function deleteConceptAction(data: FormData): Promise<void> {
  await run(conceptsPage(text(data, 'pathId')), (admin) =>
    admin.deleteConcept.execute({ actor: admin.actor, conceptId: text(data, 'conceptId') }),
  );
}
