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

const lessonFields = (data: FormData) => ({
  title: text(data, 'title'),
  conceptId: text(data, 'conceptId'),
  videoUrl: text(data, 'videoUrl'),
  start: text(data, 'start'),
  end: text(data, 'end'),
  channelName: text(data, 'channelName'),
  language: text(data, 'language'),
  summary: text(data, 'summary'),
  notes: text(data, 'notes'),
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

// ───── الوحدات ─────

export async function addModuleAction(data: FormData): Promise<void> {
  const pathId = text(data, 'pathId');
  await run(pathPage(pathId), async (admin) => {
    await admin.addModule.execute({
      actor: admin.actor,
      pathId,
      title: text(data, 'title'),
      description: text(data, 'description'),
    });
  });
}

export async function updateModuleAction(data: FormData): Promise<void> {
  const pathId = text(data, 'pathId');
  await run(pathPage(pathId), (admin) =>
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
  await run(pathPage(pathId), (admin) =>
    admin.deleteModule.execute({ actor: admin.actor, pathId, moduleId: text(data, 'moduleId') }),
  );
}

export async function moveModuleAction(data: FormData): Promise<void> {
  const pathId = text(data, 'pathId');
  await run(pathPage(pathId), (admin) =>
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
  await run(pathPage(pathId), async (admin) => {
    await admin.addLesson.execute({
      actor: admin.actor,
      pathId,
      moduleId: text(data, 'moduleId'),
      ...lessonFields(data),
    });
  });
}

export async function updateLessonAction(data: FormData): Promise<void> {
  const pathId = text(data, 'pathId');
  const lessonId = text(data, 'lessonId');
  await run(`${pathPage(pathId)}/lessons/${lessonId}`, async (admin) => {
    await admin.updateLesson.execute({ actor: admin.actor, pathId, lessonId, ...lessonFields(data) });
    return pathPage(pathId);
  });
}

export async function deleteLessonAction(data: FormData): Promise<void> {
  const pathId = text(data, 'pathId');
  await run(pathPage(pathId), (admin) =>
    admin.deleteLesson.execute({ actor: admin.actor, pathId, lessonId: text(data, 'lessonId') }),
  );
}

export async function moveLessonAction(data: FormData): Promise<void> {
  const pathId = text(data, 'pathId');
  await run(pathPage(pathId), (admin) =>
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

// ───── أسئلة الاختبارات ─────

const lessonPage = (pathId: string, lessonId: string) => `${pathPage(pathId)}/lessons/${lessonId}`;

export async function draftNotesAction(data: FormData): Promise<void> {
  const pathId = text(data, 'pathId');
  const lessonId = text(data, 'lessonId');
  await run(lessonPage(pathId, lessonId), async (admin) => {
    await admin.draftLessonNotes.execute({ actor: admin.actor, pathId, lessonId });
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

export async function createConceptAction(data: FormData): Promise<void> {
  await run('/admin/concepts', async (admin) => {
    await admin.createConcept.execute({ actor: admin.actor, ...conceptFields(data) });
  });
}

export async function updateConceptAction(data: FormData): Promise<void> {
  await run('/admin/concepts', (admin) =>
    admin.updateConcept.execute({ actor: admin.actor, conceptId: text(data, 'conceptId'), ...conceptFields(data) }),
  );
}

export async function deleteConceptAction(data: FormData): Promise<void> {
  await run('/admin/concepts', (admin) =>
    admin.deleteConcept.execute({ actor: admin.actor, conceptId: text(data, 'conceptId') }),
  );
}
