import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

/**
 * Xatolar ustida mashq: GET /api/tests/[id]?practice= → (mijoz aralashtirishi)
 * → POST practice-check. db/auth mock — naqsh `section-order.test.ts` bilan
 * bir xil. db'ning har qanday yozish metodi (`create`, `update`, `upsert`,
 * `delete`, ...) va `$transaction` bitta `writes` spy'iga tushadi — mashq hech
 * narsa yozmasligi shu orqali isbotlanadi.
 */
const mocks = vi.hoisted(() => ({
  findUniqueTest: vi.fn(),
  findManyQuestion: vi.fn(),
  findUniqueCategory: vi.fn(),
  findFirstResult: vi.fn(),
  auth: vi.fn(),
  checkTestAccess: vi.fn(),
  creditQuizLessonProgress: vi.fn(),
  writes: vi.fn(),
  shuffleTestCalls: vi.fn(),
  gradeSeeds: vi.fn(),
}));

vi.mock('@/lib/db', () => {
  const WRITE_METHODS = new Set(['create', 'createMany', 'update', 'updateMany', 'upsert', 'delete', 'deleteMany']);
  const reads: Record<string, Record<string, unknown>> = {
    test: { findUnique: (...args: unknown[]) => mocks.findUniqueTest(...args) },
    question: { findMany: (...args: unknown[]) => mocks.findManyQuestion(...args) },
    testCategory: { findUnique: (...args: unknown[]) => mocks.findUniqueCategory(...args) },
    testResult: { findFirst: (...args: unknown[]) => mocks.findFirstResult(...args) },
    item: { findMany: () => Promise.resolve([]) },
    subscription: { findMany: () => Promise.resolve([]) },
    userPermission: { findMany: () => Promise.resolve([]) },
    solutionUnlock: { findMany: () => Promise.resolve([]) },
    user: { findUnique: () => Promise.resolve({ role: 'USER' }) },
    // Qoralama testda kurs bog'lanishi so'raladi (test-visibility.ts) — bog'lanish yo'q.
    courseLesson: { count: () => Promise.resolve(0) },
    lessonBlock: { count: () => Promise.resolve(0) },
  };
  const model = (name: string) => new Proxy(reads[name] ?? {}, {
    get(target, prop: string) {
      if (prop in target) return target[prop];
      if (WRITE_METHODS.has(prop)) {
        return (...args: { data?: Record<string, unknown> }[]) => {
          mocks.writes(`${name}.${prop}`, args);
          return Promise.resolve({ id: 'result1', ...(args[0]?.data ?? {}) });
        };
      }
      return undefined;
    },
  });
  const db: Record<string, unknown> = new Proxy({}, {
    get(_target, prop: string) {
      if (prop === '$transaction') {
        return (cb: (tx: unknown) => unknown) => { mocks.writes('$transaction', []); return cb(db); };
      }
      return model(prop);
    },
  });
  return { db };
});
vi.mock('@/lib/auth', () => ({ auth: () => mocks.auth() }));
vi.mock('@/lib/gemini', () => ({ checkOpenEndedEquivalence: () => Promise.resolve(false) }));
vi.mock('@/lib/course-progress', () => ({ creditQuizLessonProgress: (...args: unknown[]) => mocks.creditQuizLessonProgress(...args) }));
vi.mock('@/lib/access', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/access')>()),
  checkTestAccess: (...args: unknown[]) => mocks.checkTestAccess(...args),
}));
// Urug' manbasini kuzatish: GET `shuffleTest(…, userId, testId, …)` orqali,
// submit va practice-check `gradeSubmission({ baseSeed })` orqali.
vi.mock('@/lib/shuffle', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/shuffle')>();
  return {
    ...actual,
    shuffleTest: (...args: Parameters<typeof actual.shuffleTest>) => { mocks.shuffleTestCalls(args[1], args[2]); return actual.shuffleTest(...args); },
  };
});
vi.mock('@/lib/grading', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/grading')>();
  return {
    ...actual,
    gradeSubmission: (params: Parameters<typeof actual.gradeSubmission>[0]) => { mocks.gradeSeeds(params.baseSeed); return actual.gradeSubmission(params); },
  };
});

