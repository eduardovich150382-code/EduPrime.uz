import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

/**
 * GET /api/tests/[id] → (mijoz aralashtirishi) → POST submit zanjiri bo'limli
 * attestatsiya testida. db/auth mock — naqsh `submit/__tests__/route.test.ts`
 * bilan bir xil. Maqsad: GET tartibi va submit qayta hisoblagan variant
 * urug'lari mos kelishini haqiqiy route'lar orqali isbotlash.
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

import { GET } from '../route';
import { POST } from '../submit/route';
import { shuffleArray, shuffleTest } from '@/lib/shuffle';
import { shufflePresentedQuestions } from '@/lib/exam-presentation';
import { restoreTestDraft } from '@/lib/test-draft';

type Option = { label: string; text: string; image: null };
type Served = { id: string; type: string; options: Option[]; subjectId: string | null; section?: string; tags?: unknown };

const SECTION_ORDER = ['fizika', 'kasb-standarti', 'pedagogika'];

// Bazada bo'limlar ataylab aralash: 8 fizika, 4 kasb, 4 pedagogika.
function buildQuestions(tagged: (i: number) => boolean = () => true) {
  return Array.from({ length: 16 }, (_, i) => {
    const key = i % 4 === 1 ? 'kasb-standarti' : i % 4 === 3 ? 'pedagogika' : 'fizika';
    return {
      id: `q${i}`, text: `Savol ${i}`, images: [], type: 'MULTIPLE_CHOICE', points: 1, order: i, subjectId: null, hints: [],
      tags: tagged(i) ? ['mavzu:x', `section:${key}`] : ['mavzu:x'],
      options: ['A', 'B', 'C', 'D'].map((label) => ({ label, text: `q${i}-${label}`, image: null })),
    };
  });
}

function setup(categoryType: string, questions = buildQuestions()) {
  mocks.findUniqueTest.mockResolvedValue({
    id: 'test1', categoryId: 'cat1', isPublished: true, isFree: true, accessType: 'free', courseLessons: [], subject: { nameUz: 'Fizika' }, teacher: null,
    questions: questions.map((q) => ({ ...q, correctAnswer: 'B' })),
  });
  // GET'dagi select correctAnswer'ni olmaydi — u faqat submit'dagi test.questions'da.
  mocks.findManyQuestion.mockResolvedValue(questions);
  mocks.findUniqueCategory.mockResolvedValue({ type: categoryType });
  return questions;
}

// toEqual undefined maydonni yo'q maydon deb hisoblaydi — eski javobda tags bo'lmagan.
const withoutTags = (questions: ReturnType<typeof buildQuestions>) => questions.map((q) => ({ ...q, tags: undefined }));

const params = { params: Promise.resolve({ id: 'test1' }) };

async function callGet(): Promise<Served[]> {
  const response = await GET(new Request('http://localhost/api/tests/test1') as unknown as NextRequest, params);
  expect(response.status).toBe(200);
  return (await response.json()).test.questions;
}

async function callSubmit(answers: { questionId: string; answer: string; timeSpent: number }[]) {
  const request = new Request('http://localhost/api/tests/test1/submit', { method: 'POST', body: JSON.stringify({ answers, timeSpent: 60 }) });
  const response = await POST(request as unknown as NextRequest, params);
  return { status: response.status, data: await response.json() };
}

// To'g'ri variant matni har doim `<id>-B` — foydalanuvchi uni qaysi harfda ko'rsa shuni tanlaydi.
const correctLabel = (q: Served) => q.options.find((o) => o.text === `${q.id}-B`)!.label;

const sectionOf = (id: string) => {
  const i = Number(id.slice(1));
  return i % 4 === 1 ? 'kasb-standarti' : i % 4 === 3 ? 'pedagogika' : 'fizika';
};

function expectContiguous(sections: (string | undefined)[]) {
  const blocks = sections.filter((s, i) => i === 0 || s !== sections[i - 1]);
  expect(blocks).toEqual(SECTION_ORDER);
}

describe('Bo\'limli attestatsiya — GET → submit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockReturnValue({ user: { id: 'user1' } });
    mocks.createResult.mockImplementation(({ data }: { data: Record<string, unknown> }) => Promise.resolve({ id: 'result1', ...data }));
  });

  it("bloklar ketma-ket, section bor, tags yo'q; to'g'ri javoblar to'g'ri baholanadi", async () => {
    setup('ATTESTATION');
    const served = await callGet();
    expectContiguous(served.map((q) => q.section));
    for (const q of served) {
      expect(q.section).toBe(sectionOf(q.id));
      expect(q).not.toHaveProperty('tags');
    }

    for (const seed of [3, 726, 4294967295]) {
      const presented = shufflePresentedQuestions(served, seed);
      expectContiguous(presented.map((q) => q.section));
      const answers = presented.map((q) => ({ questionId: q.id, answer: correctLabel(q), timeSpent: 1 }));
      const { status, data } = await callSubmit(answers);
      expect(status).toBe(200);
      expect(data.result.score).toBe(16);
      expect(data.result.answers.every((a: { isCorrect: boolean }) => a.isCorrect)).toBe(true);
      expect(data.result.answers.map((a: { questionId: string }) => a.questionId)).toEqual(presented.map((q) => q.id));
    }
  });

  it("noto'g'ri javob noto'g'ri baholanadi", async () => {
    setup('ATTESTATION');
    const served = await callGet();
    const wrong = served.map((q) => ({ questionId: q.id, answer: q.options.find((o) => o.text === `${q.id}-C`)!.label, timeSpent: 1 }));
    const { data } = await callSubmit(wrong);
    expect(data.result.score).toBe(0);
  });

  it("kirmagan foydalanuvchi: bloklar ketma-ket, ichida bazadagi tartib, section bor, tags yo'q", async () => {
    mocks.auth.mockReturnValue(null);
    const questions = setup('ATTESTATION');
    const served = await callGet();
    expectContiguous(served.map((q) => q.section));
    for (const q of served) expect(q).not.toHaveProperty('tags');
    const expected = SECTION_ORDER.flatMap((key) => questions.filter((q) => sectionOf(q.id) === key).map((q) => q.id));
    expect(served.map((q) => q.id)).toEqual(expected);
    // Aralashtirilmagan — variantlar bazadagidek.
    expect(served[0].options.map((o) => o.text)).toEqual(['A', 'B', 'C', 'D'].map((l) => `${served[0].id}-${l}`));
  });

  it.each([
    ['ATTESTATION emas, teglar to\'liq', 'DTM', buildQuestions()],
    ["ATTESTATION, bitta savolda teg yo'q", 'ATTESTATION', buildQuestions((i) => i !== 5)],
  ])('%s → eski tartib va variantlar, section maydoni yo\'q', async (_name, categoryType, questions) => {
    setup(categoryType, questions);
    const served = await callGet();
    const legacy = shuffleTest(withoutTags(questions), 'user1', 'test1', { preserveOrder: false });
    expect(served).toEqual(legacy);
    for (const q of served) expect(q).not.toHaveProperty('section');
  });

  it("S12 eski qoralama (aralash questionIds) tiklanadi va to'g'ri baholanadi", async () => {
    const questions = setup('ATTESTATION');
    // Bo'limlashdan oldin GET tekis tartibda berardi, mijoz esa bitta guruh sifatida aralashtirardi.
    const oldServed = shuffleTest(withoutTags(questions), 'user1', 'test1') as Served[];
    const oldPresented = shuffleArray(oldServed, 555);
    const raw = JSON.stringify({
      questionIds: oldPresented.map((q) => q.id),
      answers: Object.fromEntries(oldPresented.map((q, i) => [i, correctLabel(q)])),
      currentQuestion: 3, flagged: [], questionTimeSpent: {}, autoNext: true, timestamp: Date.now(),
    });

    const served = await callGet();
    const draft = restoreTestDraft(served, raw);
    expect(draft).not.toBeNull();
    expect(draft!.questions.map((q) => q.id)).toEqual(oldPresented.map((q) => q.id));
    // Qoralamadagi harf yangi javobda ham o'sha variant matniga ishora qiladi.
    draft!.questions.forEach((q, i) => expect(q.options.find((o) => o.label === draft!.answers[i])!.text).toBe(`${q.id}-B`));

    const { data } = await callSubmit(draft!.questions.map((q, i) => ({ questionId: q.id, answer: draft!.answers[i], timeSpent: 1 })));
    expect(data.result.score).toBe(16);
  });
});
