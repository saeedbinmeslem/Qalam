'use server';

/**
 * @file ask-action.ts
 * @description «اسأل قلم»: يحوّل السؤال إلى use case ويعيد الإجابة أو رسالة خطأ عربية. لا منطق عمل هنا.
 */
import { getAuth } from '../../../../../composition/auth';
import { getContainer } from '../../../../../composition/container';

export interface AskState {
  question?: string;
  answer?: string;
  grounded?: boolean;
  error?: string;
}

export async function askLessonAction(_previous: AskState, data: FormData): Promise<AskState> {
  const question = String(data.get('question') ?? '');
  const user = await (await getAuth()).getCurrentUser.execute();
  if (!user) return { question, error: 'سجّل الدخول لتسأل' };

  try {
    const { askLesson } = await getContainer();
    const result = await askLesson.execute({
      pathId: String(data.get('pathId') ?? ''),
      lessonId: String(data.get('lessonId') ?? ''),
      question,
    });
    return { question, ...result };
  } catch (error) {
    return { question, error: error instanceof Error ? error.message : 'تعذّر الإجابة الآن' };
  }
}
