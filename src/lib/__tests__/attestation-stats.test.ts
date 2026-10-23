import { describe, it, expect } from 'vitest';
import {
  computeProgress,
  computeSectionStats,
  computeTopicStats,
  filterMocks,
  normalizeTopicHead,
  parsePositiveInt,
  parseResultAnswers,
  pickNextMock,
  pickWeakSpot,
  type AnswerEntry,
  type QuestionMeta,
  type SectionStat,
  type TopicStat,
} from '../attestation-stats';

function meta(entries: [string, string | null, string | null][]): Map<string, QuestionMeta> {
  return new Map(
    entries.map(([id, section, topic]) => [id, { tags: section ? [`section:${section}`] : [], topic }]),
  );
}

function answers(spec: [string, boolean][]): AnswerEntry[] {
  return spec.map(([questionId, isCorrect]) => ({ questionId, isCorrect }));
}

describe('parseResultAnswers', () => {
  it("faqat questionId va isCorrect ni oladi, qolganini tashlaydi", () => {
    const parsed = parseResultAnswers([
      { questionId: 'q1', answer: 'A', correctAnswer: 'B', isCorrect: false, timeSpent: 3 },
    ]);
    expect(parsed).toEqual([{ questionId: 'q1', isCorrect: false }]);
  });

  it("buzuq yozuvlarni o'tkazib yuboradi", () => {
    expect(parseResultAnswers(null)).toEqual([]);
    expect(parseResultAnswers({ questionId: 'q1' })).toEqual([]);
    expect(
      parseResultAnswers([null, 'x', { questionId: 1, isCorrect: true }, { questionId: 'q2', isCorrect: 'yes' }, { questionId: 'q3', isCorrect: true }]),
    ).toEqual([{ questionId: 'q3', isCorrect: true }]);
  });
});

describe('normalizeTopicHead', () => {
  it('":" dan oldingi qismni oladi', () => {
    expect(normalizeTopicHead('Mexanika: Kinematika')).toEqual({ key: 'mexanika', label: 'Mexanika' });
  });

  it('":" bo\'lmasa butun matn', () => {
    expect(normalizeTopicHead('Optika')).toEqual({ key: 'optika', label: 'Optika' });
  });

  it("registr, bo'shliq va apostrof turlariga befarq kalit", () => {
    const a = normalizeTopicHead("  Elektr   va magnetizm : Tok");
    const b = normalizeTopicHead('elektr va magnetizm');
    expect(a?.key).toBe(b?.key);
    expect(a?.label).toBe('Elektr va magnetizm');
    expect(normalizeTopicHead("Mo'lekulyar")?.key).toBe(normalizeTopicHead('Moʻlekulyar')?.key);
  });

  it('"Atom fizikasi" yangi nomga tushadi', () => {
    expect(normalizeTopicHead('Atom fizikasi: Fotoeffekt')).toEqual({
      key: 'atom va yadro fizikasi',
      label: 'Atom va yadro fizikasi',
    });
    expect(normalizeTopicHead('Atom va yadro fizikasi')?.key).toBe('atom va yadro fizikasi');
  });

  it("bo'sh qiymatda null", () => {
    expect(normalizeTopicHead(null)).toBeNull();
    expect(normalizeTopicHead('')).toBeNull();
    expect(normalizeTopicHead('   ')).toBeNull();
    expect(normalizeTopicHead(': Kinematika')).toBeNull();
  });
});

describe('computeProgress', () => {
  it("o'rtacha faqat yechilganlarning oxirgi urinishi bo'yicha", () => {
    const latest = new Map([
      ['t1', { percentage: 60 }],
      ['t3', { percentage: 81 }],
    ]);
    expect(computeProgress(['t1', 't2', 't3'], latest)).toEqual({ solved: 2, total: 3, averagePercent: 71 });
  });

  it("yechilgan yo'q bo'lsa o'rtacha null", () => {
    expect(computeProgress(['t1'], new Map())).toEqual({ solved: 0, total: 1, averagePercent: null });
    expect(computeProgress([], new Map())).toEqual({ solved: 0, total: 0, averagePercent: null });
  });
});

describe('pickNextMock', () => {
  const tests = [{ id: 't1' }, { id: 't2' }, { id: 't3' }];

  it("testlar yo'q bo'lsa null", () => {
    expect(pickNextMock([], new Map())).toBeNull();
  });

  it('birinchi yechilmagan test, raqami ro\'yxatdagi o\'rni', () => {
    expect(pickNextMock(tests, new Map([['t1', { percentage: 90 }]]))).toEqual({ kind: 'next', testId: 't2', number: 2 });
    expect(pickNextMock(tests, new Map())).toEqual({ kind: 'next', testId: 't1', number: 1 });
  });

  it('hammasi yechilgan — eng past natija', () => {
    const latest = new Map([
      ['t1', { percentage: 70 }],
      ['t2', { percentage: 40 }],
      ['t3', { percentage: 55 }],
    ]);
    expect(pickNextMock(tests, latest)).toEqual({ kind: 'retakeLowest', testId: 't2', number: 2 });
  });

  it('teng bo\'lsa ro\'yxatda oldingisi', () => {
    const latest = new Map([
      ['t1', { percentage: 80 }],
      ['t2', { percentage: 50 }],
      ['t3', { percentage: 50 }],
    ]);
    expect(pickNextMock(tests, latest)?.testId).toBe('t2');
  });
});

