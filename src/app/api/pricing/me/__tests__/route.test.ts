import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({ auth: vi.fn(), pricing: vi.fn() }));
vi.mock('@/lib/auth', () => ({ auth: m.auth }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));
vi.mock('@/lib/pricing-page', () => ({ loadPricingPage: m.pricing }));
import { GET } from '../route';

const request = (query = '') => new NextRequest(`http://localhost/api/pricing/me${query}`);

beforeEach(() => {
  vi.resetAllMocks();
  m.auth.mockResolvedValue({ user: { id: 'u1', role: 'USER' } });
  m.pricing.mockResolvedValue({ products: [], subscriptions: [] });
});

describe('GET /api/pricing/me', () => {
  it('mehmon — 401, katalog yuklanmaydi, javob keshlanmaydi', async () => {
    m.auth.mockResolvedValue(null);
    const response = await GET(request());
    expect(response.status).toBe(401);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(m.pricing).not.toHaveBeenCalled();
  });

  it('kirgan: shu foydalanuvchining narxi va obunalari, private no-store', async () => {
    const response = await GET(request('?locale=en'));
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(m.pricing).toHaveBeenCalledWith('u1', 'en');
    expect(await response.json()).toEqual({ products: [], subscriptions: [] });
  });

  it('xato — 500, baribir keshlanmaydi', async () => {
    m.pricing.mockRejectedValue(new Error('db'));
    const response = await GET(request());
    expect(response.status).toBe(500);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });
});
