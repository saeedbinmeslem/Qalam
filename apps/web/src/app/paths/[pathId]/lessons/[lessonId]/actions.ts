'use server';

/**
 * @file actions.ts
 * @description إكمال الدرس: يسجّل حدث الإكمال عبر use case ثم ينتقل للدرس التالي أو للمسار.
 */
import { redirect } from 'next/navigation';
import { getAuth } from '../../../../../composition/auth';
import { getContainer } from '../../../../../composition/container';

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
