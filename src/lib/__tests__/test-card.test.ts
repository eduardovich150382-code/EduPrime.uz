import { describe, expect, it } from 'vitest';
import {
  getCardLinks,
  getCardState,
  getLockBadge,
  isNewTest,
  latestResultByTest,
  type BriefResult,
} from '@/lib/test-card';

function result(over: Partial<BriefResult> = {}): BriefResult {
  return {
    id: 'r1',
    testId: 't1',
    completedAt: '2026-10-01T10:00:00.000Z',
    score: 42,
    maxScore: 50,
    percentage: 84,
    ...over,
  };
}

describe('getCardState', () => {
  it('bepul, natijasiz test — start', () => {
    expect(getCardState({ isFree: true })).toEqual({ kind: 'start' });
    expect(getCardState({ isFree: false, accessType: 'free' })).toEqual({ kind: 'start' });
  });

  it('paid — narx bilan buy', () => {
    expect(getCardState({ isFree: false, accessType: 'paid', price: 15000 })).toEqual({ kind: 'buy', price: 15000 });
    expect(getCardState({ isFree: false, accessType: 'paid' })).toEqual({ kind: 'buy', price: 0 });
  });

  it('obunali testlar — upgrade turi', () => {
    expect(getCardState({ isFree: false, accessType: 'premium' })).toEqual({ kind: 'upgrade', plan: 'premium' });
    expect(getCardState({ isFree: false, accessType: 'teacher' })).toEqual({ kind: 'upgrade', plan: 'teacher' });
    expect(getCardState({ isFree: false, accessType: 'premium_teacher' })).toEqual({ kind: 'upgrade', plan: 'other' });
    expect(getCardState({ isFree: false })).toEqual({ kind: 'upgrade', plan: 'other' });
  });

  it('natija bor — qulflangan testda ham solved (eski xatti-harakat)', () => {
    expect(getCardState({ isFree: false, accessType: 'premium' }, result())).toEqual({
      kind: 'solved',
      resultId: 'r1',
      score: 42,
      maxScore: 50,
      percentage: 84,
    });
  });
});

describe('getCardState — hasAccess', () => {
  it('hasAccess true — qulfli turlarda ham start', () => {
    expect(getCardState({ isFree: false, accessType: 'premium' }, undefined, true)).toEqual({ kind: 'start' });
    expect(getCardState({ isFree: false, accessType: 'premium_teacher' }, undefined, true)).toEqual({ kind: 'start' });
    expect(getCardState({ isFree: false, accessType: 'paid', price: 15000 }, undefined, true)).toEqual({ kind: 'start' });
  });

  it('hasAccess true va natija bor — solved', () => {
    expect(getCardState({ isFree: false, accessType: 'premium' }, result(), true).kind).toBe('solved');
  });

  it("hasAccess false yoki noma'lum — eski qulfli holat", () => {
    for (const access of [false, undefined]) {
      expect(getCardState({ isFree: false, accessType: 'premium' }, undefined, access)).toEqual({ kind: 'upgrade', plan: 'premium' });
      expect(getCardState({ isFree: false, accessType: 'paid', price: 15000 }, undefined, access)).toEqual({ kind: 'buy', price: 15000 });
    }
  });

  it("bepul test hasAccess false bo'lsa ham start", () => {
    expect(getCardState({ isFree: true }, undefined, false)).toEqual({ kind: 'start' });
  });
});

describe('getLockBadge', () => {
  const badge = (accessType: string | undefined, hasAccess?: boolean, price?: number) => {
    const test = { isFree: false, accessType, price };
    return getLockBadge(test, getCardState(test, undefined, hasAccess));
  };

  it("tur bo'yicha belgi", () => {
    expect(badge('premium')).toEqual({ kind: 'premium' });
    expect(badge('premium_teacher')).toEqual({ kind: 'premium' });
    expect(badge('teacher')).toEqual({ kind: 'teacher' });
    expect(badge('paid', undefined, 15000)).toEqual({ kind: 'price', price: 15000 });
  });

  it("noma'lum accessType — belgi yo'q (faqat qulf ikonkasi)", () => {
    expect(badge('something_new')).toBeNull();
    expect(badge(undefined)).toBeNull();
  });

  it("kirish huquqi bor, bepul yoki yechilgan — belgi yo'q", () => {
    expect(badge('premium', true)).toBeNull();
    expect(badge('paid', true, 15000)).toBeNull();
    expect(getLockBadge({ isFree: true }, { kind: 'start' })).toBeNull();
    const test = { isFree: false, accessType: 'premium' };
    expect(getLockBadge(test, getCardState(test, result()))).toBeNull();
  });
});

