import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({ rows: vi.fn() }));
vi.mock('../db', () => ({ db: { $queryRaw: m.rows } }));
import { loadTestRating, minutesSeconds, parseRatingMode, tashkentDateTime, testRatingSql, type RatingRow } from '../test-rating';

const flat = (sql: { text: string }) => sql.text.replace(/\s+/g, ' ');

beforeEach(() => { m.rows.mockReset(); });

describe('testRatingSql', () => {
  it('best: ball ↓, vaqt ↑, sana ↑; faqat shu testId, adminlarsiz', () => {
    const sql = testRatingSql({ testId: 't1', mode: 'best', limit: 50, offset: 100 });
    const text = flat(sql);
    expect(text).toContain('PARTITION BY r."userId" ORDER BY r."score" DESC, r."timeSpent" ASC, r."completedAt" ASC, r."id" ASC');
    expect(text).toContain('WHERE r."testId" = $1 AND u."role" <> \'ADMIN\'');
    expect(text).toContain('ORDER BY p."score" DESC, p."timeSpent" ASC, p."completedAt" ASC, p."userId" ASC');
    expect(text).toContain('LIMIT $2 OFFSET $3');
    expect(sql.values).toEqual(['t1', 50, 100]);
  });

  it('first: eng birinchi natija (completedAt ↑)', () => {
    const text = flat(testRatingSql({ testId: 't1', mode: 'first', limit: 50, offset: 0 }));
    expect(text).toContain('PARTITION BY r."userId" ORDER BY r."completedAt" ASC, r."id" ASC)');
    expect(text).not.toContain('r."score" DESC, r."timeSpent"');
  });

  it('eksport: LIMIT yo‘q, faqat testId parametri', () => {
    const sql = testRatingSql({ testId: 't1', mode: 'best', limit: null, offset: 0 });
    expect(flat(sql)).not.toContain('LIMIT');
    expect(sql.values).toEqual(['t1']);
  });

  it('mode faqat ikki qiymat: noma’lum → best', () => {
    expect(parseRatingMode('first')).toBe('first');
    expect(parseRatingMode('best')).toBe('best');
    expect(parseRatingMode(null)).toBe('best');
    expect(parseRatingMode("first'; DROP TABLE x")).toBe('best');
  });
});

const row = (over: Partial<RatingRow> = {}): RatingRow => ({
  rank: 1, userId: 'u1', name: 'A', telegramUsername: null, email: null, score: 10, maxScore: 20, percentage: 50,
  timeSpent: 100, completedAt: new Date('2026-11-08T10:00:00Z'), attemptsCount: 2,
  participants: 120, attemptsTotal: 300, avgPercentage: 61.234, maxPercentage: 98.76, ...over,
});

describe('loadTestRating', () => {
  it('umumiy ko‘rsatkichlar birinchi qatordan, bitta so‘rov', async () => {
    m.rows.mockResolvedValue([row(), row({ rank: 2, userId: 'u2' })]);
    const res = await loadTestRating('t1', 'best', 2, 50);
    expect(m.rows).toHaveBeenCalledTimes(1);
    expect(m.rows.mock.calls[0][0].values).toEqual(['t1', 50, 50]);
    expect(res.summary).toEqual({ participants: 120, attemptsTotal: 300, avgPercentage: 61.2, maxPercentage: 98.8 });
  });

  it('natijalardan tashqari sahifa: kartalar uchun bitta qatorli ikkinchi so‘rov', async () => {
    m.rows.mockResolvedValueOnce([]).mockResolvedValueOnce([row()]);
    const res = await loadTestRating('t1', 'first', 9, 50);
    expect(res.rows).toEqual([]);
    expect(m.rows.mock.calls[1][0].values).toEqual(['t1', 1, 0]);
    expect(res.summary.participants).toBe(120);
  });

  it('hech kim ishlamagan: bo‘sh va nol', async () => {
    m.rows.mockResolvedValue([]);
    const res = await loadTestRating('t1', 'best', 1, 50);
    expect(m.rows).toHaveBeenCalledTimes(1);
    expect(res.summary).toEqual({ participants: 0, attemptsTotal: 0, avgPercentage: 0, maxPercentage: 0 });
  });
});

describe('formatlash', () => {
  it('Toshkent sanasi va daq:son', () => {
    expect(tashkentDateTime(new Date('2026-11-08T19:30:00Z'))).toBe('2026-11-09 00:30');
    expect(minutesSeconds(754)).toBe('12:34');
    expect(minutesSeconds(5)).toBe('0:05');
    expect(minutesSeconds(3725)).toBe('62:05');
  });
});
