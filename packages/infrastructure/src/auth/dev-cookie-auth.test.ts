import { describe, expect, it } from 'vitest';
import { Email } from '@qalam/domain';
import { DevCookieAuth, type CookieJar } from './dev-cookie-auth.js';
import { SupabaseAuth, type SupabaseAuthClient } from './supabase-auth.js';

class MapJar implements CookieJar {
  private map = new Map<string, string>();
  get = (n: string) => this.map.get(n);
  set = (n: string, v: string) => void this.map.set(n, v);
  delete = (n: string) => void this.map.delete(n);
}

describe('DevCookieAuth', () => {
  it('يسجّل الدخول ثم الخروج عبر ملف الارتباط', async () => {
    const auth = new DevCookieAuth(new MapJar());
    expect(await auth.getCurrentUser()).toBeNull();
    expect(await auth.sendMagicLink(new Email('a@b.co'), '/')).toEqual({ signedIn: true });
    expect(await auth.getCurrentUser()).toEqual({ id: 'dev-a@b.co', email: 'a@b.co' });
    await auth.signOut();
    expect(await auth.getCurrentUser()).toBeNull();
  });
});

describe('SupabaseAuth', () => {
  function client(overrides: Partial<SupabaseAuthClient['auth']> = {}): SupabaseAuthClient {
    return {
      auth: {
        signInWithOtp: async () => ({ error: null }),
        getUser: async () => ({ data: { user: { id: 'u1', email: 'a@b.co' } } }),
        signOut: async () => ({ error: null }),
        ...overrides,
      },
    };
  }

  it('يطلب الرابط السحري ولا يسجّل دخولًا فوريًا', async () => {
    let received: unknown;
    const auth = new SupabaseAuth(
      client({
        signInWithOtp: async (args) => {
          received = args;
          return { error: null };
        },
      }),
    );
    expect(await auth.sendMagicLink(new Email('a@b.co'), 'https://x/cb')).toEqual({ signedIn: false });
    expect(received).toEqual({ email: 'a@b.co', options: { emailRedirectTo: 'https://x/cb' } });
  });

  it('يحوّل خطأ Supabase إلى استثناء ويعيد null بلا مستخدم', async () => {
    const failing = new SupabaseAuth(client({ signInWithOtp: async () => ({ error: { message: 'rate' } }) }));
    await expect(failing.sendMagicLink(new Email('a@b.co'), '/')).rejects.toThrow('rate');
    const anon = new SupabaseAuth(client({ getUser: async () => ({ data: { user: null } }) }));
    expect(await anon.getCurrentUser()).toBeNull();
  });
});
