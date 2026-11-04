import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import middleware from '../middleware';

// /login statik bo'lgach ham kirgan foydalanuvchi sahifaga yetib kelmasin:
// yo'naltirish middleware'da (sahifadan oldin, cookie bo'yicha), sahifaning
// o'zida emas. Bu test o'sha xatti-harakat o'zgarmaganini qayd etadi.
const request = (pathname: string, cookie?: string) =>
  new NextRequest(`https://eduprime.uz${pathname}`, { headers: cookie ? { cookie } : {} });

describe('middleware: /login', () => {
  it.each(['/login', '/ru/login', '/en/login', '/login?callbackUrl=%2Fattestation'])('kirgan (%s) → 307 /dashboard', async (path) => {
    for (const cookie of ['__Secure-authjs.session-token=x', 'authjs.session-token=x']) {
      const response = await middleware(request(path, cookie));
      expect(response.status).toBe(307); // NextResponse.redirect standarti
      expect(new URL(response.headers.get('location')!).pathname).toBe('/dashboard');
    }
  });

  it('mehmon /login dan yo‘naltirilmaydi', async () => {
    const response = await middleware(request('/login'));
    expect(new URL(response.headers.get('location') ?? 'https://eduprime.uz/none').pathname).not.toBe('/dashboard');
  });
});
