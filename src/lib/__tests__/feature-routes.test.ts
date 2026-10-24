import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SubscriptionPlan } from '@prisma/client';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), subscriptions: vi.fn(), permissions: vi.fn(), subjects: vi.fn(), user: vi.fn(), update: vi.fn(),
  specialties: vi.fn(), mandatory: vi.fn(), generate: vi.fn(), stats: vi.fn(), tips: vi.fn(),
}));
vi.mock('@/lib/db', () => ({ db: {
  subscription: { findMany: mocks.subscriptions }, userPermission: { findMany: mocks.permissions },
  subject: { findMany: mocks.subjects }, user: { findUnique: mocks.user, update: mocks.update },
} }));
vi.mock('@/lib/api-auth', () => ({ requireAuth: mocks.auth }));
vi.mock('@/lib/dtm-online', () => ({
  getDtmSpecialtySubjects: mocks.specialties, getDtmMandatorySubjects: mocks.mandatory, generateDtmOnlineExam: mocks.generate,
}));
vi.mock('@/lib/mastery', () => ({
  computeTopicStats: mocks.stats,
  classifyTopics: (stats: unknown[]) => ({ strong: stats, medium: [], weak: [], insufficient: [] }),
  generatePracticeSession: vi.fn(),
  buildGrowthSchedule: () => ({ week: [], month: [], sixMonths: [] }),
}));
vi.mock('@/lib/gemini', () => ({ generateGrowthPlanTips: mocks.tips }));

import { POST as startDtm } from '../../app/api/dtm-online/start/route';
import { GET as masteryMap } from '../../app/api/student/mastery-map/route';

const dtmSubjects = ['physics', 'chemistry', 'math', 'language', 'history'].map((name) => ({ id: `dtm-${name}`, categoryId: 'dtm', nameUz: name }));
const allSubjects = [
  { id: 'att-physics', categoryId: 'att', disciplineKey: 'fizika' },
  { id: 'pool-physics', categoryId: 'pool', disciplineKey: 'fizika' },
  { id: 'pool-math', categoryId: 'pool', disciplineKey: 'matematika' },
];
function sub(plan: SubscriptionPlan = 'CATEGORY', categoryId = 'att', subjectIds = ['att-physics']) {
  return { plan, categoryId, subjectIds, product: { subjectRule: 'ONE' }, isActive: true, endDate: new Date('2099-01-01') };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: 'u', role: 'USER' }, error: null });
  mocks.subscriptions.mockResolvedValue([sub()]);
  mocks.permissions.mockResolvedValue([]);
  mocks.subjects.mockImplementation(async ({ where }: { where: { id?: { in: string[] }; categoryId?: { in: string[] } } }) =>
    allSubjects.filter((s) => where.id ? where.id.in.includes(s.id) : where.categoryId?.in.includes(s.categoryId)));
  mocks.user.mockResolvedValue({ dtmOnlineFreeUsedAt: new Date(), masteryMapFreeViewedAt: new Date() });
  mocks.specialties.mockResolvedValue(dtmSubjects);
  mocks.mandatory.mockResolvedValue(dtmSubjects.slice(2));
  mocks.generate.mockResolvedValue({ ok: true, sessionId: 'exam', titleUz: 'DTM' });
  mocks.stats.mockResolvedValue({
    totalAttempts: 6,
    stats: ['physics', 'math'].map((name) => ({ subjectId: `pool-${name}`, topic: name, attempts: 3, correct: 3, rate: 100 })),
  });
  mocks.tips.mockResolvedValue({});
});

async function dtm(body = { specialty1SubjectId: 'dtm-physics', specialty2SubjectId: 'dtm-chemistry' }) {
  return startDtm(new NextRequest('http://localhost/api/dtm-online/start', { method: 'POST', body: JSON.stringify(body) }));
}
async function mastery(subjectId?: string) {
  return masteryMap(new NextRequest(`http://localhost/api/student/mastery-map${subjectId ? `?subjectId=${subjectId}` : ''}`));
}

