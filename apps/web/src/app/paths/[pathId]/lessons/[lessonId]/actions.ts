'use server';

/**
 * @file actions.ts
 * @description إكمال الدرس: يسجّل حدث الإكمال عبر use case ثم ينتقل للدرس التالي أو للمسار.
 */
import { redirect } from 'next/navigation';
import { getAuth } from '../../../../../composition/auth';
import { getContainer } from '../../../../../composition/container';

/** يصحّح الاختبار في الخادم ويسجّل المحاولة، ثم يفتح صفحة النتيجة (الإجابات في الرابط بصيغة id:index) */
export async function submitQuizAction(formData: FormData): Promise<void> {
  const pathId = String(formData.get('pathId') ?? '');
  const lessonId = String(formData.get('lessonId') ?? '');

  const user = await (await getAuth()).getCurrentUser.execute();
  if (!user) redirect('/login');

  const answers: Record<string, number> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('q_')) answers[key.slice(2)] = Number(value);
  }

  const { submitQuiz } = await getContainer();
  await submitQuiz.execute({ userId: user.id, pathId, lessonId, answers });

  const encoded = Object.entries(answers)
    .map(([id, index]) => `${id}:${index}`)
    .join(',');
  redirect(`/paths/${pathId}/lessons/${lessonId}/quiz?a=${encodeURIComponent(encoded)}`);
}

export async function completeLessonAction(formData: FormData): Promise<void> {
  const pathId = String(formData.get('pathId') ?? '');
  const lessonId = String(formData.get('lessonId') ?? '');
  const nextLessonId = String(formData.get('nextLessonId') ?? '');

  const user = await (await getAuth()).getCurrentUser.execute();
  if (!user) redirect('/login');

  const { recordLearningEvent } = await getContainer();
  await recordLearningEvent.execute({
    userId: user.id,
    type: 'lesson_completed',
    payload: { pathId, lessonId },
  });

  redirect(nextLessonId ? `/paths/${pathId}/lessons/${nextLessonId}` : `/paths/${pathId}`);
}
