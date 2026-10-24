import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { subscriptionFixture as sub, subscriptionNow as now } from '@/lib/__tests__/fixtures/subscriptions';

const m = vi.hoisted(() => ({ auth: vi.fn(), rows: vi.fn(), permissions: vi.fn() }));
vi.mock('@/lib/auth', () => ({ auth: m.auth }));
vi.mock('@/lib/db', () => ({ db: { $queryRaw: m.rows, userPermission: { findMany: m.permissions } } }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));
import { GET } from '../route';

beforeEach(() => {
  vi.resetAllMocks(); vi.useFakeTimers(); vi.setSystemTime(now);
  m.auth.mockResolvedValue({ user: { id: 'u1' } }); m.rows.mockResolvedValue([]); m.permissions.mockResolvedValue([]);
});
afterEach(() => vi.useRealTimers());

describe('obuna statusi', () => {
  it('mehmonning javobi o‘zgarmaydi, obuna yuklanmaydi', async () => {
    m.auth.mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401); expect(await response.json()).toEqual({ error: 'Unauthorized' });
    expect(m.rows).not.toHaveBeenCalled(); expect(m.permissions).not.toHaveBeenCalled();
  });
  it('obunasizning eski maydonlari o‘zgarmaydi', async () => {
    expect(await (await GET()).json()).toEqual({ plan: 'FREE', subscriptions: [], hasPremium: false, hasTeacher: false,
      daysUntilExpiry: null, hasAnyScope: false, expiringSubscription: null });
  });
  it.each(['PREMIUM', 'TEACHER_PLAN'] as const)('%s legacy nomi va bayroqlari saqlanadi', async (plan) => {
    m.rows.mockResolvedValue([sub({ plan, product: null, productId: null, duration: 'ONE_MONTH' })]);
    const result = await (await GET()).json();
    expect(result).toMatchObject({ plan, hasAnyScope: true, hasPremium: plan === 'PREMIUM', hasTeacher: plan === 'TEACHER_PLAN' });
    expect(result.subscriptions[0]).toMatchObject({ isLegacy: true, duration: 'ONE_MONTH', startDate: expect.any(String), endDate: expect.any(String) });
    expect(result.subscriptions[0].name.nameUz).toBe(plan === 'PREMIUM' ? 'Premium' : 'Ustoz');
  });
  it.each(['CATEGORY', 'BUNDLE'] as const)('%s FREE emas, mahsulot va fan nomlari uch tilda', async (plan) => {
    m.rows.mockResolvedValue([sub({ plan })]);
    const result = await (await GET()).json();
    expect(result).toMatchObject({ plan, hasPremium: false, hasTeacher: false, hasAnyScope: true, daysUntilExpiry: 1 });
    expect(result.subscriptions[0]).toMatchObject({ isLegacy: false, product: sub().product, subjects: sub().subjects, goal: 'ATTESTATION' });
  });
  it('aralash obunalarda legacy birlashgan tarif saqlanib, hamma obuna qaytadi', async () => {
    m.rows.mockResolvedValue([sub(), sub({ id: 'p', plan: 'PREMIUM' }), sub({ id: 't', plan: 'TEACHER_PLAN' })]);
    const result = await (await GET()).json();
    expect(result.plan).toBe('PREMIUM_TEACHER'); expect(result.subscriptions).toHaveLength(3);
  });
  it('kelajak obuna sifatida ko‘rsatilmaydi, lekin uzaytirish bannerni yashiradi', async () => {
    m.rows.mockResolvedValue([sub(), sub({ id: 'next', startDate: sub().endDate, endDate: new Date('2026-11-26') })]);
    const result = await (await GET()).json();
    expect(result.subscriptions).toHaveLength(1); expect(result.expiringSubscription).toBeNull();
    expect(result.daysUntilExpiry).toBe(1);
  });
  it('faqat kelajak yoki tugagan obuna FREE; ruxsat faol scope beradi', async () => {
    m.rows.mockResolvedValue([sub({ startDate: new Date('2026-11-01'), endDate: new Date('2026-12-01') }), sub({ id: 'old', endDate: new Date('2026-10-20') })]);
    m.permissions.mockResolvedValue([{ categoryId: 'att', subjectId: 'physics', isActive: true, expiresAt: null }]);
    expect(await (await GET()).json()).toMatchObject({ plan: 'FREE', hasAnyScope: true, subscriptions: [] });
  });
});
