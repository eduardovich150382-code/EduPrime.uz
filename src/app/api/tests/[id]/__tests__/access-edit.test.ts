import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const m = vi.hoisted(() => ({ auth: vi.fn(), find: vi.fn(), update: vi.fn(), revalidateTag: vi.fn() }));
vi.mock('next/cache', () => ({ revalidateTag: m.revalidateTag }));
vi.mock('@/lib/auth', () => ({ auth: m.auth }));
vi.mock('@/lib/db', () => ({ db: { test: { findUnique: m.find, update: m.update } } }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));
import { PUT } from '../route';
const ctx = { params: Promise.resolve({ id: 'test1' }) };
const request = (body: unknown) => new NextRequest('http://localhost/api/tests/test1', { method: 'PUT', body: JSON.stringify(body) });
beforeEach(() => {
  vi.resetAllMocks();
  m.auth.mockResolvedValue({ user: { id: 'teacher1', role: 'TEACHER' } });
  m.find.mockResolvedValue({ id: 'test1', accessType: 'premium', teacher: { userId: 'teacher1' } });
  m.update.mockResolvedValue({ id: 'test1' });
});
describe('kirish turini qo‘lda saqlash', () => {
  it.each(['TEACHER', 'ADMIN'])('%s subscription saqlay oladi', async (role) => {
    m.auth.mockResolvedValue({ user: { id: role === 'ADMIN' ? 'admin' : 'teacher1', role } });
    expect((await PUT(request({ accessType: 'subscription', isFree: false, price: 0 }), ctx)).status).toBe(200);
    expect(m.update).toHaveBeenCalledWith({ where: { id: 'test1' }, data: { accessType: 'subscription', isFree: false, price: 0 } });
    // Kirish turi ro'yxatdagi qulf belgisi va pricing sonlarida ko'rinadi.
    expect(m.revalidateTag.mock.calls).toEqual([['tests-list'], ['pricing']]);
  });
  it('accessType yuborilmaguncha eski qiymat o‘zgarmaydi', async () => {
    await PUT(request({ titleUz: 'Yangi nom' }), ctx);
    expect(m.update).toHaveBeenCalledWith({ where: { id: 'test1' }, data: { titleUz: 'Yangi nom' } });
  });
  it.each([-1, 1.5, '10000', 2147483648])('narx %s bo‘lsa yozmaydi', async (price) => {
    expect((await PUT(request({ accessType: 'paid', price }), ctx)).status).toBe(400);
    expect(m.update).not.toHaveBeenCalled();
  });
  it('boshqa ustoz tahrirlay olmaydi', async () => {
    m.auth.mockResolvedValue({ user: { id: 'other', role: 'TEACHER' } });
    expect((await PUT(request({ accessType: 'subscription' }), ctx)).status).toBe(403);
    expect(m.update).not.toHaveBeenCalled();
    expect(m.revalidateTag).not.toHaveBeenCalled();
  });
});
