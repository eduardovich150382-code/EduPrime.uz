import { describe, expect, it } from 'vitest';
import { getDraftResumeMode, isClockExpired, pickContinueDrafts, readDraftSummary, restoreTestDraft, type DraftSummary } from '../test-draft';

const questions = [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }];
const base = { questionIds: ['q1', 'q2', 'q3'], answers: { 0: 'A', 2: 'C' }, currentQuestion: 2, flagged: [1], questionTimeSpent: { 0: 5 }, autoNext: true, timestamp: 1_000 };

describe('restoreTestDraft — title maydoni', () => {
  it('nomsiz eski qoralama avvalgidek tiklanadi', () => {
    expect(restoreTestDraft(questions, JSON.stringify(base))).toEqual({
      questions, answers: { 0: 'A', 2: 'C' }, current: 2, flagged: [1], questionTimeSpent: { 0: 5 }, autoNext: true,
    });
  });

  it('nomli yangi qoralama ham xuddi shunday tiklanadi', () => {
    const withTitle = restoreTestDraft(questions, JSON.stringify({ ...base, titleUz: 'Mexanika', titleRu: 'Механика', titleEn: null }));
    expect(withTitle).toEqual(restoreTestDraft(questions, JSON.stringify(base)));
  });
});

describe('readDraftSummary', () => {
  it('nom bilan — javob berilganlar (bo\'sh javobsiz) va jami savol', () => {
    expect(readDraftSummary('t1', JSON.stringify({ ...base, answers: { 0: 'A', 1: '', 2: 'C' }, titleUz: 'Mexanika', titleRu: 'Механика' })))
      .toEqual({ testId: 't1', answered: 2, total: 3, timestamp: 1_000, title: { uz: 'Mexanika', ru: 'Механика', en: undefined } });
  });

  it('nomsiz eski qoralama — title yo\'q, qolgani o\'qiladi', () => {
    const summary = readDraftSummary('t1', JSON.stringify(base));
    expect(summary).toMatchObject({ answered: 2, total: 3 });
    expect(summary?.title).toBeUndefined();
  });

  it('questionIds yoki timestamp bo\'lmasa — null', () => {
    expect(readDraftSummary('t1', JSON.stringify({ ...base, questionIds: undefined }))).toBeNull();
    expect(readDraftSummary('t1', JSON.stringify({ ...base, timestamp: undefined }))).toBeNull();
  });

  it('buzilgan JSON va bo\'sh qiymat — null', () => {
    expect(readDraftSummary('t1', '{oops')).toBeNull();
    expect(readDraftSummary('t1', null)).toBeNull();
    expect(readDraftSummary('t1', '"str"')).toBeNull();
  });
});

describe('isClockExpired', () => {
  const now = 10_000;
  it('yurayotgan, deadline o\'tgan — true', () => {
    expect(isClockExpired(JSON.stringify({ deadline: 9_000, remaining: 5, paused: false, total: 60 }), now)).toBe(true);
  });
  it('yurayotgan, deadline hali kelmagan — false', () => {
    expect(isClockExpired(JSON.stringify({ deadline: 11_000, remaining: 1, paused: false, total: 60 }), now)).toBe(false);
  });
  it('to\'xtatilgan, vaqt qolgan — deadline o\'tgan bo\'lsa ham false', () => {
    expect(isClockExpired(JSON.stringify({ deadline: 1_000, remaining: 30, paused: true, total: 60 }), now)).toBe(false);
  });
  it('to\'xtatilgan, vaqt 0 — true', () => {
    expect(isClockExpired(JSON.stringify({ deadline: 1_000, remaining: 0, paused: true, total: 60 }), now)).toBe(true);
  });
  it('yozuv yo\'q yoki buzilgan — false', () => {
    expect(isClockExpired(null, now)).toBe(false);
    expect(isClockExpired('{oops', now)).toBe(false);
  });
});

