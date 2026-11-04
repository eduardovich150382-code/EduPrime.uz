import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import middleware from '../middleware';

// /build va /session/<id> (main) guruhida. Ilgari mehmon yo'naltirilishi
// faqat (main)/layout.tsx dagi `auth()` + `redirect('/login')` da edi —
// funksiya uyg'onardi va callbackUrl yo'qolardi. Endi middleware cookie
// bo'yicha, sahifadan oldin qaytaradi. Layout'dagi tekshiruv zaxira bo'lib qoladi.
const request = (pathname: string, cookie?: string) =>
  new NextRequest(`https://eduprime.uz${pathname}`, { headers: cookie ? { cookie } : {} });

describe('middleware: /build va /session', () => {
  it.each(['/build', '/ru/build', '/session/abc', '/en/session/abc', '/uz/session/abc'])('mehmon %s → 307 /login?callbackUrl', async (path) => {
    const response = await middleware(request(path));
    expect(response.status).toBe(307);
    const location = new URL(response.headers.get('location')!);
    expect(location.pathname).toBe('/login');
    expect(location.searchParams.get('callbackUrl')).toBe(path);
  });

  it.each(['/build', '/session/abc'])('kirgan %s login\'ga yo\'naltirilmaydi', async (path) => {
    for (const cookie of ['__Secure-authjs.session-token=x', 'authjs.session-token=x']) {
      const response = await middleware(request(path, cookie));
      expect(new URL(response.headers.get('location') ?? 'https://eduprime.uz/none').pathname).not.toBe('/login');
    }
  });
});
