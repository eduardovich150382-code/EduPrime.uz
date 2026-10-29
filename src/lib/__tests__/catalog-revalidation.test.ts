import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// O'z test fayli bo'lmagan mutatsiya route'lari: muvaffaqiyatli yozuvdan keyin
// public katalog keshi (`lib/public-catalog.ts`) to'g'ri teglar bilan
// tozalanadi, rad etilgan so'rovda — yo'q.
const m = vi.hoisted(() => ({
  revalidateTag: vi.fn(), revalidatePath: vi.fn(), auth: vi.fn(), requireAdmin: vi.fn(), requireTeacher: vi.fn(),
  findTest: vi.fn(), updateTest: vi.fn(), deleteTest: vi.fn(), createTest: vi.fn(),
  findTeacher: vi.fn(), findSubject: vi.fn(), upsertSetting: vi.fn(), importTestFromText: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidateTag: m.revalidateTag, revalidatePath: m.revalidatePath }));
vi.mock('@/lib/auth', () => ({ auth: m.auth }));
vi.mock('@/lib/api-auth', () => ({ requireAdmin: m.requireAdmin, requireTeacher: m.requireTeacher, applyRateLimit: () => null }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn() } }));
vi.mock('@/lib/telegram-notify', () => ({ notifyViaTelegram: vi.fn() }));
vi.mock('@/lib/gemini', () => ({ importTestFromText: m.importTestFromText }));
vi.mock('@/lib/db', () => ({
  db: {
    test: { findUnique: m.findTest, update: m.updateTest, delete: m.deleteTest, create: m.createTest },
    teacher: { findUnique: m.findTeacher },
    subject: { findUnique: m.findSubject },
    systemSetting: { upsert: m.upsertSetting },
    user: { findMany: async () => [] },
    notification: { createMany: async () => ({ count: 0 }) },
  },
}));

import { PATCH as adminTestsPatch } from '@/app/api/admin/tests/route';
import { PATCH as teacherTestPatch } from '@/app/api/teacher/tests/[id]/route';
import { POST as quizFromText } from '@/app/api/ai/quiz-from-text/route';
import { PUT as adminSettingsPut } from '@/app/api/admin/settings/route';
import { DELETE as deleteTest } from '@/app/api/tests/[id]/route';

const TEST_CATALOG = [['tests-list'], ['pricing']];
const ctx = { params: Promise.resolve({ id: 't1' }) };
const json = (url: string, method: string, body?: unknown) =>
  new NextRequest(`http://localhost${url}`, { method, body: body === undefined ? undefined : JSON.stringify(body) });

beforeEach(() => {
  vi.clearAllMocks();
  m.auth.mockResolvedValue({ user: { id: 'teacher-user', role: 'TEACHER' } });
  m.requireAdmin.mockResolvedValue({ user: { id: 'admin', role: 'ADMIN' }, error: null });
  m.requireTeacher.mockResolvedValue({ user: { id: 'teacher-user', role: 'TEACHER' }, error: null });
  m.findTest.mockResolvedValue({ id: 't1', isPublished: true, teacher: { userId: 'teacher-user' } });
  m.updateTest.mockResolvedValue({ id: 't1', titleUz: 'Test' });
  m.deleteTest.mockResolvedValue({ id: 't1' });
  m.findTeacher.mockResolvedValue({ id: 'teacher1' });
  m.findSubject.mockResolvedValue({ categoryId: 'cat1' });
  m.upsertSetting.mockResolvedValue({});
});

describe('PATCH /api/admin/tests', () => {
  it.each(['publish', 'unpublish', 'delete'])('%s — test ro‘yxati va pricing keshi tozalanadi', async (action) => {
    expect((await adminTestsPatch(json('/api/admin/tests', 'PATCH', { testId: 't1', action }))).status).toBe(200);
    expect(m.revalidateTag.mock.calls).toEqual(TEST_CATALOG);
  });
  it('noto‘g‘ri amal va admin emas — kesh tegilmaydi', async () => {
    expect((await adminTestsPatch(json('/api/admin/tests', 'PATCH', { testId: 't1', action: 'x' }))).status).toBe(400);
    m.requireAdmin.mockResolvedValue({ error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) });
    expect((await adminTestsPatch(json('/api/admin/tests', 'PATCH', { testId: 't1', action: 'publish' }))).status).toBe(403);
    expect(m.revalidateTag).not.toHaveBeenCalled();
  });
});

