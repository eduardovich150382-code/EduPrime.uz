import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { subscriptionFixture as sub, subscriptionNow as now } from '@/lib/__tests__/fixtures/subscriptions';

const m = vi.hoisted(() => ({ candidates: vi.fn(), rows: vi.fn(), users: vi.fn(), deactivate: vi.fn(), create: vi.fn(), send: vi.fn(), error: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: { $queryRaw: m.rows, subscription: { findMany: m.candidates, updateMany: m.deactivate },
  user: { findMany: m.users }, notification: { create: m.create } } }));
vi.mock('@/lib/subscription-telegram', () => ({ sendSubscriptionTelegram: m.send }));
vi.mock('@/lib/logger', () => ({ logger: { error: m.error } }));
import { GET } from '../route';

const request = () => new NextRequest('http://localhost/api/cron/subscription-alerts', { headers: { authorization: 'Bearer test-secret' } });
let claimed: Set<string>;
beforeEach(() => {
  vi.resetAllMocks(); vi.useFakeTimers(); vi.setSystemTime(now); vi.stubEnv('CRON_SECRET', 'test-secret');
  claimed = new Set();
  m.candidates.mockResolvedValue([{ userId: 'u1' }]); m.rows.mockResolvedValue([sub()]);
  m.users.mockResolvedValue([{ id: 'u1', lang: 'uz', telegramId: '123' }]); m.deactivate.mockResolvedValue({ count: 1 });
  m.create.mockImplementation(async ({ data }: { data: { id: string } }) => {
    if (claimed.has(data.id)) throw { code: 'P2002' };
    claimed.add(data.id); return data;
  });
  m.send.mockResolvedValue(undefined);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

describe('obuna eslatmasi cron', () => {
  it('ruxsatsiz so‘rov hech narsa qilmaydi', async () => {
    expect((await GET(new NextRequest('http://localhost'))).status).toBe(401);
    expect(m.candidates).not.toHaveBeenCalled(); expect(m.send).not.toHaveBeenCalled();
  });
  it.each([
    ['uz', 'Attestatsiya · Fizika', '1 kunda', '26-oktabr'],
    ['ru', 'Аттестация · Физика', 'через 1 дн.', '26 октября'],
    ['en', 'Attestation · Physics', 'in 1 day', 'October 26'],
  ])('%s: mahsulot, fanlar, Toshkent sanasi va kun soni', async (lang, label, days, date) => {
    m.users.mockResolvedValue([{ id: 'u1', lang, telegramId: '123' }]);
    const response = await GET(request());
    expect(response.status).toBe(200); expect((await response.json()).alerts1).toBe(1);
    const data = m.create.mock.calls[0][0].data;
    expect(data.message).toContain(label); expect(data.message).toContain(days); expect(data.message).toContain(date);
    expect(data.id).toBe('subscription-alert:u1:2026-10-25'); expect(data.link).toBe('/pricing?goal=ATTESTATION');
    expect(m.send).toHaveBeenCalledWith('123', expect.stringContaining(`/${lang}/pricing?goal=ATTESTATION`));
    expect(m.create.mock.invocationCallOrder[0]).toBeLessThan(m.send.mock.invocationCallOrder[0]);
    expect(m.candidates.mock.calls[0][0].where.endDate.lt).toEqual(new Date('2026-11-01T19:00:00Z'));
  });
  it('parallel ikki cron Notification uchun raqobatlashadi, Telegram aynan bir marta', async () => {
    const responses = await Promise.all([GET(request()), GET(request())]);
    expect(responses.map((r) => r.status)).toEqual([200, 200]);
    expect(m.create).toHaveBeenCalledTimes(2); expect(claimed.size).toBe(1);
    expect(m.send).toHaveBeenCalledTimes(1); expect(m.error).not.toHaveBeenCalled();
  });
  it('til almashishi va bir kundagi takroriy chaqiriq qayta yubormaydi', async () => {
    await GET(request());
    m.users.mockResolvedValue([{ id: 'u1', lang: 'ru', telegramId: '123' }]);
    await GET(request());
    expect(m.send).toHaveBeenCalledTimes(1);
  });
  it('Telegram xatosida Notification qoladi, qayta urinish bo‘lmaydi', async () => {
    m.send.mockRejectedValue(new Error('delivery failed'));
    expect((await GET(request())).status).toBe(200);
    expect(claimed.size).toBe(1);
    expect((await GET(request())).status).toBe(200);
    expect(m.send).toHaveBeenCalledTimes(1);
  });
  it('Notification yaratishning boshqa xatosida Telegram chaqirilmaydi', async () => {
    m.create.mockRejectedValue(new Error('write failed'));
    expect((await GET(request())).status).toBe(500); expect(m.send).not.toHaveBeenCalled();
  });
  it.each([false, true])('uzaytirilgan obuna uchun xabar yo‘q; muddati o‘tgan=%s', async (expired) => {
    const original = sub({ endDate: expired ? new Date(now.getTime() - 1000) : sub().endDate });
    m.rows.mockResolvedValue([original, sub({ id: 'next', startDate: original.endDate, endDate: new Date('2026-11-26') })]);
    expect((await GET(request())).status).toBe(200);
    expect(m.create).not.toHaveBeenCalled(); expect(m.send).not.toHaveBeenCalled();
    if (expired) expect(m.deactivate).toHaveBeenCalledOnce();
  });
  it('boshqa fan uzaytirish emas; bir nechta eslatma bitta xabarga yig‘iladi', async () => {
    m.rows.mockResolvedValue([sub(), sub({ id: 'math', subjectIds: ['math'], subjects: [{ nameUz: 'Matematika', nameRu: 'Математика', nameEn: 'Maths' }], endDate: new Date('2026-10-28T00:30:00+05:00') })]);
    await GET(request());
    expect(m.create).toHaveBeenCalledOnce(); expect(m.send).toHaveBeenCalledOnce();
    expect(m.create.mock.calls[0][0].data.message).toContain('Fizika');
    expect(m.create.mock.calls[0][0].data.message).toContain('Matematika');
  });
  it('ertasi Toshkent kunida boshqa eslatma yuborilishi mumkin', async () => {
    await GET(request());
    vi.setSystemTime(new Date('2026-10-25T19:30:00Z'));
    m.rows.mockResolvedValue([sub({ endDate: new Date('2026-10-27T00:10:00+05:00') })]);
    await GET(request());
    expect(m.send).toHaveBeenCalledTimes(2); expect(claimed.size).toBe(2);
  });
  it('tugagan eski tarif "Eski tarif" deb ataladi (Premium emas), yangi mahsulot Ustoz deyilmaydi', async () => {
    m.rows.mockResolvedValue([sub({ endDate: new Date('2026-10-24T00:00:00+05:00') }), sub({ id: 'legacy', plan: 'PREMIUM', product: null, productId: null, endDate: new Date('2026-10-23') })]);
    await GET(request());
    const data = m.create.mock.calls[0][0].data;
    expect(data.message).toContain('Eski tarif'); expect(data.message).not.toContain('Premium'); expect(data.message).toContain('Attestatsiya · Fizika');
    expect(data.type).toBe('warning'); expect(data.message).not.toContain('Ustoz');
  });
});