describe('getDraftResumeMode', () => {
  const now = 10_000;
  const draft = JSON.stringify(base);
  const clock = (extra: Record<string, unknown>) => JSON.stringify({ deadline: 9_000, remaining: 5, paused: false, total: 60, ...extra });

  it('yurayotgan, deadline o\'tgan — expired', () => {
    expect(getDraftResumeMode(draft, clock({}), 60, now)).toBe('expired');
  });
  it('to\'xtatilgan, vaqt 0 — expired', () => {
    expect(getDraftResumeMode(draft, clock({ paused: true, remaining: 0 }), 60, now)).toBe('expired');
  });
  it('deadline hali kelmagan — resume', () => {
    expect(getDraftResumeMode(draft, clock({ deadline: 11_000 }), 60, now)).toBe('resume');
  });
  it('to\'xtatilgan, vaqt qolgan — deadline o\'tgan bo\'lsa ham resume', () => {
    expect(getDraftResumeMode(draft, clock({ paused: true, remaining: 30, deadline: 1_000 }), 60, now)).toBe('resume');
  });
  it('taymersiz eski qoralama — resume', () => {
    expect(getDraftResumeMode(draft, null, 60, now)).toBe('resume');
  });
  it('nomli va nomsiz qoralama — bir xil natija', () => {
    const titled = JSON.stringify({ ...base, titleUz: 'Mexanika', titleRu: 'Механика' });
    expect(getDraftResumeMode(titled, clock({}), 60, now)).toBe('expired');
    expect(getDraftResumeMode(titled, null, 60, now)).toBe('resume');
  });
  it('qoralama yo\'q yoki buzilgan JSON — fresh', () => {
    expect(getDraftResumeMode(null, clock({}), 60, now)).toBe('fresh');
    expect(getDraftResumeMode('{oops', clock({}), 60, now)).toBe('fresh');
    expect(getDraftResumeMode('"str"', clock({}), 60, now)).toBe('fresh');
  });
  it('taymer yozuvi buzilgan — resume (soat to\'liq vaqtdan boshlanadi)', () => {
    expect(getDraftResumeMode(draft, '{oops', 60, now)).toBe('resume');
    expect(getDraftResumeMode(draft, clock({ paused: 'no' }), 60, now)).toBe('resume');
  });
  it('davomiylik o\'zgargan (total mos emas) — resume', () => {
    expect(getDraftResumeMode(draft, clock({ total: 30 }), 60, now)).toBe('resume');
  });
  it('taymersiz test (totalSeconds 0) — resume', () => {
    expect(getDraftResumeMode(draft, clock({ total: 0 }), 0, now)).toBe('resume');
  });
});

describe('pickContinueDrafts', () => {
  const DAY = 24 * 60 * 60 * 1000;
  const now = 100 * DAY;
  const draft = (testId: string, timestamp: number, extra: Partial<DraftSummary> = {}): DraftSummary =>
    ({ testId, answered: 5, total: 10, timestamp, expired: false, ...extra });

  it('eng yangisi birinchi, 3 tagacha', () => {
    const picked = pickContinueDrafts([draft('a', now - 4), draft('b', now - 1), draft('c', now - 3), draft('d', now - 2)], new Map(), now);
    expect(picked.map(d => d.testId)).toEqual(['b', 'd', 'c']);
  });

  it('qoralamadan keyingi natija bo\'lsa yashiriladi, oldingisi bo\'lsa qoladi', () => {
    const results = new Map([
      ['a', { completedAt: new Date(now - 1_000).toISOString() }],
      ['b', { completedAt: new Date(now - 10 * DAY).toISOString() }],
    ]);
    const picked = pickContinueDrafts([draft('a', now - 2_000), draft('b', now - DAY)], results, now);
    expect(picked.map(d => d.testId)).toEqual(['b']);
  });

  it('14 kun chegarasi: 13 kun 23 soat — ko\'rinadi, 14 kun 1 daqiqa — yo\'q', () => {
    const picked = pickContinueDrafts([
      draft('fresh', now - 14 * DAY + 60 * 60 * 1000),
      draft('stale', now - 14 * DAY - 60 * 1000),
    ], new Map(), now);
    expect(picked.map(d => d.testId)).toEqual(['fresh']);
  });

  it('vaqti tugagan va javobsiz qoralamalar yashiriladi', () => {
    const picked = pickContinueDrafts([draft('exp', now - 1, { expired: true }), draft('empty', now - 1, { answered: 0 })], new Map(), now);
    expect(picked).toEqual([]);
  });
});
