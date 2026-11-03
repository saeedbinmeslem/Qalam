'use server';

/**
 * @file actions.ts
 * @description سجل الخطط: استرجاع نسخة أو حذفها. يحوّل النموذج إلى use case فقط؛ الأخطاء تعود في الرابط.
 */
import { redirect } from 'next/navigation';
import { getAuth } from '../../../composition/auth';
import { getContainer } from '../../../composition/container';

const planId = (data: FormData) => String(data.get('planId') ?? '');

export async function restorePlanAction(data: FormData): Promise<void> {
  const user = await (await getAuth()).getCurrentUser.execute();
  if (!user) redirect('/login?next=/profile/plans');

  const { restorePlanVersion } = await getContainer();
  let destination = '/plan';
  try {
    await restorePlanVersion.execute({ userId: user.id, planId: planId(data) });
  } catch (error) {
    destination = `/profile/plans?error=${encodeURIComponent(error instanceof Error ? error.message : 'تعذّر استرجاع الخطة')}`;
  }
  redirect(destination);
}

export async function deletePlanAction(data: FormData): Promise<void> {
  const user = await (await getAuth()).getCurrentUser.execute();
  if (!user) redirect('/login?next=/profile/plans');

  const { deletePlanVersion } = await getContainer();
  let destination = '/profile/plans';
  try {
    await deletePlanVersion.execute({ userId: user.id, planId: planId(data) });
  } catch (error) {
    destination = `/profile/plans?error=${encodeURIComponent(error instanceof Error ? error.message : 'تعذّر حذف الخطة')}`;
  }
  redirect(destination);
}
