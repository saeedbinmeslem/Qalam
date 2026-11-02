'use server';

/**
 * @file actions.ts
 * @description التعارف: يحوّل النموذج إلى use cases فقط. بعد اختيار المسار يذهب المتعلم للاختبار التشخيصي إن وُجدت
 * أسئلة معتمدة، وإلا تُبنى خطته مباشرة.
 */
import { after } from 'next/server';
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
    else {
      await buildPersonalPlan.execute({ userId: user.id, withAi: false });
      after(() => buildPersonalPlan.execute({ userId: user.id }).catch(() => null));
    }
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
    await buildPersonalPlan.execute({ userId: user.id, withAi: false });
    after(() => buildPersonalPlan.execute({ userId: user.id }).catch(() => null));
  } catch (error) {
    destination = `/plan?error=${encodeURIComponent(error instanceof Error ? error.message : 'تعذّر تحديث الخطة')}`;
  }
  redirect(destination);
}

/** محادثة تعديل الخطة: الرد محفوظ في السجل فيظهر في الصفحة بعد التوجيه */
export async function revisePlanAction(data: FormData): Promise<void> {
  const user = await (await getAuth()).getCurrentUser.execute();
  if (!user) redirect('/login?next=/plan');

  const { revisePersonalPlan } = await getContainer();
  let destination = '/plan';
  try {
    await revisePersonalPlan.execute({ userId: user.id, message: field(data, 'message') });
  } catch (error) {
    destination = `/plan?error=${encodeURIComponent(error instanceof Error ? error.message : 'تعذّر تعديل الخطة')}`;
  }
  redirect(destination);
}

/**
 * التعديل اليدوي الشامل: `include` الدروس المشمولة (من كورسات المسار ومفاهيمه)، `hoursPerWeek` المدة الأسبوعية،
 * `redistribute` توزيع تلقائي بحسب الساعات، وإلا `order` ترتيب الدروس الحالي مع `lesson_<id>` رقم الأسبوع
 * (`new` لأسبوع جديد) و`title_<n>` / `focus_<n>`. التجميع هنا شكلي فقط؛ التصحيح في use case.
 */
export async function editPlanAction(data: FormData): Promise<void> {
  const user = await (await getAuth()).getCurrentUser.execute();
  if (!user) redirect('/login?next=/plan');

  const include = new Set(data.getAll('include').map(String));
  const order = data.getAll('order').map(String);
  const groups = new Map<string, string[]>();
  for (const id of order) {
    if (!include.has(id)) continue;
    const target = field(data, `lesson_${id}`) || '1';
    groups.set(target, [...(groups.get(target) ?? []), id]);
  }
  const keys = [...groups.keys()].sort((a, b) => (a === 'new' ? 1 : b === 'new' ? -1 : Number(a) - Number(b)));
  const weeks = keys.map((key) => ({
    title: field(data, `title_${key}`).trim(),
    focus: field(data, `focus_${key}`).trim(),
    lessonIds: groups.get(key) ?? [],
  }));
  const hours = field(data, 'hoursPerWeek').trim();

  const { editPersonalPlan } = await getContainer();
  let destination = '/plan';
  try {
    await editPersonalPlan.execute({
      userId: user.id,
      includeLessonIds: [...include],
      hoursPerWeek: hours ? Number(hours) : undefined,
      redistribute: field(data, 'redistribute') === 'on',
      weeks,
    });
  } catch (error) {
    destination = `/plan?error=${encodeURIComponent(error instanceof Error ? error.message : 'تعذّر حفظ التعديل')}`;
  }
  redirect(destination);
}

/** تغيير المسار المراد تعلمه: تُبنى الخطة من دروسه فورًا، وتُصاغ عناوينها بالذكاء الاصطناعي في الخلفية */
export async function changePlanPathAction(data: FormData): Promise<void> {
  const user = await (await getAuth()).getCurrentUser.execute();
  if (!user) redirect('/login?next=/plan');

  const { changePlanPath, buildPersonalPlan } = await getContainer();
  let destination = '/plan';
  try {
    await changePlanPath.execute({ userId: user.id, pathId: field(data, 'pathId') });
    after(() => buildPersonalPlan.execute({ userId: user.id }).catch(() => null));
  } catch (error) {
    destination = `/plan?error=${encodeURIComponent(error instanceof Error ? error.message : 'تعذّر تغيير المسار')}`;
  }
  redirect(destination);
}
