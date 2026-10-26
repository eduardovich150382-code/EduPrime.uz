import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

/**
 * practice-check egasiga GET /api/results/[id] ko'rsatadigandan ORTIQ narsa
 * ochmasligi kerak — va kam ham emas: bir xil savol uchun to'g'ri javob,
 * variantlar va yechim maydonlari (yozma/video, qulf holati) ikkala route'da
 * aynan bir xil. Ikkala route ham haqiqiy `lib/access`, `lib/quota`,
 * `lib/solution-visibility` orqali ishlaydi — faqat db/auth mock.
 */
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  subscriptions: vi.fn(),
  unlocks: vi.fn(),
  userRole: vi.fn(),
}));

const QUESTIONS = [
  { id: 'q1', text: 'Yozma yechimli', images: ['i.png'], options: [{ label: 'A', text: '1', image: null }, { label: 'B', text: '2', image: null }], correctAnswer: 'B', explanation: 'Yechim 1', explanationImages: ['e.png'], videoUrl: null, points: 1, order: 0, type: 'MULTIPLE_CHOICE', subjectId: null, templateId: null, variantSig: null, lang: null, tags: ['mavzu:x'] },
  { id: 'q2', text: 'Videoli', images: [], options: [{ label: 'A', text: '3', image: null }, { label: 'B', text: '4', image: null }], correctAnswer: 'A', explanation: 'Yozma ham bor', explanationImages: [], videoUrl: 'https://youtube.com/watch?v=x', points: 2, order: 1, type: 'MULTIPLE_CHOICE', subjectId: null, templateId: null, variantSig: null, lang: null, tags: [] },
  { id: 'q3', text: 'Yechimsiz', images: [], options: [], correctAnswer: 'javob', explanation: null, explanationImages: [], videoUrl: null, points: 1, order: 2, type: 'OPEN_ENDED', subjectId: null, templateId: null, variantSig: null, lang: null, tags: [] },
];
const TEST = {
  id: 'test1', categoryId: 'cat1', subjectId: 'subj1', isPublished: true, isFree: true, accessType: 'free', price: 0, isMock: false,
  userId: null, teacher: null, videoSolution: null, writtenSolution: null, subject: { nameUz: 'Fizika', nameRu: 'Физика', nameEn: 'Physics' },
  questions: QUESTIONS,
};
const RESULT = {
  id: 'result1', userId: 'user1', testId: 'test1', sessionId: null, score: 0, maxScore: 4, percentage: 0, timeSpent: 10,
  completedAt: new Date('2026-10-01T00:00:00Z'), session: null, test: TEST,
  answers: QUESTIONS.map((q) => ({ questionId: q.id, answer: '', isCorrect: false })),
};

vi.mock('@/lib/db', () => ({
  db: {
    test: { findUnique: () => Promise.resolve(TEST) },
    testResult: {
      findUnique: () => Promise.resolve(RESULT),
      findFirst: () => Promise.resolve({ answers: RESULT.answers }),
      count: () => Promise.resolve(1),
      findMany: () => Promise.resolve([]),
    },
    testCategory: { findUnique: () => Promise.resolve({ type: 'DTM' }) },
    user: { findUnique: () => mocks.userRole() },
    subscription: { findMany: () => mocks.subscriptions() },
    userPermission: { findMany: () => Promise.resolve([]) },
    solutionUnlock: { findMany: () => mocks.unlocks() },
    dailyUsage: { findUnique: () => Promise.resolve(null) },
    item: { findMany: () => Promise.resolve([]) },
    systemSetting: { findMany: () => Promise.resolve([]) },
  },
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/auth', () => ({ auth: () => mocks.auth() }));
vi.mock('@/lib/gemini', () => ({ checkOpenEndedEquivalence: () => Promise.resolve(false) }));

import { GET as RESULT_GET } from '@/app/api/results/[id]/route';
import { POST as CHECK } from '../practice-check/route';

const REVIEW_FIELDS = [
  'id', 'text', 'images', 'options', 'correctAnswer', 'points', 'type', 'tags',
  'explanation', 'explanationImages', 'videoUrl', 'solutionKind', 'solutionUnlocked',
] as const;

const pick = (q: Record<string, unknown>) => Object.fromEntries(REVIEW_FIELDS.map((key) => [key, q[key]]));

async function bothRoutes() {
  const resultResponse = await RESULT_GET(new Request('http://localhost/api/results/result1') as unknown as NextRequest, { params: Promise.resolve({ id: 'result1' }) });
  const resultQuestions: Record<string, unknown>[] = (await resultResponse.json()).result.test.questions;
  const checkResponse = await CHECK(new Request('http://localhost/api/tests/test1/practice-check', {
    method: 'POST', body: JSON.stringify({ resultId: 'result1', answers: [] }),
  }) as unknown as NextRequest, { params: Promise.resolve({ id: 'test1' }) });
  expect(checkResponse.status).toBe(200);
  const practiceQuestions: Record<string, unknown>[] = (await checkResponse.json()).practice.questions;
  return { resultQuestions, practiceQuestions };
}

const FUTURE = new Date('2099-01-01');

describe('practice-check ↔ results/[id] — ko\'rib chiqish maydonlari bir xil', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockReturnValue({ user: { id: 'user1', role: 'USER' } });
    mocks.userRole.mockResolvedValue({ role: 'USER' });
    mocks.subscriptions.mockResolvedValue([]);
    mocks.unlocks.mockResolvedValue([]);
  });

  it.each([
    ['obunasiz', () => {}, { q1: [null, false], q2: [null, false] }],
    ['q1 uchun SolutionUnlock', () => mocks.unlocks.mockResolvedValue([{ itemId: 'q1' }]), { q1: ['Yechim 1', true], q2: [null, false] }],
    ['PREMIUM', () => mocks.subscriptions.mockResolvedValue([{ plan: 'PREMIUM', isActive: true, endDate: FUTURE }]), { q1: ['Yechim 1', true], q2: [null, true] }],
    ['TEACHER_PLAN (video yopiq)', () => mocks.subscriptions.mockResolvedValue([{ plan: 'TEACHER_PLAN', isActive: true, endDate: FUTURE }]), { q1: ['Yechim 1', true], q2: [null, false] }],
    ['ADMIN (o\'z natijasi)', () => { mocks.auth.mockReturnValue({ user: { id: 'user1', role: 'ADMIN' } }); mocks.userRole.mockResolvedValue({ role: 'ADMIN' }); }, { q1: ['Yechim 1', true], q2: [null, true] }],
  ])('%s', async (_name, arrange, expected) => {
    arrange();
    const { resultQuestions, practiceQuestions } = await bothRoutes();
    expect(practiceQuestions.map(pick)).toEqual(resultQuestions.map(pick));
    // Paritet bo'sh qiymatlar bilan "o'tib ketmasin" — kutilgan qulf holati aniq tekshiriladi.
    const byId = Object.fromEntries(practiceQuestions.map((q) => [q.id, q]));
    expect([byId.q1.explanation, byId.q1.solutionUnlocked]).toEqual(expected.q1);
    expect([byId.q2.explanation, byId.q2.solutionUnlocked]).toEqual(expected.q2);
    expect(byId.q2.videoUrl).toBe(expected.q2[1] ? 'https://youtube.com/watch?v=x' : null);
    expect(byId.q1.correctAnswer).toBe('B');
  });
});
