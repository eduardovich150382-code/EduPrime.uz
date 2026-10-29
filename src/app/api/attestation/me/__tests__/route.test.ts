import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({ auth: vi.fn(), page: vi.fn(), pricing: vi.fn() }));
vi.mock('@/lib/auth', () => ({ auth: m.auth }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));
vi.mock('@/lib/attestation-page', () => ({ loadAttestationPage: m.page }));
vi.mock('@/lib/pricing-page', () => ({ loadPricingPage: m.pricing }));
import { GET } from '../route';

const request = (query = '') => new NextRequest(`http://localhost/api/attestation/me${query}`);
const row = { id: 't1', number: 1, title: 'Mock 1', questionCount: 50, solved: true, lastScore: 40, lastMax: 50, lastPercent: 80,
  ball: 80, tier: 'top', primaryHref: '/tests/t1/solve', secondaryHref: '/results/r1', locked: false, lockBadge: null };

beforeEach(() => {
  vi.resetAllMocks();
  m.auth.mockResolvedValue({ user: { id: 'u1', role: 'USER' } });
  m.page.mockResolvedValue({ settings: {}, mockRows: [row], topicRows: [], hero: null, readiness: null });
  m.pricing.mockResolvedValue({ products: [], subscriptions: [] });
});

describe('GET /api/attestation/me', () => {
  it('mehmon — 401, hech narsa yuklanmaydi, javob keshlanmaydi', async () => {
    m.auth.mockResolvedValue(null);
    const response = await GET(request());
    expect(response.status).toBe(401);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(m.page).not.toHaveBeenCalled();
    expect(m.pricing).not.toHaveBeenCalled();
  });

  it('kirgan: shu foydalanuvchi uchun, private no-store, faqat tayyor qatorlar', async () => {
    const response = await GET(request('?locale=ru'));
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(m.page).toHaveBeenCalledWith({ id: 'u1', role: 'USER' }, 'ru');
    expect(m.pricing).toHaveBeenCalledWith('u1', 'ru');
    const body = await response.json();
    expect(Object.keys(body).sort()).toEqual(['hero', 'mockRows', 'readiness', 'topicRows', 'view']);
    expect(body.view).toMatchObject({ product: null, owned: null, showOffer: false, buy: { userId: 'u1', knownSubscriptionIds: [] } });
  });

  it('noma’lum locale asosiy tilga tushadi', async () => {
    await GET(request('?locale=xx'));
    expect(m.page).toHaveBeenCalledWith({ id: 'u1', role: 'USER' }, 'uz');
  });
});
