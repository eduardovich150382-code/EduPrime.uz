import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

/**
 * GET /api/tests/[id] va POST submit javoblarining XOM matni (bayt darajasida)
 * snapshot'da qotirilgan. Snapshot mashq rejimi qo'shilishidan OLDIN `main`
 * kodida yozilgan — `?practice=` parametrisiz yo'l aynan o'zgarmay qolganini
 * shu test kuzatadi. Snapshot yangilanishi kerak bo'lsa, demak oddiy test
 * yechish yoki baholash o'zgargan: bu ataylab qilingan bo'lishi shart.
 */
const mocks = vi.hoisted(() => ({
  findUniqueTest: vi.fn(),
  findManyQuestion: vi.fn(),
  findUniqueCategory: vi.fn(),
  createResult: vi.fn(),
  auth: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    test: { findUnique: (...args: unknown[]) => mocks.findUniqueTest(...args) },
    question: { findMany: (...args: unknown[]) => mocks.findManyQuestion(...args) },
    testCategory: { findUnique: (...args: unknown[]) => mocks.findUniqueCategory(...args) },
    testResult: { create: (...args: unknown[]) => mocks.createResult(...args) },
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
// Ochiq savolda AI zaxira tekshiruvi tarmoqqa chiqmasin — doim "mos emas".
vi.mock('@/lib/gemini', () => ({ checkOpenEndedEquivalence: () => Promise.resolve(false) }));

import { GET } from '../route';
import { POST } from '../submit/route';
import { mixedQuestions, preserveOrderQuestions, sectionQuestions, type FixtureQuestion } from './fixtures';

const params = { params: Promise.resolve({ id: 'test1' }) };

function setup(questions: FixtureQuestion[], categoryType: string) {
  mocks.findUniqueTest.mockResolvedValue({
    id: 'test1', categoryId: 'cat1', subjectId: 'subj1', isPublished: true, isFree: true, accessType: 'free', price: 0,
    titleUz: 'Test', duration: 30, courseLessons: [], subject: { nameUz: 'Fizika' }, teacher: null, userId: null,
    questions,
  });
  // GET select'ida correctAnswer yo'q — mock ham uni bermaydi.
  mocks.findManyQuestion.mockResolvedValue(questions.map((q) => {
    const served: Partial<FixtureQuestion> = { ...q };
    delete served.correctAnswer;
    return served;
  }));
  mocks.findUniqueCategory.mockResolvedValue({ type: categoryType });
}

// Javoblar deterministik: har turdan bittasi to'g'ri tushishi ham, xato ham bor.
function answersFor(served: { id: string; type: string }[]) {
  const byType: Record<string, string> = {
    MULTIPLE_CHOICE: 'B', MULTI_SELECT: 'A,C', MATCHING: '[1,0,2]', FILL_BLANK: '["x","z"]', OPEN_ENDED: 'javob4', TRUE_FALSE: 'A',
  };
  return served.map((q, i) => ({ questionId: q.id, answer: i % 4 === 3 ? '' : byType[q.type] ?? 'A', timeSpent: i }));
}

const FIXTURES: [string, () => FixtureQuestion[], string][] = [
  ['aralash turlar', mixedQuestions, 'DTM'],
  ['preserveOrder (subjectId)', preserveOrderQuestions, 'DTM'],
  ["bo'limli ATTESTATION", sectionQuestions, 'ATTESTATION'],
];
const USERS = ['user1', 'cmabc123user', 'u-9'];

describe('GET va submit — practice parametrisiz javob matni', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createResult.mockImplementation(({ data }: { data: Record<string, unknown> }) => Promise.resolve({ id: 'result1', ...data }));
  });

  for (const [name, build, categoryType] of FIXTURES) {
    for (const user of USERS) {
      it(`${name} — ${user}`, async () => {
        setup(build(), categoryType);
        mocks.auth.mockReturnValue({ user: { id: user } });
        const getResponse = await GET(new Request('http://localhost/api/tests/test1') as unknown as NextRequest, params);
        const getText = await getResponse.text();
        expect(getResponse.status).toBe(200);
        expect(getText).toMatchSnapshot('GET');

        const served = JSON.parse(getText).test.questions;
        const request = new Request('http://localhost/api/tests/test1/submit', {
          method: 'POST', body: JSON.stringify({ answers: answersFor(served), timeSpent: 99 }),
        });
        const submitResponse = await POST(request as unknown as NextRequest, params);
        expect(submitResponse.status).toBe(200);
        expect(await submitResponse.text()).toMatchSnapshot('submit');
      });
    }
  }

  it('mehmon — bepul test', async () => {
    setup(sectionQuestions(), 'ATTESTATION');
    mocks.auth.mockReturnValue(null);
    const response = await GET(new Request('http://localhost/api/tests/test1') as unknown as NextRequest, params);
    expect(await response.text()).toMatchSnapshot('GET guest');
  });
});
