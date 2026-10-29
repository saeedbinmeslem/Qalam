/**
 * @file route.ts
 * @description يعيد تذكرة رفع موقّعة لـ Cloudinary للمدير فقط. التحقق من الصلاحية داخل الـ use case.
 */
import { ForbiddenError, UnauthenticatedError } from '@qalam/application';
import { NextResponse } from 'next/server';
import { getAdminContainer } from '../../../../composition/admin';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const admin = await getAdminContainer();
    const ticket = admin.createUploadTicket.execute({ actor: admin.actor });
    if (!ticket) return NextResponse.json({ error: 'رفع الفيديو غير مفعّل: أضف إعدادات Cloudinary' }, { status: 503 });
    return NextResponse.json(ticket);
  } catch (error) {
    if (error instanceof UnauthenticatedError) return NextResponse.json({ error: 'سجّل الدخول أولًا' }, { status: 401 });
    if (error instanceof ForbiddenError) return NextResponse.json({ error: 'للمديرين فقط' }, { status: 403 });
    return NextResponse.json({ error: 'تعذّر إنشاء تذكرة الرفع' }, { status: 500 });
  }
}
