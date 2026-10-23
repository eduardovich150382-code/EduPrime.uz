import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { canAccessByEntitlements, type TestAccessContext } from '@/lib/entitlements';

const m = vi.hoisted(() => ({ auth: vi.fn(), find: vi.fn(), update: vi.fn(), subject: vi.fn() }));
vi.mock('@/lib/auth', () => ({ auth: m.auth }));
vi.mock('@/lib/db', () => ({
  db: { test: { findUnique: m.find, update: m.update }, subject: { findUnique: m.subject } },
}));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));

import { PUT } from '../route';

const ctx = { params: Promise.resolve({ id: 'test1' }) };
const request = (body: unknown) => new NextRequest('http://localhost/api/tests/test1', {
  method: 'PUT', body: JSON.stringify(body),
});
const original = {
  id: 'test1', subjectId: 'old-subject', categoryId: 'old-category',
  isFree: false, accessType: 'subscription', teacher: { userId: 'teacher1' },
};

beforeEach(() => {
  vi.resetAllMocks();
  m.auth.mockResolvedValue({ user: { id: 'teacher1', role: 'TEACHER' } });
  m.find.mockResolvedValue(original);
  m.subject.mockResolvedValue({ categoryId: 'new-category' });
  m.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ ...original, ...data }));
});

describe('test fanini tahrirlash', () => {
  it.each(['TEACHER', 'ADMIN'])('%s fan va uning kategoriyasini bitta update bilan saqlaydi', async (role) => {
    m.auth.mockResolvedValue({ user: { id: role === 'ADMIN' ? 'admin1' : 'teacher1', role } });
    const response = await PUT(request({ subjectId: 'new-subject', categoryId: 'forged-category', titleUz: 'Yangi nom' }), ctx);
    expect(response.status).toBe(200);
    expect(m.subject).toHaveBeenCalledWith({ where: { id: 'new-subject' }, select: { categoryId: true } });
    expect(m.update).toHaveBeenCalledExactlyOnceWith({
      where: { id: 'test1' }, data: { subjectId: 'new-subject', categoryId: 'new-category', titleUz: 'Yangi nom' },
    });
    expect((await response.json()).test).toMatchObject({ subjectId: 'new-subject', categoryId: 'new-category' });
  });

  it('mavjud bo‘lmagan fan 400 qaytaradi va hech narsa yozmaydi', async () => {
    m.subject.mockResolvedValue(null);
    expect((await PUT(request({ subjectId: 'missing', titleUz: 'Yangi nom' }), ctx)).status).toBe(400);
    expect(m.update).not.toHaveBeenCalled();
  });

  it.each(['', '   ', null, 123, false, {}, ['new-subject']])('noto‘g‘ri subjectId %j bazaga yuborilmaydi', async (subjectId) => {
    expect((await PUT(request({ subjectId }), ctx)).status).toBe(400);
    expect(m.subject).not.toHaveBeenCalled();
    expect(m.update).not.toHaveBeenCalled();
  });

  it('subjectId berilmasa boshqa maydonlar avvalgidek saqlanadi', async () => {
    const data = { titleUz: 'Yangi nom', titleRu: null, titleEn: 'New title', duration: 45,
      isFree: false, price: 10000, accessType: 'paid', difficulty: 2, isPublished: true, coverImage: null };
    const response = await PUT(request(data), ctx);
    expect(response.status).toBe(200);
    expect(m.subject).not.toHaveBeenCalled();
    expect(m.update).toHaveBeenCalledExactlyOnceWith({ where: { id: 'test1' }, data });
    expect((await response.json()).test).toMatchObject({ subjectId: 'old-subject', categoryId: 'old-category' });
  });

  it('boshqa ustoz fanini o‘zgartira olmaydi — 403', async () => {
    m.auth.mockResolvedValue({ user: { id: 'other', role: 'TEACHER' } });
    expect((await PUT(request({ subjectId: 'new-subject' }), ctx)).status).toBe(403);
    expect(m.subject).not.toHaveBeenCalled();
    expect(m.update).not.toHaveBeenCalled();
  });

  it('saqlangan testga kirish yangi fan va kategoriya bo‘yicha hal qilinadi', async () => {
    const response = await PUT(request({ subjectId: 'new-subject' }), ctx);
    expect(response.status).toBe(200);
    const { test } = await response.json();
    const context = (categoryId: string, subjectId: string): TestAccessContext => ({
      now: new Date('2026-10-23T12:00:00+05:00'), isAdmin: false,
      subscriptions: [], permissions: [{ categoryId, subjectId, isActive: true, expiresAt: null }],
      categoryTypes: new Map(), purchasedTestIds: new Set(),
    });
    expect(canAccessByEntitlements(test, context('old-category', 'old-subject'))).toBe(false);
    expect(canAccessByEntitlements(test, context('old-category', 'new-subject'))).toBe(false);
    expect(canAccessByEntitlements(test, context('new-category', 'old-subject'))).toBe(false);
    expect(canAccessByEntitlements(test, context('new-category', 'new-subject'))).toBe(true);
  });
});