describe('computeSectionStats', () => {
  it("tegli javob yo'q bo'lsa null", () => {
    const m = meta([['q1', null, 'Optika']]);
    expect(computeSectionStats([answers([['q1', true]])], m)).toBeNull();
    expect(computeSectionStats([], m)).toBeNull();
  });

  it('faqat tegli savollar, SECTION_KEYS tartibida', () => {
    const m = meta([
      ['p1', 'pedagogika', null],
      ['f1', 'fizika', null],
      ['f2', 'fizika', null],
      ['x', null, null],
    ]);
    const stats = computeSectionStats(
      [answers([['p1', false], ['f1', true], ['x', true]]), answers([['f2', false], ['unknown', true]])],
      m,
    );
    expect(stats).toEqual([
      { key: 'fizika', correct: 1, total: 2, percent: 50 },
      { key: 'pedagogika', correct: 0, total: 1, percent: 0 },
    ]);
  });
});

describe('computeTopicStats', () => {
  it("faqat fizika bo'limi, head bo'yicha guruhlaydi", () => {
    const m = meta([
      ['a', 'fizika', 'Mexanika: Kinematika'],
      ['b', 'fizika', 'mexanika: Dinamika'],
      ['c', 'fizika', 'Optika'],
      ['d', 'pedagogika', 'Didaktika'],
    ]);
    const stats = computeTopicStats([answers([['a', true], ['b', false], ['c', true], ['d', false]])], m);
    expect(stats).toEqual([
      { key: 'mexanika', label: 'Mexanika', correct: 1, total: 2, percent: 50 },
      { key: 'optika', label: 'Optika', correct: 1, total: 1, percent: 100 },
    ]);
  });

  it("topic'siz ulush 30% dan oshsa null, aynan 30% da hisoblanadi", () => {
    const ids = Array.from({ length: 10 }, (_, i) => `q${i}`);
    const at30 = meta(ids.map((id, i) => [id, 'fizika', i < 3 ? null : 'Optika']));
    expect(computeTopicStats([answers(ids.map((id) => [id, true]))], at30)).not.toBeNull();

    const at40 = meta(ids.map((id, i) => [id, 'fizika', i < 4 ? null : 'Optika']));
    expect(computeTopicStats([answers(ids.map((id) => [id, true]))], at40)).toBeNull();
  });

  it("fizika javobi yo'q bo'lsa null", () => {
    expect(computeTopicStats([answers([['p', true]])], meta([['p', 'pedagogika', 'X']]))).toBeNull();
  });
});

describe('pickWeakSpot', () => {
  const s = (key: SectionStat['key'], percent: number, total: number): SectionStat => ({ key, percent, total, correct: 0 });
  const t = (key: string, percent: number, total: number): TopicStat => ({ key, label: key, percent, total, correct: 0 });

  it("10 dan kam javobli bo'lim hisobga olinmaydi", () => {
    expect(pickWeakSpot([s('fizika', 20, 9)], null)).toBeNull();
    expect(pickWeakSpot(null, null)).toBeNull();
    expect(pickWeakSpot([s('fizika', 20, 9), s('pedagogika', 60, 10)], null)?.section.key).toBe('pedagogika');
  });

  it("eng past bo'lim; teng bo'lsa SECTION_KEYS tartibida oldingisi", () => {
    expect(pickWeakSpot([s('fizika', 70, 35), s('kasb-standarti', 40, 10), s('pedagogika', 40, 10)], null)?.section.key)
      .toBe('kasb-standarti');
  });

  it("fizika bo'lsa eng past mavzu (10+ javobli)", () => {
    const spot = pickWeakSpot([s('fizika', 50, 70), s('pedagogika', 80, 20)], [t('mexanika', 60, 30), t('optika', 10, 5), t('atom', 30, 12)]);
    expect(spot?.section.key).toBe('fizika');
    expect(spot?.topic?.key).toBe('atom');
  });

  it("fizika bo'lmasa yoki mavzular ishonchsiz bo'lsa topic null", () => {
    expect(pickWeakSpot([s('pedagogika', 10, 20)], [t('mexanika', 0, 30)])?.topic).toBeNull();
    expect(pickWeakSpot([s('fizika', 10, 20)], null)?.topic).toBeNull();
  });
});

describe('filterMocks', () => {
  const rows = [{ id: 'a', solved: true }, { id: 'b', solved: false }];
  it('segment filtr', () => {
    expect(filterMocks(rows, 'all')).toHaveLength(2);
    expect(filterMocks(rows, 'solved').map((r) => r.id)).toEqual(['a']);
    expect(filterMocks(rows, 'unsolved').map((r) => r.id)).toEqual(['b']);
  });
});

describe('parsePositiveInt', () => {
  it('musbat butun son', () => {
    expect(parsePositiveInt('120')).toBe(120);
    expect(parsePositiveInt(' 56 ')).toBe(56);
  });

  it("yo'q yoki noto'g'ri qiymatda null — raqam o'ylab topilmaydi", () => {
    for (const v of [undefined, null, '', '0', '-1', '45 daqiqa', '1.5', 'abc', '99999999999999999999']) {
      expect(parsePositiveInt(v)).toBeNull();
    }
  });
});
