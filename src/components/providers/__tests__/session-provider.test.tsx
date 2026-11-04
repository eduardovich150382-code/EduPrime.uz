import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { useSession } from 'next-auth/react';
import type { Session } from 'next-auth';
import SessionProvider from '../SessionProvider';
import { REFRESH_INTERVAL_MS, shouldRefreshSession } from '@/lib/session-refresh';

function Probe() {
  const { status, data } = useSession();
  return <span>{`${status}:${data?.user?.id ?? '-'}`}</span>;
}

const session = { user: { id: 'u1', role: 'USER', lang: 'uz', telegramId: null }, expires: '2026-11-06T00:00:00.000Z' } as unknown as Session;

describe('SessionProvider — serverdan berilgan sessiya', () => {
  it('sessiya berilsa birinchi render\'dayoq `authenticated` — mount\'da so\'rashga sabab yo\'q', () => {
    // next-auth: `session !== undefined` → loading=false va `_session` to'ldirilgan,
    // mount effekti `_session === undefined` bo'lmagani uchun fetch qilmaydi.
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    expect(renderToString(<SessionProvider session={session}><Probe /></SessionProvider>)).toContain('authenticated:u1');
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('sessiya berilmasa ((public) qobig\'i) avvalgidek `loading` — klientda so\'raladi', () => {
    expect(renderToString(<SessionProvider><Probe /></SessionProvider>)).toContain('loading:-');
  });

  it('`null` (mehmon) berilsa `unauthenticated`, fon yangilanishi yo\'q', () => {
    expect(renderToString(<SessionProvider session={null}><Probe /></SessionProvider>)).toContain('unauthenticated:-');
  });
});

describe('shouldRefreshSession — cookie fon yangilanishi', () => {
  const now = Date.UTC(2026, 10, 5, 12);

  it('hali yangilanmagan bo\'lsa yangilaydi', () => {
    expect(shouldRefreshSession(null, now)).toBe(true);
  });

  it('oraliq ichida yangilamaydi, chegarada va undan keyin yangilaydi', () => {
    expect(shouldRefreshSession(now - 60_000, now)).toBe(false);
    expect(shouldRefreshSession(now - REFRESH_INTERVAL_MS + 1, now)).toBe(false);
    expect(shouldRefreshSession(now - REFRESH_INTERVAL_MS, now)).toBe(true);
    expect(shouldRefreshSession(now - 2 * REFRESH_INTERVAL_MS, now)).toBe(true);
  });

  it('buzilgan yoki kelajakdagi qiymatda yangilaydi', () => {
    expect(shouldRefreshSession(Number.NaN, now)).toBe(true);
    expect(shouldRefreshSession(now + 60_000, now)).toBe(true);
  });

  it('oraliq JWT maxAge (24 soat) dan ancha qisqa — cookie muddati tugamaydi', () => {
    expect(REFRESH_INTERVAL_MS).toBeLessThanOrEqual(24 * 60 * 60 * 1000 / 2);
  });
});
