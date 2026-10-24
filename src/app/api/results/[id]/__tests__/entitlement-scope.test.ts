import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), result: vi.fn(), question: vi.fn(), items: vi.fn(), item: vi.fn(), session: vi.fn(),
  subscriptions: vi.fn(), permissions: vi.fn(), subjects: vi.fn(),
  usage: vi.fn(), usageRead: vi.fn(), unlock: vi.fn(), unlocks: vi.fn(), unlockCreate: vi.fn(), stream: vi.fn(),
}));
vi.mock('@/lib/db', () => ({ db: {
  testResult: { findUnique: mocks.result, count: async () => 1, findMany: async () => [] },
  question: { findUnique: mocks.question }, item: { findMany: mocks.items, findUnique: mocks.item },
  testSession: { findUnique: mocks.session }, subscription: { findMany: mocks.subscriptions },
  userPermission: { findMany: mocks.permissions }, subject: { findMany: mocks.subjects },
  dailyUsage: { upsert: mocks.usage, findUnique: mocks.usageRead },
  solutionUnlock: { findUnique: mocks.unlock, findMany: mocks.unlocks, create: mocks.unlockCreate },
  testCategory: { findUnique: async () => null }, systemSetting: { findMany: async () => [] },
  itemExplanation: { findUnique: async () => null, create: async () => ({}) },
} }));
vi.mock('@/lib/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/gemini', () => ({ streamExplainQuestion: mocks.stream }));
vi.mock('server-only', () => ({}));

import { GET } from '../route';
import { POST as explain } from '../ai-explain/route';
import { POST as unlock } from '../unlock-solution/route';
import { checkPracticeAnswer } from '@/lib/practice-answer-check';

const subject = { id: 'att-physics', categoryId: 'att', disciplineKey: 'fizika', nameUz: 'Fizika', nameRu: 'Физика', nameEn: 'Physics' };
const poolPhysics = { ...subject, id: 'pool-physics', categoryId: 'pool' };
const poolChemistry = { ...subject, id: 'pool-chemistry', categoryId: 'pool', disciplineKey: 'kimyo' };
const testInfo = { id: 't', categoryId: 'att', subjectId: 'att-physics', accessType: 'subscription', isFree: false };
const question = {
  id: 'q', testId: 't', text: 'Savol', options: [{ label: 'A', text: 'Javob', image: null }], correctAnswer: 'A',
  type: 'MULTIPLE_CHOICE', images: [], explanation: 'Yechim', explanationImages: [], videoUrl: null,
  points: 1, order: 0, test: testInfo,
};
function item(id: string, itemSubject = poolPhysics) {
  return { ...question, id, subject: itemSubject, templateId: null, variantSig: null, lang: 'uz' };
}
function result(test = testInfo) {
  return { id: 'r', userId: 'u', testId: 't', sessionId: null, answers: [], session: null,
    test: { ...test, questions: [question], subject, writtenSolution: 'Test yechimi', videoSolution: 'video-test' } };
}
const params = { params: Promise.resolve({ id: 'r' }) };
async function get() {
  const response = await GET(new NextRequest('http://localhost/api/results/r'), params);
  return { status: response.status, data: await response.json() };
}
function post(route: typeof explain | typeof unlock, questionId = 'q') {
  return route(new NextRequest('http://localhost/api/results/r/action', { method: 'POST', body: JSON.stringify({ questionId }) }), params);
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: 'u', role: 'USER', lang: 'uz' } });
  mocks.result.mockResolvedValue(result());
  mocks.question.mockResolvedValue(question);
  mocks.subscriptions.mockResolvedValue([{
    plan: 'CATEGORY', categoryId: 'att', subjectIds: ['att-physics'], product: { subjectRule: 'ONE' },
    isActive: true, endDate: new Date('2099-01-01'),
  }]);
  mocks.permissions.mockResolvedValue([]);
  mocks.subjects.mockResolvedValue([subject]);
  mocks.usageRead.mockResolvedValue({ solutionsUnlocked: 10 });
  mocks.usage.mockResolvedValue({ solutionsUnlocked: 11, tutorMessages: 4 });
  mocks.unlock.mockResolvedValue(null);
  mocks.unlocks.mockResolvedValue([]);
  mocks.unlockCreate.mockResolvedValue({});
  mocks.items.mockResolvedValue([]);
  mocks.item.mockResolvedValue(null);
  mocks.stream.mockImplementation(async function* () { yield 'AI javobi'; });
});