describe('getCardLinks', () => {
  const solve = '/tests/t1/solve';

  it('start, buy va upgrade — hammasi solve sahifasiga (kirishni o\'sha yer hal qiladi)', () => {
    expect(getCardLinks('t1', { kind: 'start' })).toEqual({ primary: solve });
    expect(getCardLinks('t1', { kind: 'buy', price: 15000 })).toEqual({ primary: solve });
    expect(getCardLinks('t1', { kind: 'upgrade', plan: 'premium' })).toEqual({ primary: solve });
    expect(getCardLinks('t1', { kind: 'upgrade', plan: 'teacher' })).toEqual({ primary: solve });
    expect(getCardLinks('t1', { kind: 'upgrade', plan: 'other' })).toEqual({ primary: solve });
  });

  it('solved — asosiy "Qayta yechish" solve\'ga, ikkinchi darajali natija sahifasiga', () => {
    const state = getCardState({ isFree: true }, result({ id: 'r9' }));
    expect(getCardLinks('t1', state)).toEqual({ primary: solve, secondary: '/results/r9' });
  });

  it('mehmon — har holatda login\'ga, qaytish manzili locale prefiksli solve', () => {
    const uz = { primary: '/login?callbackUrl=%2Ftests%2Ft1%2Fsolve' };
    expect(getCardLinks('t1', { kind: 'start' }, { locale: 'uz' })).toEqual(uz);
    expect(getCardLinks('t1', { kind: 'buy', price: 15000 }, { locale: 'uz' })).toEqual(uz);
    expect(getCardLinks('t1', { kind: 'upgrade', plan: 'premium' }, { locale: 'uz' })).toEqual(uz);
    expect(getCardLinks('t1', { kind: 'start' }, { locale: 'ru' })).toEqual({
      primary: '/login?callbackUrl=%2Fru%2Ftests%2Ft1%2Fsolve',
    });
    expect(getCardLinks('t1', { kind: 'start' }, { locale: 'en' })).toEqual({
      primary: '/login?callbackUrl=%2Fen%2Ftests%2Ft1%2Fsolve',
    });
  });
});

describe('latestResultByTest', () => {
  it('kirish tartibidan qat\'i nazar eng yangi natijani tanlaydi', () => {
    const old = result({ id: 'old', completedAt: '2026-09-01T00:00:00.000Z' });
    const fresh = result({ id: 'new', completedAt: '2026-10-10T00:00:00.000Z' });
    expect(latestResultByTest([fresh, old]).get('t1')?.id).toBe('new');
    expect(latestResultByTest([old, fresh]).get('t1')?.id).toBe('new');
  });

  it('har test alohida', () => {
    const map = latestResultByTest([result({ id: 'a', testId: 't1' }), result({ id: 'b', testId: 't2' })]);
    expect(map.get('t1')?.id).toBe('a');
    expect(map.get('t2')?.id).toBe('b');
    expect(map.size).toBe(2);
  });
});

describe('isNewTest', () => {
  const now = new Date('2026-10-22T12:00:00.000Z');

  it('7 kun ichida — yangi', () => {
    expect(isNewTest('2026-10-16T12:00:00.000Z', now)).toBe(true);
  });

  it('7 kundan eski — yangi emas', () => {
    expect(isNewTest('2026-10-14T12:00:00.000Z', now)).toBe(false);
  });

  it('sana yo\'q yoki buzuq — yangi emas', () => {
    expect(isNewTest(undefined, now)).toBe(false);
    expect(isNewTest('not-a-date', now)).toBe(false);
  });
});
