import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Prisma } from '@prisma/client';

const { authMock, countMock, updateManyMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  countMock: vi.fn(),
  updateManyMock: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    notification: { count: (...args: unknown[]) => countMock(...args) },
    user: { updateMany: (...args: unknown[]) => updateManyMock(...args) },
  },
}));
vi.mock('@/lib/auth', () => ({ auth: () => authMock() }));
vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn() } }));

import { GET } from '../route';

/**
 * Bitta foydalanuvchi qatori: `updateMany` `where` shartini haqiqatda
 * qo'llaydi — shunda "yozuv bo'ldimi" Prisma semantikasi bo'yicha tekshiriladi.
 */
function userRow(lastActiveAt: Date | null) {
  const row = { id: 'u1', lastActiveAt };
  updateManyMock.mockImplementation(
    async ({ where, data }: { where: Prisma.UserWhereInput; data: { lastActiveAt: Date } }) => {
      const matches = where.id === row.id && (where.OR ?? []).some((cond) => {
        const filter = cond.lastActiveAt;
        if (filter === null) return row.lastActiveAt === null;
        const lt = (filter as Prisma.DateTimeNullableFilter).lt as Date;
        return row.lastActiveAt !== null && row.lastActiveAt < lt;
      });
      if (!matches) return { count: 0 };
      row.lastActiveAt = data.lastActiveAt;
      return { count: 1 };
    },
  );
  return row;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-29T10:00:00Z'));
  authMock.mockResolvedValue({ user: { id: 'u1' } });
  countMock.mockResolvedValue(2);
});
afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});

describe('GET /api/notifications/count', () => {
  it('lastActiveAt faqat bir soatdan eski yoki bo‘sh bo‘lsa yoziladi', async () => {
    userRow(null);
    const res = await GET();
    expect(await res.json()).toEqual({ count: 2 });
    expect(updateManyMock).toHaveBeenCalledWith({
      where: {
        id: 'u1',
        OR: [{ lastActiveAt: null }, { lastActiveAt: { lt: new Date('2026-10-29T09:00:00Z') } }],
      },
      data: { lastActiveAt: new Date('2026-10-29T10:00:00Z') },
    });
  });

  it('soat ichidagi ikkinchi chaqiruv qatorni o‘zgartirmaydi', async () => {
    const row = userRow(null);
    await GET();
    expect(row.lastActiveAt).toEqual(new Date('2026-10-29T10:00:00Z'));

    vi.setSystemTime(new Date('2026-10-29T10:59:00Z'));
    await GET();
    expect(await updateManyMock.mock.results[1].value).toEqual({ count: 0 });
    expect(row.lastActiveAt).toEqual(new Date('2026-10-29T10:00:00Z'));

    vi.setSystemTime(new Date('2026-10-29T11:00:01Z'));
    await GET();
    expect(row.lastActiveAt).toEqual(new Date('2026-10-29T11:00:01Z'));
  });

  it('mehmon uchun bazaga murojaat yo‘q', async () => {
    authMock.mockResolvedValue(null);
    const res = await GET();
    expect(await res.json()).toEqual({ count: 0 });
    expect(countMock).not.toHaveBeenCalled();
    expect(updateManyMock).not.toHaveBeenCalled();
  });
});