import { GET } from '../route';
import { POST as SUBMIT } from '../submit/route';
import { POST as CHECK } from '../practice-check/route';
import { generateSeed } from '@/lib/shuffle';
import { shufflePresentedQuestions } from '@/lib/exam-presentation';
import { encodeMatchingAnswer } from '@/lib/matching';
import { mixedQuestions, sectionOf, sectionQuestions, SECTION_ORDER, type FixtureQuestion } from './fixtures';

type Option = { label: string; text: string };
type Served = { id: string; type: string; options: Option[] | { left: string[]; right: string[] }; section?: string; [key: string]: unknown };
type ResultAnswer = { questionId: string; answer: string; isCorrect: boolean };

const params = { params: Promise.resolve({ id: 'test1' }) };

function setup(questions: FixtureQuestion[], categoryType: string, testOverrides: Record<string, unknown> = {}) {
  mocks.findUniqueTest.mockResolvedValue({
    id: 'test1', categoryId: 'cat1', subjectId: 'subj1', isPublished: true, isFree: true, accessType: 'free', price: 0,
    titleUz: 'Test', duration: 30, courseLessons: [{ id: 'lesson1' }], subject: { nameUz: 'Fizika' }, teacher: null, userId: null,
    questions: questions.map((q) => ({ ...q, explanation: null, explanationImages: [], videoUrl: null, templateId: null, variantSig: null, lang: null })),
    ...testOverrides,
  });
  mocks.findManyQuestion.mockResolvedValue(questions.map((q) => {
    const served: Partial<FixtureQuestion> = { ...q };
    delete served.correctAnswer;
    return served;
  }));
  mocks.findUniqueCategory.mockResolvedValue({ type: categoryType });
}

// Natija: id'lari `correctIds` dagilar to'g'ri, `missing` dagilar yozilmagan, qolgani xato.
function setResult(ids: string[], correctIds: string[], missing: string[] = [], owner = { userId: 'user1', testId: 'test1', id: 'result1' }) {
  const answers: ResultAnswer[] = ids.filter((id) => !missing.includes(id)).map((id, i) => ({
    questionId: id, answer: i % 2 ? '' : 'A', isCorrect: correctIds.includes(id),
  }));
  mocks.findFirstResult.mockImplementation(({ where }: { where: { id: string; userId: string; testId: string } }) =>
    Promise.resolve(where.id === owner.id && where.userId === owner.userId && where.testId === owner.testId ? { answers } : null));
  return answers;
}

async function callGet(query = ''): Promise<{ status: number; data: { test?: { questions: Served[] }; error?: string } }> {
  const response = await GET(new Request(`http://localhost/api/tests/test1${query}`) as unknown as NextRequest, params);
  return { status: response.status, data: await response.json() };
}

async function callCheck(body: unknown) {
  const request = new Request('http://localhost/api/tests/test1/practice-check', { method: 'POST', body: JSON.stringify(body) });
  const response = await CHECK(request as unknown as NextRequest, params);
  return { status: response.status, data: await response.json() };
}

// Foydalanuvchi ko'rgan (aralashtirilgan) savolga to'g'ri javob — fixtures.ts dagi to'g'ri javoblar bo'yicha.
function correctAnswer(q: Served): string {
  if (q.type === 'MATCHING') {
    const right = (q.options as { right: string[] }).right;
    return encodeMatchingAnswer([0, 1, 2].map((row) => right.indexOf(`R${row}`)));
  }
  if (q.type === 'FILL_BLANK') return JSON.stringify(['x', 'y']);
  if (q.type === 'OPEN_ENDED') return `javob${q.id.slice(1)}`;
  const wanted = q.type === 'MULTI_SELECT' ? ['A', 'C'] : q.type === 'TRUE_FALSE' ? ['A'] : ['B'];
  return (q.options as Option[]).filter((o) => wanted.some((w) => o.text === `${q.id}-${w}`)).map((o) => o.label).sort().join(',');
}

