import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

/**
 * Nashr etilmagan test (S7): GET /api/tests/[id] va POST submit bitta qaror
 * (lib/test-visibility.ts) bilan ishlashi kerak — biri ochiq qolsa, submit
 * to'g'ri javoblarni beradi. db/auth mock, naqsh `section-order.test.ts` bilan bir xil.
 */
const mocks = vi.hoisted(() => ({
  testRow: null as Record<string, unknown> | null,
  courseLessonCount: vi.fn(),
  lessonBlockCount: vi.fn(),
  createResult: vi.fn(),
  auth: vi.fn(),
}));

// `omit` ni haqiqiy Prisma kabi qo'llaymiz — javobda maydon yo'qligini
// route'ning o'zi kafolatlashini tekshirish uchun.
function applyOmit(row: Record<string, unknown>, args: unknown) {
  const omit = (args as { omit?: Record<string, boolean> } | undefined)?.omit ?? {};
  return Object.fromEntries(Object.entries(row).filter(([key]) => !omit[key]));
}

vi.mock('@/lib/db', () => ({
  db: {
    test: { findUnique: (args: unknown) => Promise.resolve(mocks.testRow && applyOmit(mocks.testRow, args)) },
    // `select` ham haqiqiy Prisma kabi — correctAnswer route tanlamasa qaytmaydi.
    question: {
      findMany: (args: { select?: Record<string, boolean> }) =>
        Promise.resolve(
          ((mocks.testRow?.questions as Record<string, unknown>[]) ?? []).map((q) =>
            Object.fromEntries(Object.entries(q).filter(([key]) => !args?.select || args.select[key]))
          )
        ),
    },
    testCategory: { findUnique: () => Promise.resolve({ type: 'DTM' }) },
    courseLesson: { count: (...args: unknown[]) => mocks.courseLessonCount(...args) },
    lessonBlock: { count: (...args: unknown[]) => mocks.lessonBlockCount(...args) },
    user: { findUnique: () => Promise.resolve({ role: 'USER' }) },
    subscription: { findMany: () => Promise.resolve([]) },
    item: { findMany: () => Promise.resolve([]) },
    attempt: { createMany: () => Promise.resolve({ count: 0 }) },
    $transaction: (cb: (tx: unknown) => unknown) =>
      cb({
        testResult: { create: (...args: unknown[]) => mocks.createResult(...args) },
        attempt: { createMany: () => Promise.resolve({ count: 0 }) },
      }),
  },
}));

vi.mock('@/lib/auth', () => ({ auth: () => mocks.auth() }));

import { GET } from '../route';
import { POST } from '../submit/route';

function buildTest(overrides: Record<string, unknown> = {}) {
  return {
    id: 'test1',
    categoryId: 'cat1',
    isPublished: false,
    isFree: true,
    accessType: 'free',
    userId: null,
    teacher: { userId: 'teacher-user', user: { name: 'Ustoz' } },
    subject: { nameUz: 'Fizika' },
    courseLessons: [],
    writtenSolution: 'Yozma yechim',
    videoSolution: 'https://youtube.com/watch?v=x',
    questions: [
      {
        id: 'q1', text: '2+2=?', images: [], type: 'MULTIPLE_CHOICE', points: 1, order: 0, subjectId: null, hints: [], tags: [],
        correctAnswer: 'A',
        options: ['A', 'B'].map((label) => ({ label, text: label, image: null })),
      },
    ],
    ...overrides,
  };
}

const params = { params: Promise.resolve({ id: 'test1' }) };

async function callGet() {
  const res = await GET(new Request('http://localhost/api/tests/test1') as unknown as NextRequest, params);
  return { status: res.status, data: await res.json() };
}

async function callSubmit() {
  const req = new Request('http://localhost/api/tests/test1/submit', {
    method: 'POST',
    body: JSON.stringify({ answers: [{ questionId: 'q1', answer: 'A' }], timeSpent: 10 }),
  });
  const res = await POST(req as unknown as NextRequest, params);
  return { status: res.status, data: await res.json() };
}