describe('DTM Online doirasi va eski tariflar', () => {
  it('attestatsiya-fizika DTM bepul tartibini chetlab o‘tmaydi', async () => {
    expect((await dtm()).status).toBe(403);
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it('doiradan tashqarida 30 kun o‘tgan bo‘lsa bepul urinish va sanani yangilash ishlaydi', async () => {
    mocks.user.mockResolvedValue({ dtmOnlineFreeUsedAt: new Date('2020-01-01') });
    expect((await dtm()).status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ data: { dtmOnlineFreeUsedAt: expect.any(Date) } }));
  });

  it('DTM obunasida barcha beshta fan bo‘lsa cheklovsiz', async () => {
    mocks.subscriptions.mockResolvedValue([sub('CATEGORY', 'dtm', dtmSubjects.map((s) => s.id))]);
    expect((await dtm()).status).toBe(200);
    expect(mocks.user).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.subscriptions).toHaveBeenCalledTimes(1);
  });

  it('DTM’da bitta mutaxassislik yoki majburiy fan qamralmasa bepul tartib', async () => {
    for (const missing of ['dtm-chemistry', 'dtm-history']) {
      mocks.subscriptions.mockResolvedValue([sub('CATEGORY', 'dtm', dtmSubjects.map((s) => s.id).filter((id) => id !== missing))]);
      expect((await dtm()).status).toBe(403);
    }
  });

  it.each(['PREMIUM', 'TEACHER_PLAN', 'BUNDLE'] as const)('%s hozirgidek cheklovsiz', async (plan) => {
    mocks.subscriptions.mockResolvedValue([sub(plan)]);
    expect((await dtm()).status).toBe(200);
    expect(mocks.user).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('faol DTM kategoriya ruxsati ham imtihonni ochadi', async () => {
    mocks.subscriptions.mockResolvedValue([]);
    mocks.permissions.mockResolvedValue([{ categoryId: 'dtm', subjectId: null, isActive: true, expiresAt: null }]);
    expect((await dtm()).status).toBe(200);
  });
});

describe('Bilim xaritasi — faqat so‘ralgan fan bo‘yicha kirish', () => {
  it('boshqa Subject qatoridagi fizika discipline orqali cheklovsiz', async () => {
    const response = await mastery('pool-physics');
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ isFreeTierView: false, strong: [{ subjectId: 'pool-physics' }] });
    expect(mocks.user).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.stats).toHaveBeenCalledExactlyOnceWith('u');
  });

  it('boshqa fan yoki fan ko‘rsatilmagan aralash xarita mavjud bepul tartibda', async () => {
    expect((await mastery('pool-math')).status).toBe(403);
    expect((await mastery()).status).toBe(403);
    expect(mocks.tips).not.toHaveBeenCalled();
  });

  it('30 kundan so‘ng boshqa fan xaritasi to‘liq bepul ko‘rinadi', async () => {
    mocks.user.mockResolvedValue({ masteryMapFreeViewedAt: new Date('2020-01-01') });
    const response = await mastery('pool-math');
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ isFreeTierView: true, strong: [{ subjectId: 'pool-math' }] });
    expect(mocks.update).toHaveBeenCalledTimes(1);
  });

  it('disciplineKey to‘ldirilmagan bo‘lsa yangi obuna cheklovsiz emas', async () => {
    mocks.subjects.mockResolvedValue(allSubjects.map((s) => ({ ...s, disciplineKey: null })));
    expect((await mastery('pool-physics')).status).toBe(403);
  });

  it.each(['PREMIUM', 'TEACHER_PLAN', 'BUNDLE'] as const)('%s fan ko‘rsatilmasa ham cheklovsiz', async (plan) => {
    mocks.subscriptions.mockResolvedValue([sub(plan)]);
    expect((await mastery()).status).toBe(200);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('ma’lumot yo‘q bo‘lsa bepul foydalanish sarflanmaydi', async () => {
    mocks.stats.mockResolvedValue({ stats: [], totalAttempts: 0 });
    expect(await (await mastery('pool-physics')).json()).toEqual({ hasData: false, isFreeTierView: false });
    expect(mocks.subscriptions).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