describe('PATCH /api/teacher/tests/[id]', () => {
  it('nashr holati o‘zgarsa kesh tozalanadi', async () => {
    expect((await teacherTestPatch(json('/api/teacher/tests/t1', 'PATCH', { isPublished: false }), ctx)).status).toBe(200);
    expect(m.revalidateTag.mock.calls).toEqual(TEST_CATALOG);
  });
  it('begona ustoz — 403, kesh tegilmaydi', async () => {
    m.findTest.mockResolvedValue({ id: 't1', isPublished: true, teacher: { userId: 'other' } });
    expect((await teacherTestPatch(json('/api/teacher/tests/t1', 'PATCH', { isPublished: false }), ctx)).status).toBe(403);
    expect(m.revalidateTag).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/tests/[id]', () => {
  it('o‘chirilgan test ro‘yxatdan darhol yo‘qoladi', async () => {
    expect((await deleteTest(json('/api/tests/t1', 'DELETE'), ctx)).status).toBe(200);
    expect(m.revalidateTag.mock.calls).toEqual(TEST_CATALOG);
  });
  it('begona ustoz — 403, kesh tegilmaydi', async () => {
    m.findTest.mockResolvedValue({ id: 't1', teacher: { userId: 'other' } });
    expect((await deleteTest(json('/api/tests/t1', 'DELETE'), ctx)).status).toBe(403);
    expect(m.revalidateTag).not.toHaveBeenCalled();
  });
});

describe('POST /api/ai/quiz-from-text', () => {
  const body = { text: 'Kinematika — jism harakatini o‘rganadigan bo‘lim.', subjectId: 's1' };
  it('yaratilgan test keshni tozalaydi', async () => {
    m.importTestFromText.mockResolvedValue({ questions: [{ text: 'a', options: [], correctAnswer: 'A', type: 'MULTIPLE_CHOICE' }], warnings: [] });
    m.createTest.mockResolvedValue({ id: 't-new', titleUz: 'AI', questionCount: 1 });
    expect((await quizFromText(json('/api/ai/quiz-from-text', 'POST', body))).status).toBe(201);
    expect(m.revalidateTag.mock.calls).toEqual(TEST_CATALOG);
  });
  it('AI savol topmasa — test yo‘q, kesh tegilmaydi', async () => {
    m.importTestFromText.mockResolvedValue({ questions: [], warnings: [] });
    expect((await quizFromText(json('/api/ai/quiz-from-text', 'POST', body))).status).toBe(422);
    expect(m.revalidateTag).not.toHaveBeenCalled();
  });
});

describe('PUT /api/admin/settings', () => {
  it('saqlangan sozlama public keshdan darhol tozalanadi; revalidatePath saqlangan', async () => {
    m.auth.mockResolvedValue({ user: { id: 'admin', role: 'ADMIN' } });
    expect((await adminSettingsPut(json('/api/admin/settings', 'PUT', { settings: { site_announcement: 'Salom' } }))).status).toBe(200);
    expect(m.revalidateTag.mock.calls).toEqual([['settings']]);

    m.revalidateTag.mockClear();
    expect((await adminSettingsPut(json('/api/admin/settings', 'PUT', { settings: {
      attestation_date: '2026-12-01', attestation_tier2_min: '60', attestation_tier1_min: '70',
      attestation_tier_top_min: '80', attestation_tier_top_bonus_min: '86',
    } }))).status).toBe(200);
    expect(m.revalidateTag.mock.calls).toEqual([['settings']]);
    expect(m.revalidatePath).toHaveBeenCalledWith('/[locale]/(public)/attestation', 'page');
  });
  it('admin emas — 403, kesh tegilmaydi', async () => {
    expect((await adminSettingsPut(json('/api/admin/settings', 'PUT', { settings: { site_announcement: 'x' } }))).status).toBe(403);
    expect(m.revalidateTag).not.toHaveBeenCalled();
  });
});
