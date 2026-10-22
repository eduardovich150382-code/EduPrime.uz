import { describe, expect, it } from 'vitest';
import { buildAttemptHistory, testsHrefForType, type AttemptSummary } from '../result-attempts';

function attempt(id: string, completedAt: string, score = 30): AttemptSummary {
  return { id, score, maxScore: 50, completedAt };
}

describe('buildAttemptHistory', () => {
  it("oxirgi 5 tasini umumiy tartibdagi raqam bilan o'sish tartibida qaytaradi", () => {
    const recent = [
      attempt('r11', '2026-10-11T10:00:00Z'),
      attempt('r10', '2026-10-10T10:00:00Z'),
      attempt('r9', '2026-10-09T10:00:00Z'),
      attempt('r8', '2026-10-08T10:00:00Z'),
      attempt('r7', '2026-10-07T10:00:00Z'),
    ];
    const history = buildAttemptHistory({ total: 11, olderCount: 8, recent });
    expect(history.recent.map((a) => [a.id, a.number])).toEqual([
      ['r7', 7], ['r8', 8], ['r9', 9], ['r10', 10], ['r11', 11],
    ]);
    expect(history.currentNumber).toBe(9);
    expect(history.total).toBe(11);
  });

  it('API tartibiga tayanmaydi', () => {
    const recent = [
      attempt('b', '2026-10-02T10:00:00Z'),
      attempt('c', '2026-10-03T10:00:00Z'),
      attempt('a', '2026-10-01T10:00:00Z'),
    ];
    const history = buildAttemptHistory({ total: 3, olderCount: 0, recent });
    expect(history.recent.map((a) => [a.id, a.number])).toEqual([['a', 1], ['b', 2], ['c', 3]]);
  });

  it("teng completedAt'da id bo'yicha tartiblaydi (API bilan bir xil)", () => {
    const same = '2026-10-01T10:00:00Z';
    const history = buildAttemptHistory({ total: 2, olderCount: 1, recent: [attempt('x2', same), attempt('x1', same)] });
    expect(history.recent.map((a) => [a.id, a.number])).toEqual([['x1', 1], ['x2', 2]]);
  });

  it('birinchi urinish — 1-urinish', () => {
    const history = buildAttemptHistory({ total: 1, olderCount: 0, recent: [attempt('only', '2026-10-01T10:00:00Z')] });
    expect(history.currentNumber).toBe(1);
    expect(history.total).toBe(1);
    expect(history.recent).toEqual([{ ...attempt('only', '2026-10-01T10:00:00Z'), number: 1 }]);
  });

  it("count va findMany mos kelmasa ham raqam 1 dan pastga tushmaydi", () => {
    const history = buildAttemptHistory({
      total: 1,
      olderCount: 0,
      recent: [attempt('a', '2026-10-01T10:00:00Z'), attempt('b', '2026-10-02T10:00:00Z')],
    });
    expect(history.recent.map((a) => a.number)).toEqual([1, 2]);
    expect(history.total).toBe(2);
  });
});

describe('testsHrefForType', () => {
  it("ma'lum tur — filtrlangan /tests", () => {
    expect(testsHrefForType('ATTESTATION')).toBe('/tests?type=ATTESTATION');
    expect(testsHrefForType('DTM')).toBe('/tests?type=DTM');
  });

  it("noma'lum yoki bo'sh tur — /tests", () => {
    expect(testsHrefForType(null)).toBe('/tests');
    expect(testsHrefForType(undefined)).toBe('/tests');
    expect(testsHrefForType('FOO')).toBe('/tests');
  });
});