function wrongAnswer(q: Served): string {
  if (q.type === 'MATCHING') return encodeMatchingAnswer([null, null, null]);
  if (q.type === 'FILL_BLANK') return JSON.stringify(['z', 'z']);
  if (q.type === 'OPEN_ENDED') return 'yo\'q';
  return (q.options as Option[]).find((o) => o.text === `${q.id}-${q.type === 'TRUE_FALSE' ? 'B' : 'D'}`)!.label;
}

const ALL_MIXED = mixedQuestions().map((q) => q.id);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockReturnValue({ user: { id: 'user1', role: 'USER' } });
  mocks.checkTestAccess.mockResolvedValue(true);
});

describe('GET ?practice= — savollar to\'plami', () => {
  for (const user of ['user1', 'cmabc123user', 'u-9']) {
    it(`${user}: faqat xato/javobsiz savollar, to'liq GET tartibida, variantlar bir xil; to'g'ri javoblar to'g'ri baholanadi`, async () => {
      mocks.auth.mockReturnValue({ user: { id: user, role: 'USER' } });
      setup(mixedQuestions(), 'DTM');
      setResult(ALL_MIXED, ['q0', 'q3', 'q6', 'q7'], ['q11'], { userId: user, testId: 'test1', id: 'result1' });
      const expectedIds = ALL_MIXED.filter((id) => !['q0', 'q3', 'q6', 'q7'].includes(id));

      const full = (await callGet()).data.test!.questions;
      const { status, data } = await callGet('?practice=result1');
      expect(status).toBe(200);
      const practice = data.test!.questions;
      expect([...practice.map((q) => q.id)].sort()).toEqual([...expectedIds].sort());
      // Qism to'plam to'liq taqdimotning filtri: tartib ham, variantlar ham aynan bir xil.
      expect(practice).toEqual(full.filter((q) => expectedIds.includes(q.id)));
      for (const q of practice) {
        expect(q).not.toHaveProperty('correctAnswer');
        expect(q).not.toHaveProperty('explanation');
      }

      for (const seed of [3, 726, 4294967295]) {
        const presented = shufflePresentedQuestions(practice, seed);
        const right = await callCheck({ resultId: 'result1', answers: presented.map((q) => ({ questionId: q.id, answer: correctAnswer(q), timeSpent: 1 })) });
        expect(right.status).toBe(200);
        expect(right.data.practice).toMatchObject({ correct: expectedIds.length, total: expectedIds.length });
        const wrong = await callCheck({ resultId: 'result1', answers: presented.map((q) => ({ questionId: q.id, answer: wrongAnswer(q), timeSpent: 1 })) });
        expect(wrong.data.practice).toMatchObject({ correct: 0, total: expectedIds.length });
      }
    });
  }

  it("hammasi to'g'ri bo'lgan natija — bo'sh to'plam", async () => {
    setup(mixedQuestions(), 'DTM');
    setResult(ALL_MIXED, ALL_MIXED);
    const { status, data } = await callGet('?practice=result1');
    expect(status).toBe(200);
    expect(data.test!.questions).toEqual([]);
  });

  it("bo'limli attestatsiya: qism to'plam bo'limlar ketma-ketligida, ichida to'liq tartib (S14)", async () => {
    const ids = sectionQuestions().map((q) => q.id);
    setup(sectionQuestions(), 'ATTESTATION');
    setResult(ids, ['q0', 'q4', 'q5', 'q9']);
    const full = (await callGet()).data.test!.questions;
    const practice = (await callGet('?practice=result1')).data.test!.questions;
    const expected = full.filter((q) => !['q0', 'q4', 'q5', 'q9'].includes(q.id));
    expect(practice).toEqual(expected);
    const blocks = practice.map((q) => q.section).filter((s, i, all) => i === 0 || s !== all[i - 1]);
    expect(blocks).toEqual(SECTION_ORDER);
    for (const q of practice) expect(q.section).toBe(sectionOf(q.id));

    for (const seed of [11, 9999]) {
      const presented = shufflePresentedQuestions(practice, seed);
      const blocksAfter = presented.map((q) => q.section).filter((s, i, all) => i === 0 || s !== all[i - 1]);
      expect(blocksAfter).toEqual(SECTION_ORDER);
      const { data } = await callCheck({ resultId: 'result1', answers: presented.map((q) => ({ questionId: q.id, answer: correctAnswer(q), timeSpent: 1 })) });
      expect(data.practice).toMatchObject({ correct: 8, total: 8, categoryType: 'ATTESTATION' });
    }
  });
});