describe('natija va yechimlarning haqiqiy doira integratsiyasi', () => {
  it('attestatsiya-fizika uchun yozma/video test yechimlari kvotasiz', async () => {
    const { status, data } = await get();
    expect(status).toBe(200);
    expect(data.result.test.writtenSolution).toBe('Test yechimi');
    expect(data.result.test.videoSolution).toBe('video-test');
    expect(data.result.test.questions[0].explanation).toBe('Yechim');
    expect(data.solutionQuota.limit).toBeNull();
    expect(mocks.subscriptions).toHaveBeenCalledTimes(1);
    expect(mocks.permissions).toHaveBeenCalledTimes(1);
    expect(mocks.subjects).toHaveBeenCalledTimes(1);
  });

  it('bir xil discipline DTM testining yechimlarini ochmaydi', async () => {
    mocks.result.mockResolvedValue(result({ ...testInfo, categoryId: 'dtm', subjectId: 'dtm-physics' }));
    const { data } = await get();
    expect(data.result.test.writtenSolution).toBeNull();
    expect(data.result.test.videoSolution).toBeNull();
    expect(data.result.test.questions[0].explanation).toBeNull();
    expect(data.solutionQuota.limit).toBe(10);
  });

  it('aralash konstruktor natijasida huquq har bir Item uchun alohida', async () => {
    const items = [item('physics'), item('chemistry', poolChemistry)];
    mocks.result.mockResolvedValue({ ...result(), testId: null, test: null, sessionId: 's', session: { id: 's', itemIds: items.map((it) => it.id), spec: {} } });
    mocks.items.mockResolvedValue(items);
    const { data } = await get();
    expect(data.result.test.questions.map((q: { explanation: string | null }) => q.explanation)).toEqual(['Yechim', null]);
    expect(data.solutionQuota.limit).toBe(10);
    expect(mocks.items).toHaveBeenCalledTimes(1);
    expect(mocks.subscriptions).toHaveBeenCalledTimes(1);
    expect(mocks.unlocks).toHaveBeenCalledTimes(1);
  });

  it('eski Teacher yozma yechimni ochadi, videoni ochmaydi', async () => {
    mocks.subscriptions.mockResolvedValue([{ plan: 'TEACHER_PLAN', isActive: true, endDate: new Date('2099-01-01') }]);
    const { data } = await get();
    expect(data.result.test.writtenSolution).toBe('Test yechimi');
    expect(data.result.test.videoSolution).toBeNull();
  });

  it('100 savolda ham entitlement va unlock o‘qishlari ko‘paymaydi', async () => {
    const row = result();
    row.test.questions = Array.from({ length: 100 }, (_, i) => ({ ...question, id: `q${i}` }));
    mocks.result.mockResolvedValue(row);
    expect((await get()).status).toBe(200);
    expect(mocks.subscriptions).toHaveBeenCalledTimes(1);
    expect(mocks.permissions).toHaveBeenCalledTimes(1);
    expect(mocks.subjects).toHaveBeenCalledTimes(1);
    expect(mocks.unlocks).not.toHaveBeenCalled();
  });

  it('doiradagi unlock bepul kvota tugagan bo‘lsa ham ishlaydi', async () => {
    const response = await post(unlock);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ unlocked: true, limit: null, explanation: 'Yechim' });
    expect(mocks.usage).not.toHaveBeenCalled();
  });

  it('doiradan tashqaridagi unlock uchun bepul limit saqlanadi', async () => {
    mocks.question.mockResolvedValue({ ...question, test: { ...testInfo, categoryId: 'dtm', subjectId: 'dtm-physics' } });
    expect((await post(unlock)).status).toBe(429);
    expect(mocks.unlockCreate).not.toHaveBeenCalled();
  });

  it('doiradagi AI tushuntirish bepul kunlik limitni sarflamaydi', async () => {
    mocks.question.mockResolvedValue({ ...question, explanation: null });
    const response = await post(explain);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('AI javobi');
    expect(mocks.usage).not.toHaveBeenCalled();
    expect(mocks.subscriptions).toHaveBeenCalledTimes(1);
  });

  it('DTM testidagi AI uchun attestatsiya obunasi kvotani bekor qilmaydi', async () => {
    mocks.question.mockResolvedValue({ ...question, explanation: null, test: { ...testInfo, categoryId: 'dtm', subjectId: 'dtm-physics' } });
    expect((await post(explain)).status).toBe(429);
    expect(mocks.stream).not.toHaveBeenCalled();
  });

  it('yangi doirada ham mualliflik yechimi bor joyda AI chaqirilmaydi', async () => {
    const response = await post(explain);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: 'AI_NOT_APPLICABLE' });
    expect(mocks.stream).not.toHaveBeenCalled();
  });

  it('mustaqil Item AI kvotasi discipline bilan, DTM sessiyasida esa aniq doira bilan', async () => {
    const sessionItem = { ...item('physics'), explanation: null };
    mocks.result.mockResolvedValue({ ...result(), testId: null, test: null, sessionId: 's' });
    mocks.item.mockResolvedValue(sessionItem);
    mocks.session.mockResolvedValue({ itemIds: ['physics'], spec: {} });
    // Kesh yo'q; ushbu test generatsiya kvotasini tekshiradi.
    const response = await post(explain, 'physics');
    expect(response.status).toBe(200);
    await response.text();
    expect(mocks.usage).not.toHaveBeenCalled();
    mocks.session.mockResolvedValue({ itemIds: ['physics'], spec: { sections: [{ subjectId: 'pool-physics' }] } });
    expect((await post(explain, 'physics')).status).toBe(429);
  });

  it.each([
    [poolPhysics, 'Yechim'], [poolChemistry, null],
  ])('practice tekshiruvda Item discipline huquqi ishlaydi: %j', async (itemSubject, expected) => {
    mocks.session.mockResolvedValue({ userId: 'u', seed: 1, itemIds: ['practice'], spec: {} });
    mocks.items.mockResolvedValue([item('practice', itemSubject)]);
    const checked = await checkPracticeAnswer({
      userId: 'u', role: 'USER', sessionId: 's', questionId: 'practice', answer: 'A', timeSpent: 1, poolItemIds: ['practice'],
    });
    expect(checked.ok).toBe(true);
    if (checked.ok) expect(checked.result.explanation).toBe(expected);
    expect(mocks.usage).not.toHaveBeenCalled();
    expect(mocks.unlockCreate).not.toHaveBeenCalled();
  });
});