function signIn(id: string, role = 'USER') {
  mocks.auth.mockReturnValue({ user: { id, role } });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.testRow = buildTest();
  mocks.auth.mockReturnValue(null);
  mocks.courseLessonCount.mockResolvedValue(0);
  mocks.lessonBlockCount.mockResolvedValue(0);
  mocks.createResult.mockResolvedValue({ id: 'r1', timeSpent: 10 });
});

describe('qoralama test — GET /api/tests/[id] va POST submit', () => {
  it('mehmon: GET 404, submit 401 (kirish talab qilinadi)', async () => {
    expect((await callGet()).status).toBe(404);
    expect((await callSubmit()).status).toBe(401);
  });

  it('oddiy foydalanuvchi: ikkalasi ham 404, natija yozilmaydi', async () => {
    signIn('u1');
    expect((await callGet()).status).toBe(404);
    expect((await callSubmit()).status).toBe(404);
    expect(mocks.createResult).not.toHaveBeenCalled();
  });

  it('ustoz-ega: ikkalasi ham 200, kurs bog\'lanishi so\'ralmaydi', async () => {
    signIn('teacher-user', 'TEACHER');
    expect((await callGet()).status).toBe(200);
    expect((await callSubmit()).status).toBe(200);
    expect(mocks.courseLessonCount).not.toHaveBeenCalled();
  });

  it('Test.userId egasi (eski generatsiya qilingan test): 200', async () => {
    mocks.testRow = buildTest({ teacher: null, userId: 'gen-owner' });
    signIn('gen-owner');
    expect((await callGet()).status).toBe(200);
    expect((await callSubmit()).status).toBe(200);
  });

  it('ADMIN: ikkalasi ham 200', async () => {
    signIn('admin1', 'ADMIN');
    expect((await callGet()).status).toBe(200);
    expect((await callSubmit()).status).toBe(200);
  });

  it("nashr etilgan kursning QUIZ darsiga ulangan qoralama: oddiy foydalanuvchiga 200", async () => {
    mocks.courseLessonCount.mockResolvedValue(1);
    signIn('u1');
    expect((await callGet()).status).toBe(200);
    expect((await callSubmit()).status).toBe(200);
    expect(mocks.courseLessonCount).toHaveBeenCalledWith({
      where: { testId: 'test1', section: { course: { isPublished: true } } },
    });
  });

  it('nashr etilgan kursning QUIZ blokiga ulangan qoralama: 200', async () => {
    mocks.lessonBlockCount.mockResolvedValue(1);
    signIn('u1');
    expect((await callGet()).status).toBe(200);
    expect((await callSubmit()).status).toBe(200);
    expect(mocks.lessonBlockCount).toHaveBeenCalledWith({
      where: { testId: 'test1', lesson: { section: { course: { isPublished: true } } } },
    });
  });

  it("kursga ulanmagan (yoki faqat qoralama kursga ulangan) qoralama: 404", async () => {
    // count'lar `course.isPublished: true` bilan so'raladi — qoralama kursdagi bog'lanish 0 qaytaradi.
    signIn('u1');
    expect((await callGet()).status).toBe(404);
    expect((await callSubmit()).status).toBe(404);
  });
});

describe('nashr etilgan test', () => {
  beforeEach(() => {
    mocks.testRow = buildTest({ isPublished: true });
  });

  it('mehmon GET 200, foydalanuvchi submit 200, kurs so\'rovi yo\'q', async () => {
    expect((await callGet()).status).toBe(200);
    signIn('u1');
    expect((await callSubmit()).status).toBe(200);
    expect(mocks.courseLessonCount).not.toHaveBeenCalled();
    expect(mocks.lessonBlockCount).not.toHaveBeenCalled();
  });

  it('GET javobida yozma va video yechim yo\'q (paywall)', async () => {
    signIn('u1');
    const { data } = await callGet();
    expect(data.test).not.toHaveProperty('writtenSolution');
    expect(data.test).not.toHaveProperty('videoSolution');
    expect(data.test.questions[0]).not.toHaveProperty('correctAnswer');
  });
});