describe('practice-check — 2-raund va javob shakli', () => {
  it("questionIds — mashq to'plamining qismi bo'lsa faqat o'shalar baholanadi", async () => {
    setup(mixedQuestions(), 'DTM');
    setResult(ALL_MIXED, ['q0']);
    const { status, data } = await callCheck({ resultId: 'result1', answers: [], questionIds: ['q2', 'q5'] });
    expect(status).toBe(200);
    expect(data.practice.total).toBe(2);
    expect(data.practice.answers.map((a: ResultAnswer) => a.questionId)).toEqual(['q2', 'q5']);
    expect(data.practice.questions.map((q: { id: string }) => q.id)).toEqual(['q2', 'q5']);
  });

  it("questionIds mashq to'plamidan tashqarida (to'g'ri yechilgan yoki begona) → 400", async () => {
    setup(mixedQuestions(), 'DTM');
    setResult(ALL_MIXED, ['q0']);
    expect((await callCheck({ resultId: 'result1', answers: [], questionIds: ['q2', 'q0'] })).status).toBe(400);
    expect((await callCheck({ resultId: 'result1', answers: [], questionIds: ['other'] })).status).toBe(400);
  });

  it('har savolda natija sahifasidagi asl raqam qaytadi', async () => {
    setup(mixedQuestions(), 'DTM');
    const order = [...ALL_MIXED].reverse();
    mocks.findFirstResult.mockResolvedValue({ answers: order.map((id) => ({ questionId: id, answer: '', isCorrect: id === 'q11' })) });
    const { data } = await callCheck({ resultId: 'result1', answers: [] });
    const numbers = Object.fromEntries(data.practice.questions.map((q: { id: string; number: number }) => [q.id, q.number]));
    expect(numbers).toMatchObject({ q10: 2, q0: 12 });
    expect(numbers).not.toHaveProperty('q11');
  });

  it('noto\'g\'ri body → 400', async () => {
    setup(mixedQuestions(), 'DTM');
    expect((await callCheck({ answers: [] })).status).toBe(400);
    expect((await callCheck({ resultId: 'result1', answers: 'x' })).status).toBe(400);
  });
});

