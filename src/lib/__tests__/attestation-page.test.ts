import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({ questions: vi.fn(), results: vi.fn(), access: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ db: { question: { findMany: m.questions }, testResult: { findMany: m.results } } }));
vi.mock('@/lib/access', () => ({
  loadTestAccessContext: m.access,
  resolveTestAccess: () => true,
}));
vi.mock('@/lib/topic-bridge', () => ({ resolveTopicNodes: async () => new Map() }));
// Katalog keshi o'zi `public-catalog.test.ts` da — bu yerda tayyor natija.
vi.mock('@/lib/public-catalog', () => ({
  loadAttestationCatalog: async () => ({
    categories: [{ id: 'att', type: 'ATTESTATION' }],
    tests: [{ id: 't1', isMock: true, titleUz: 'Mock 1', titleRu: null, titleEn: null, isFree: true, accessType: 'free',
      price: 0, questionCount: 10, subjectId: 'physics', categoryId: 'att' }],
  }),
  cachedAttestationSettings: async () => ({ date: null, durationMin: null, tiers: { tier2: 60, tier1: 70, top: 80, topBonus: 86 } }),
}));

import { loadAttestationPage } from '../attestation-page';

beforeEach(() => {
  vi.clearAllMocks();
  m.questions.mockResolvedValue([]);
  m.results.mockResolvedValue([]);
  m.access.mockResolvedValue(null);
});

describe('attestatsiya sahifasi', () => {
  it('mehmon: savol teglari so‘ralmaydi — ular faqat shaxsiy readiness uchun', async () => {
    const data = await loadAttestationPage(null, 'uz');
    expect(m.questions).not.toHaveBeenCalled();
    expect(m.results).not.toHaveBeenCalled();
    expect(m.access).not.toHaveBeenCalled();
    expect(data.readiness).toBeNull();
    expect(data.mockRows.map((r) => r.id)).toEqual(['t1']);
  });

  it('kirgan foydalanuvchi: teglar faqat teg va mavzu bilan so‘raladi', async () => {
    const data = await loadAttestationPage({ id: 'u1', role: 'USER' }, 'uz');
    expect(m.questions).toHaveBeenCalledExactlyOnceWith({
      where: { testId: { in: ['t1'] } },
      select: { id: true, testId: true, tags: true, topic: true },
    });
    expect(data.readiness).not.toBeNull();
  });
});
