'use server';

/**
 * @file actions.ts
 * @description تسليم الاختبار التشخيصي: يصحّح في الخادم ويسجّل الأحداث وقرارات التخطي بأسبابها،
 * ثم يفتح صفحة النتيجة (الإجابات في الرابط بصيغة id:index).
 */
import { redirect } from 'next/navigation';
import { getAuth } from '../../../../composition/auth';
import { getContainer } from '../../../../composition/container';

export async function submitDiagnosticAction(formData: FormData): Promise<void> {
  const pathId = String(formData.get('pathId') ?? '');
  const user = await (await getAuth()).getCurrentUser.execute();
  if (!user) redirect('/login');

  const answers: Record<string, number> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('q_')) answers[key.slice(2)] = Number(value);
  }

  const { submitDiagnostic } = await getContainer();
  await submitDiagnostic.execute({ userId: user.id, pathId, answers });

  const encoded = Object.entries(answers)
    .map(([id, index]) => `${id}:${index}`)
    .join(',');
  redirect(`/paths/${pathId}/diagnostic?a=${encodeURIComponent(encoded)}`);
}
