/**
 * @file admin-media.usecases.ts
 * @description توقيع طلب رفع فيديو. للمديرين فقط، وإلا لاستطاع أي زائر رفع ملفات على حسابنا.
 */

import type { AdminPolicy } from '@qalam/domain';
import type { MediaUploadSignerPort, UploadTicket } from '../../ports/media-upload.port.js';
import { requireAdmin, type AdminRequest } from './admin-deps.js';

export class CreateUploadTicketUseCase {
  constructor(
    private readonly deps: { policy: AdminPolicy; uploads: MediaUploadSignerPort },
  ) {}

  /** null = الرفع غير مفعّل في هذه البيئة */
  execute(request: AdminRequest): UploadTicket | null {
    requireAdmin(this.deps.policy, request.actor);
    return this.deps.uploads.sign();
  }
}
