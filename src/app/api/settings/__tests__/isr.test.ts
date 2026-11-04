import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({ settings: vi.fn(), cacheCalls: [] as Array<{ keys: string[]; options: { revalidate?: number; tags?: string[] } }> }));
vi.mock('@/lib/db', () => ({ db: { systemSetting: { findMany: m.settings } } }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  unstable_cache: <T>(fn: T, keys: string[], options: { revalidate?: number; tags?: string[] }) => {
    m.cacheCalls.push({ keys, options });
    return fn;
  },
}));
import * as route from '../route';
import { PUBLIC_SETTING_DEFAULTS, PUBLIC_SETTING_KEYS } from '@/lib/public-catalog';
import { PUBLIC_CACHE_REVALIDATE_SEC } from '@/lib/cache-tags';

beforeEach(() => { m.settings.mockReset(); m.settings.mockResolvedValue([{ key: 'site_announcement', value: 'Salom' }]); });
afterEach(() => vi.unstubAllEnvs());

describe('GET /api/settings — ISR', () => {
  it('revalidate katalog keshi bilan bir xil (1 soat)', () => {
    expect(route.revalidate).toBe(PUBLIC_CACHE_REVALIDATE_SEC);
  });

  it('javobda faqat ommaviy kalitlar — foydalanuvchiga bog\'liq hech narsa yo\'q', async () => {
    const body = await (await route.GET()).json();
    expect(Object.keys(body)).toEqual(['settings']);
    expect(Object.keys(body.settings).sort()).toEqual([...PUBLIC_SETTING_KEYS].sort());
    expect(body.settings.site_announcement).toBe('Salom');
  });

  it('build fazasida bazaga murojaat qilinmaydi, defaults qaytadi', async () => {
    vi.stubEnv('NEXT_PHASE', 'phase-production-build');
    const body = await (await route.GET()).json();
    expect(m.settings).not.toHaveBeenCalled();
    expect(body.settings).toEqual(PUBLIC_SETTING_DEFAULTS);
  });

  it('baza xatosida defaults qaytadi (500 emas)', async () => {
    m.settings.mockRejectedValue(new Error('down'));
    const response = await route.GET();
    expect(response.status).toBe(200);
    expect((await response.json()).settings).toEqual(PUBLIC_SETTING_DEFAULTS);
  });

  it('defaults qisqa muddat va `settings` tegi bilan keshlanadi — 1 soat qolib ketmaydi', () => {
    const fallback = m.cacheCalls.find((call) => call.keys.includes('fallback'));
    expect(fallback?.options.revalidate).toBeLessThanOrEqual(60);
    expect(fallback?.options.tags).toEqual(['settings']);
    const real = m.cacheCalls.find((call) => call.keys.includes('settings') && call.keys.includes('public-catalog'));
    expect(real?.options.tags).toEqual(['settings']);
  });
});
