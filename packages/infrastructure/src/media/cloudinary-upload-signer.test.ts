import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { CloudinaryUploadSigner } from './cloudinary-upload-signer.js';

describe('CloudinaryUploadSigner', () => {
  const config = { cloudName: 'demo', apiKey: 'key123', apiSecret: 'secret456' };

  it('يوقّع folder وtimestamp بـ SHA-1 مع السر ولا يكشف السر', () => {
    const ticket = new CloudinaryUploadSigner(config, () => 1_700_000_000_500).sign();
    const expected = createHash('sha1')
      .update('folder=qalam/lessons&timestamp=1700000000' + 'secret456')
      .digest('hex');
    expect(ticket?.signature).toBe(expected);
    expect(ticket?.uploadUrl).toBe('https://api.cloudinary.com/v1_1/demo/video/upload');
    expect(JSON.stringify(ticket)).not.toContain('secret456');
  });

  it('يعيد null عند غياب أي بيان', () => {
    expect(new CloudinaryUploadSigner({ cloudName: 'demo' }).sign()).toBeNull();
    expect(new CloudinaryUploadSigner({}).sign()).toBeNull();
  });
});
