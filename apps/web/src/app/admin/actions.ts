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
 * تشغيل عمل طويل (ذكاء اصطناعي) في الخلفية: الإجراء يسجّل العملية ويعود فورًا فيتصفح المالك ويعدّل ويحذف
 * بحرية، والعمل يكمل بـ`after` وتظهر حالته في شريط العمليات. الحاكم الزمني هو maxDuration للصفحة.
 * أدوات الطلب (الكوكيز) تُقرأ قبل `after` لأنها لا تتوفر داخله، فالـcontainer يُبنى هنا ويُمرَّر.
 * `work` يعيد ملخص النتيجة، أو يرمي خطأً فتُسجَّل العملية فاشلة بسببه.
 */
/**
 * حد زمن العملية الخلفية: أقل من maxDuration للصفحة (300ث). إن تجاوزته العملية نسجّلها منتهية بوضوح قبل أن تقتلها
 * المنصة؛ وإلا بقيت «تعمل» للأبد لأن القتل لا يترك لنا فرصة تسجيل النهاية.
 */
const JOB_LIMIT_MS = 270_000;
/** هامش لدرس يعالَج وقت نفاد الميزانية (قراءة فيديو قد تستغرق دقيقة+) فلا تقتله المهلة وسط الحفظ */
const IN_FLIGHT_MARGIN_MS = 110_000;
/** أقل ميزانية تستحق بدء التوليد؛ أقل منها نترك الباقي لزر الإكمال */
const MIN_ENRICH_BUDGET_MS = 20_000;

async function runInBackground(
  returnTo: string,
  job: { key: string; label: string },
  work: (admin: AdminContainer) => Promise<string>,
): Promise<never> {
  return run(returnTo, async (admin) => {
    const { jobId } = await admin.startJob.execute({ actor: admin.actor, ...job });
    after(async () => {
      try {
        let timer: ReturnType<typeof setTimeout> | undefined;
        const timeout = new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error('انتهى الزمن المتاح للعملية. حُفظ ما اكتمل، فأعد تشغيلها لإكمال الباقي')),
            JOB_LIMIT_MS,
          );
        });
        const message = await Promise.race([work(admin), timeout]).finally(() => clearTimeout(timer));
        await admin.finishJob.execute({ jobId, status: 'done', message });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'خطأ غير معروف';
        console.error(`[job] فشلت «${job.label}»`, error);
        await admin.finishJob.execute({ jobId, status: 'failed', message }).catch(() => undefined);
      }
    });
  });
}

/** يكمل التوليد لما تبقى ثم يلخّص النتيجة؛ الإخفاق مع بقاء دروس يجعل العملية فاشلة بسببه */
async function enrichAndSummarize(
  admin: AdminContainer,
  pathId: string,
  courseId: string | undefined,
  startedAt: number,
): Promise<string> {
  // ما استُهلك في الخطوات السابقة (كالاستيراد) يُخصم، ونُبقي هامشًا للدروس الجارية وقت النفاد
  const budgetMs = JOB_LIMIT_MS - IN_FLIGHT_MARGIN_MS - (Date.now() - startedAt);
  if (budgetMs < MIN_ENRICH_BUDGET_MS) return 'لم يبقَ زمن للتوليد، اضغط «أكمل الملاحظات والملخصات والأسئلة»';
  const result = await admin.enrichPath.execute({ actor: admin.actor, pathId, courseId, budgetMs });
  if (result.remaining > 0 && result.failures.length > 0) {
    throw new Error(`اكتمل ${result.completed} وتعثّر ${result.failures.length}: ${result.failures[0]?.message ?? ''}`);
  }
  return result.remaining > 0
    ? `اكتمل ${result.completed} درسًا وبقي ${result.remaining} (انتهى الزمن المتاح)، أعد التشغيل لإكمالها`
    : `اكتمل توليد ${result.completed} درسًا`;
}

/**
 * المالك يعطي رابط القائمة فقط: يُبنى الهيكل (وحدات ودروس ومفاهيم) ثم تُولَّد الملاحظات والملخصات
 * ومسودات الأسئلة، كله في الخلفية. مع courseId يكمل كورسًا موجودًا بالفيديوهات الناقصة من قائمته.
 */
export async function importPlaylistAction(data: FormData): Promise<void> {
  const pathId = text(data, 'pathId');
  const courseId = text(data, 'courseId') || undefined;
  const playlistUrl = text(data, 'playlistUrl');
  await runInBackground(
    courseId ? coursePage(pathId, courseId) : pathPage(pathId),
    { key: `import:${pathId}:${courseId ?? 'new'}`, label: courseId ? 'إكمال دروس القائمة' : 'استيراد قائمة يوتيوب' },
    async (admin) => {
      const startedAt = Date.now();
      const imported = await admin.importPlaylist.execute({ actor: admin.actor, pathId, courseId, playlistUrl });
      const generated = await enrichAndSummarize(admin, pathId, courseId, startedAt).catch((e: Error) => `الاستيراد تم لكن التوليد تعثّر: ${e.message}`);
      return `أُضيف ${imported.lessons} درسًا إلى «${imported.courseTitle}». ${generated}`;
    },
  );
}

/** يكمل الملاحظات والملخصات والأسئلة لما تبقى في كورس واحد (courseId) أو في المسار كله (بعد حصة منتهية أو مهلة) */
export async function enrichPathAction(data: FormData): Promise<void> {
  const pathId = text(data, 'pathId');
  const courseId = text(data, 'courseId') || undefined;
  await runInBackground(
    courseId ? coursePage(pathId, courseId) : pathPage(pathId),
    { key: `enrich:${pathId}:${courseId ?? 'all'}`, label: 'توليد الملاحظات والملخصات والأسئلة' },
    (admin) => enrichAndSummarize(admin, pathId, courseId, Date.now()),
  );
}

/** يترجم عناوين الدروس الإنجليزية في كورس إلى العربية (لكورسات استُوردت قبل الترجمة التلقائية) */
export async function translateTitlesAction(data: FormData): Promise<void> {
  const pathId = text(data, 'pathId');
  const courseId = text(data, 'courseId') || undefined;
  await runInBackground(
    courseId ? coursePage(pathId, courseId) : pathPage(pathId),
    { key: `titles:${pathId}:${courseId ?? 'all'}`, label: 'ترجمة عناوين الدروس إلى العربية' },
    async (admin) => {
      const { translated, remaining } = await admin.translateTitles.execute({ actor: admin.actor, pathId, courseId });
      return remaining > 0 ? `تُرجم ${translated} عنوانًا وتعذّر ${remaining} (أعد المحاولة)` : `تُرجم ${translated} عنوانًا`;
    },
  );
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
