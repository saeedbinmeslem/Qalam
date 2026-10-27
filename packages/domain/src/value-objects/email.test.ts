import { describe, expect, it } from 'vitest';
import { Email } from './email.js';

describe('Email (البريد الإلكتروني)', () => {
  it('يطبّع المدخل بحروف صغيرة وبلا مسافات', () => {
    expect(new Email('  Sara@Example.COM ').value).toBe('sara@example.com');
  });

  it('يرفض الصيغ غير الصالحة', () => {
    for (const bad of ['', 'sara', 'sara@', '@example.com', 'sara@example', 'sa ra@example.com']) {
      expect(() => new Email(bad)).toThrow();
    }
  });
});
