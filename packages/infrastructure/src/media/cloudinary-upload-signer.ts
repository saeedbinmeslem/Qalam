/**
 * @file cloudinary-upload-signer.ts
 * @description يوقّع طلب الرفع المباشر إلى Cloudinary (signed upload). السر `apiSecret` لا يغادر الخادم؛
 * يخرج منه التوقيع فقط. التوقيع = SHA-1 لـ «الحقول الموقّعة مرتّبة أبجديًا» ملحقًا بها السر
 * (وفق وثائق Cloudinary: لا يدخل فيه file ولا api_key ولا resource_type).
 */
import { createHash } from 'node:crypto';
import type { MediaUploadSignerPort, UploadTicket } from '@qalam/application';

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  /** مجلد الرفع داخل حسابك */
  folder?: string;
}

export class CloudinaryUploadSigner implements MediaUploadSignerPort {
  constructor(
    private readonly config: Partial<CloudinaryConfig>,
    private readonly now: () => number = () => Date.now(),
  ) {}

  sign(): UploadTicket | null {
    const { cloudName, apiKey, apiSecret } = this.config;
    if (!cloudName || !apiKey || !apiSecret) return null;

    const folder = this.config.folder ?? 'qalam/lessons';
    const timestamp = Math.floor(this.now() / 1000);
    const toSign = `folder=${folder}&timestamp=${timestamp}`;
    const signature = createHash('sha1').update(toSign + apiSecret).digest('hex');

    return {
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
      apiKey,
      timestamp,
      folder,
      signature,
    };
  }
}
