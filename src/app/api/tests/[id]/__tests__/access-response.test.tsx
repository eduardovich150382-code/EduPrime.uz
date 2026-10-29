import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

/**
 * Yechish sahifasi endi testni bitta so'rov bilan oladi — check-access
 * chaqirilmaydi. Shu sabab GET /api/tests/[id] ning 401/403 javobi "Test
 * yopiq" (obuna/sotib olish taklifi) va qayta kirish ekranini o'zi
 * ko'tarishi kerak. Bu BARCHA testlarga tegishli, shuning uchun oddiy
 * pullik/obunali testlar ham, reklama testi ham shu yerda.
 */
const mocks = vi.hoisted(() => ({
  testRow: null as Record<string, unknown> | null,
  auth: vi.fn(),
  markStarted: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    test: { findUnique: () => Promise.resolve(mocks.testRow) },
    question: { findMany: () => Promise.resolve([{ id: 'q1', text: '2+2', images: [], options: [{ label: 'A', text: '4' }], type: 'MULTIPLE_CHOICE', points: 1, order: 0, subjectId: null, hints: [] }]) },
    testCategory: { findUnique: () => Promise.resolve({ type: 'ATTESTATION' }), findMany: () => Promise.resolve([{ id: 'att', type: 'ATTESTATION' }]) },
    user: { findUnique: () => Promise.resolve({ role: 'USER' }) },
    userPermission: { findMany: async () => [] },
    subscription: { findMany: async () => [] },
    purchase: { findUnique: async () => null },
    payment: { findFirst: async () => null },
    item: { findMany: () => Promise.resolve([]) },
  },
}));
vi.mock('@/lib/auth', () => ({ auth: () => mocks.auth() }));
vi.mock('@/lib/ad-free-test', () => ({
  getAdFreeTestId: async () => 'ad-mock',
  isAdFreeTest: async (id: string) => id === 'ad-mock',
  markAdTestStarted: (...args: unknown[]) => mocks.markStarted(...args),
}));

import { GET } from '../route';
import { classifyTestLoad } from '@/lib/test-load-response';
import TestLockedNotice from '@/components/test/TestLockedNotice';
import SessionExpiredDialog from '@/components/test/SessionExpiredDialog';
import uz from '@/messages/uz.json';

function row(id: string, accessType: string, price = 0) {
  return {
    id, titleUz: `Mock ${id}`, accessType, price, isFree: false, isPublished: true, categoryId: 'att', subjectId: 'physics',
    duration: 60, userId: null, teacher: null, subject: { nameUz: 'Fizika' }, isMock: true,
  };
}
async function load(id: string) {
  const response = await GET(new Request(`http://localhost/api/tests/${id}`) as unknown as NextRequest, { params: Promise.resolve({ id }) });
  return { status: response.status, body: await response.json() };
}
const html = (node: React.ReactElement) => renderToStaticMarkup(
  <NextIntlClientProvider locale="uz" messages={uz} timeZone="Asia/Tashkent">{node}</NextIntlClientProvider>,
);
const esc = (text: string) => text.replace(/'/g, '&#x27;');

beforeEach(() => { vi.clearAllMocks(); });

describe('obunasiz foydalanuvchi — pullik testlar avvalgidek yopiq', () => {
  beforeEach(() => { mocks.auth.mockReturnValue({ user: { id: 'u1', role: 'USER' } }); });

  it('obunali mock: 403 → "Test yopiq" va /pricing?goal=ATTESTATION taklifi', async () => {
    mocks.testRow = row('mock-9', 'subscription');
    const { status, body } = await load('mock-9');
    expect(status).toBe(403);
    expect(body).toEqual({ error: 'Forbidden', accessType: 'subscription', price: 0, testTitle: 'Mock mock-9', categoryType: 'ATTESTATION' });
    expect(body).not.toHaveProperty('test');
    const outcome = classifyTestLoad(status, body);
    expect(outcome.kind).toBe('locked');
    if (outcome.kind !== 'locked') return;
    const out = html(<TestLockedNotice testId="mock-9" accessDenied={outcome.accessDenied} />);
    expect(out).toContain(esc(uz.exam.locked.title));
    expect(out).toContain('href="/pricing?goal=ATTESTATION"');
  });

  it('alohida sotiladigan test: 403 → narx bilan botda sotib olish taklifi', async () => {
    mocks.testRow = row('paid-1', 'paid', 15000);
    const { status, body } = await load('paid-1');
    expect(status).toBe(403);
    const outcome = classifyTestLoad(status, body);
    if (outcome.kind !== 'locked') throw new Error(outcome.kind);
    expect(outcome.accessDenied).toMatchObject({ accessType: 'paid', price: 15000, testTitle: 'Mock paid-1' });
    const out = html(<TestLockedNotice testId="paid-1" accessDenied={outcome.accessDenied} />);
    expect(out).toContain('https://t.me/EduPrimeuzbot?start=buy_test_paid-1');
    expect(out).toContain((15000).toLocaleString());
  });

  it('reklama testi: 200, savollar keladi va "boshlagan" belgilanadi', async () => {
    mocks.testRow = row('ad-mock', 'subscription');
    const { status, body } = await load('ad-mock');
    expect(status).toBe(200);
    expect(body.test.questions).toHaveLength(1);
    expect(classifyTestLoad(status, body).kind).toBe('ok');
    expect(mocks.markStarted).toHaveBeenCalledWith('u1');
  });
});

describe('mehmon (sessiya yo‘q)', () => {
  beforeEach(() => { mocks.auth.mockReturnValue(null); });

  it.each(['mock-9', 'ad-mock'])('%s: 401 → kirish taklifi, savol berilmaydi', async (id) => {
    mocks.testRow = row(id, 'subscription');
    const { status, body } = await load(id);
    expect(status).toBe(401);
    expect(body).not.toHaveProperty('test');
    expect(classifyTestLoad(status, body)).toEqual({ kind: 'login' });
    const out = html(<SessionExpiredDialog returnPath={`/tests/${id}/solve`} onClose={() => {}} />);
    expect(out).toContain(`href="/login?callbackUrl=%2Ftests%2F${id}%2Fsolve"`);
    expect(mocks.markStarted).not.toHaveBeenCalled();
  });

  it('haqiqiy bepul test mehmonga ham ochiq', async () => {
    mocks.testRow = { ...row('free-1', 'free'), isFree: true };
    const { status } = await load('free-1');
    expect(status).toBe(200);
  });
});

describe('classifyTestLoad', () => {
  it('404 va bo‘sh javob — topilmadi', () => {
    expect(classifyTestLoad(404, { error: 'Test not found' })).toEqual({ kind: 'missing' });
    expect(classifyTestLoad(200, {})).toEqual({ kind: 'missing' });
  });
  it('noma’lum categoryType — null', () => {
    expect(classifyTestLoad(403, { accessType: 'subscription', categoryType: 'X' })).toMatchObject({ accessDenied: { categoryType: null } });
  });
});
