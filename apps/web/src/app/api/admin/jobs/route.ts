/**
 * @file route.ts
 * @description حالة العمليات الخلفية للمدير فقط (يستعلم عنها شريط العمليات في لوحة التحكم). التحقق داخل الـ use case.
 */
import { ForbiddenError, UnauthenticatedError } from '@qalam/application';
import { NextResponse } from 'next/server';
import { getAdminContainer } from '../../../../composition/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const admin = await getAdminContainer();
    const jobs = await admin.listJobs.execute({ actor: admin.actor });
    return NextResponse.json({
      jobs: jobs.map((j) => ({
        id: j.id,
        key: j.key,
        label: j.label,
        status: j.status,
        message: j.message,
        startedAt: j.startedAt.toISOString(),
        finishedAt: j.finishedAt?.toISOString() ?? null,
      })),
    });
  } catch (error) {
    if (error instanceof UnauthenticatedError) return NextResponse.json({ error: 'سجّل الدخول أولًا' }, { status: 401 });
    if (error instanceof ForbiddenError) return NextResponse.json({ error: 'للمديرين فقط' }, { status: 403 });
    return NextResponse.json({ error: 'تعذّر قراءة العمليات' }, { status: 500 });
  }
}