describe('Kirish huquqi', () => {
  it('mehmon → 401 (GET va check)', async () => {
    setup(mixedQuestions(), 'DTM');
    setResult(ALL_MIXED, []);
    mocks.auth.mockReturnValue(null);
    expect((await callGet('?practice=result1')).status).toBe(401);
    expect((await callCheck({ resultId: 'result1', answers: [] })).status).toBe(401);
    // Parametrsiz mehmon GET avvalgidek ochiq (bepul test).
    expect((await callGet()).status).toBe(200);
  });

  it('begona foydalanuvchining natijasi → 404', async () => {
    setup(mixedQuestions(), 'DTM');
    setResult(ALL_MIXED, [], [], { userId: 'other', testId: 'test1', id: 'result1' });
    expect((await callGet('?practice=result1')).status).toBe(404);
    expect((await callCheck({ resultId: 'result1', answers: [] })).status).toBe(404);
  });

  it('boshqa testning natijasi → 404', async () => {
    setup(mixedQuestions(), 'DTM');
    setResult(ALL_MIXED, [], [], { userId: 'user1', testId: 'test2', id: 'result1' });
    expect((await callGet('?practice=result1')).status).toBe(404);
    expect((await callCheck({ resultId: 'result1', answers: [] })).status).toBe(404);
  });

  it('pullik test, obuna yo\'q → 403 (GET va check), natija o\'qilmaydi', async () => {
    setup(mixedQuestions(), 'DTM', { isFree: false, accessType: 'subscription' });
    setResult(ALL_MIXED, []);
    mocks.checkTestAccess.mockResolvedValue(false);
    expect((await callGet('?practice=result1')).status).toBe(403);
    expect((await callCheck({ resultId: 'result1', answers: [] })).status).toBe(403);
    expect(mocks.findFirstResult).not.toHaveBeenCalled();
  });

  it('qoralama (nashr etilmagan) begona test → 404', async () => {
    setup(mixedQuestions(), 'DTM', { isPublished: false });
    setResult(ALL_MIXED, []);
    expect((await callGet('?practice=result1')).status).toBe(404);
    expect((await callCheck({ resultId: 'result1', answers: [] })).status).toBe(404);
  });
});

describe('Mashq hech narsa yozmaydi', () => {
  it('GET ?practice= va practice-check: db yozuvi, tranzaksiya, dars progressi yo\'q', async () => {
    setup(mixedQuestions(), 'DTM');
    setResult(ALL_MIXED, ['q0']);
    const practice = (await callGet('?practice=result1')).data.test!.questions;
    await callCheck({ resultId: 'result1', answers: practice.map((q) => ({ questionId: q.id, answer: correctAnswer(q), timeSpent: 1 })) });
    await callCheck({ resultId: 'result1', answers: [], questionIds: ['q1'] });
    expect(mocks.writes).not.toHaveBeenCalled();
    expect(mocks.creditQuizLessonProgress).not.toHaveBeenCalled();
  });

  it('nazorat: oddiy submit esa yozadi (spy ishlayotganini isbotlaydi)', async () => {
    setup(mixedQuestions(), 'DTM');
    mocks.creditQuizLessonProgress.mockResolvedValue(undefined);
    const full = (await callGet()).data.test!.questions;
    const request = new Request('http://localhost/api/tests/test1/submit', {
      method: 'POST', body: JSON.stringify({ answers: full.map((q) => ({ questionId: q.id, answer: correctAnswer(q), timeSpent: 1 })), timeSpent: 5 }),
    });
    expect((await SUBMIT(request as unknown as NextRequest, params)).status).toBe(200);
    expect(mocks.writes).toHaveBeenCalledWith('testResult.create', expect.anything());
    expect(mocks.creditQuizLessonProgress).toHaveBeenCalled();
  });
});

describe("Urug' manbasi — asosiy GET/submit bilan bir xil", () => {
  for (const user of ['user1', 'cmabc123user']) {
    it(`${user}: GET (oddiy va practice) bir xil shuffleTest(userId, testId); submit va practice-check bir xil baseSeed`, async () => {
      mocks.auth.mockReturnValue({ user: { id: user, role: 'USER' } });
      setup(mixedQuestions(), 'DTM');
      setResult(ALL_MIXED, [], [], { userId: user, testId: 'test1', id: 'result1' });

      const full = (await callGet()).data.test!.questions;
      await callGet('?practice=result1');
      expect(mocks.shuffleTestCalls.mock.calls).toEqual([[user, 'test1'], [user, 'test1']]);

      const answers = full.map((q) => ({ questionId: q.id, answer: correctAnswer(q), timeSpent: 1 }));
      await SUBMIT(new Request('http://localhost/api/tests/test1/submit', { method: 'POST', body: JSON.stringify({ answers, timeSpent: 1 }) }) as unknown as NextRequest, params);
      await callCheck({ resultId: 'result1', answers });
      const expected = generateSeed(user, 'test1');
      expect(mocks.gradeSeeds.mock.calls).toEqual([[expected], [expected]]);
    });
  }
});
