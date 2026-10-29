'use server';

/**
 * @file actions.ts
 * @description التعارف: يحوّل النموذج إلى use cases فقط. بعد اختيار المسار يذهب المتعلم للاختبار التشخيصي إن وُجدت
 * أسئلة معتمدة، وإلا تُبنى خطته مباشرة.
 */
import { redirect } from 'next/navigation';
import { getAuth } from '../../composition/auth';
import { getContainer } from '../../composition/container';

const field = (data: FormData, name: string) => String(data.get(name) ?? '');

export async function startOnboardingAction(data: FormData): Promise<void> {
  const user = await (await getAuth()).getCurrentUser.execute();
  if (!user) redirect('/login?next=/start');

  const { startOnboarding, getDiagnostic, buildPersonalPlan } = await getContainer();
  let destination = '/plan';
  try {
    const chosen = await startOnboarding.execute({
      userId: user.id,
      interest: field(data, 'interest'),
      field: field(data, 'field'),
      level: field(data, 'level') as 'beginner' | 'intermediate' | 'advanced',
      hoursPerWeek: Number(field(data, 'hoursPerWeek')),
    });
    const questions = await getDiagnostic.execute({ pathId: chosen.pathId }).catch(() => []);
    if (questions.length > 0) destination = `/paths/${chosen.pathId}/diagnostic`;
    else await buildPersonalPlan.execute({ userId: user.id });
  } catch (error) {
    destination = `/start?error=${encodeURIComponent(error instanceof Error ? error.message : 'تعذّر بدء الخطة')}`;
  }
  redirect(destination);
}

export async function rebuildPlanAction(): Promise<void> {
  const user = await (await getAuth()).getCurrentUser.execute();
  if (!user) redirect('/login?next=/plan');

  const { buildPersonalPlan } = await getContainer();
  let destination = '/plan';
  try {
    await buildPersonalPlan.execute({ userId: user.id });
  } catch (error) {
    destination = `/plan?error=${encodeURIComponent(error instanceof Error ? error.message : 'تعذّر تحديث الخطة')}`;
  }
  redirect(destination);
}
