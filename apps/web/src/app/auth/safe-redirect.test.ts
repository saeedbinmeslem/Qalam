import { describe, expect, it } from 'vitest';
import { safeRedirectPath } from './safe-redirect';

describe('safeRedirectPath', () => {
  it('يقبل المسارات الداخلية', () => {
    expect(safeRedirectPath('/paths/x?y=1')).toBe('/paths/x?y=1');
  });
  it('يرفض الروابط الخارجية والمسارات الملتفة', () => {
    for (const bad of ['https://evil.com', '//evil.com', String.raw`/\evil.com`, 'paths', '', null, undefined]) {
      expect(safeRedirectPath(bad)).toBe('/');
    }
  });
});
