import { describe, it, expect } from 'vitest';
import {
  classifyAttestationTests,
  computeProgress,
  computeSectionStats,
  computeTopicStats,
  filterMocks,
  normalizeTopicHead,
  parsePositiveInt,
  parseResultAnswers,
  pickHeroTarget,
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
    const stats = computeTopicStats({ mock: [answers([['a', true], ['b', false], ['c', true], ['d', false]])], topic: [] }, m);
    expect(stats).toEqual([
      { key: 'mexanika', label: 'Mexanika', correct: 1, total: 2, percent: 50 },
      { key: 'optika', label: 'Optika', correct: 1, total: 1, percent: 100 },
    ]);
  });

  it("topic'siz ulush 30% dan oshsa null, aynan 30% da hisoblanadi", () => {
    const ids = Array.from({ length: 10 }, (_, i) => `q${i}`);
    const at30 = meta(ids.map((id, i) => [id, 'fizika', i < 3 ? null : 'Optika']));
    expect(computeTopicStats({ mock: [answers(ids.map((id) => [id, true]))], topic: [] }, at30)).not.toBeNull();

    const at40 = meta(ids.map((id, i) => [id, 'fizika', i < 4 ? null : 'Optika']));
    expect(computeTopicStats({ mock: [answers(ids.map((id) => [id, true]))], topic: [] }, at40)).toBeNull();
  });

  it("mavzu testlarining barcha javoblari tegsiz ham fizika deb olinadi", () => {
    const m = meta([
      ['t1', null, 'Mexanika: Dinamika'],
      ['t2', null, 'Optika: Linzalar'],
    ]);
    expect(computeTopicStats({ mock: [], topic: [answers([['t1', false], ['t2', true]])] }, m)).toEqual([
      { key: 'mexanika', label: 'Mexanika', correct: 0, total: 1, percent: 0 },
      { key: 'optika', label: 'Optika', correct: 1, total: 1, percent: 100 },
    ]);
  });

  it("mock'da tegsiz savol fizika hisoblanmaydi, mavzu testida esa hisoblanadi", () => {
    const m = meta([
      ['mx', null, 'Mexanika'],
      ['tx', null, 'Mexanika'],
    ]);
    expect(computeTopicStats({ mock: [answers([['mx', true]])], topic: [] }, m)).toBeNull();
    expect(computeTopicStats({ mock: [], topic: [answers([['tx', true]])] }, m)?.[0].total).toBe(1);
  });

  it("aralash: mock fizikasi + mavzu testlari bitta mavzuda qo'shiladi, 30% chegarasi umumiy", () => {
    const m = meta([
      ['f1', 'fizika', 'Mexanika: Kinematika'],
      ['p1', 'pedagogika', 'Didaktika'],
      ['t1', null, 'mexanika: Dinamika'],
      ['t2', null, null],
    ]);
    const stats = computeTopicStats(
      { mock: [answers([['f1', true], ['p1', false]])], topic: [answers([['t1', true], ['t2', false]])] },
      m,
    );
    // 3 ta fizika javobidan 1 tasi topic'siz (33%) — chegaradan oshadi.
    expect(stats).toBeNull();

    const m2 = new Map(m);
    m2.set('t2', { tags: [], topic: 'Optika' });
    expect(
      computeTopicStats({ mock: [answers([['f1', true], ['p1', false]])], topic: [answers([['t1', true], ['t2', false]])] }, m2),
    ).toEqual([
      { key: 'mexanika', label: 'Mexanika', correct: 2, total: 2, percent: 100 },
      { key: 'optika', label: 'Optika', correct: 0, total: 1, percent: 0 },
    ]);
  });

  it("fizika javobi yo'q bo'lsa null", () => {
    expect(computeTopicStats({ mock: [answers([['p', true]])], topic: [] }, meta([['p', 'pedagogika', 'X']]))).toBeNull();
  });
});

describe('pickWeakSpot', () => {
  const s = (key: SectionStat['key'], percent: number, total: number): SectionStat => ({ key, percent, total, correct: 0 });
  const t = (key: string, percent: number, total: number): TopicStat => ({ key, label: key, percent, total, correct: 0 });

  it("10 dan kam javobli bo'lim hisobga olinmaydi", () => {
    expect(pickWeakSpot([s('fizika', 20, 9)], null)).toBeNull();
    expect(pickWeakSpot(null, null)).toBeNull();
    expect(pickWeakSpot([s('fizika', 20, 9), s('pedagogika', 60, 10)], null)?.section).toBe('pedagogika');
  });

  it("eng past bo'lim; teng bo'lsa SECTION_KEYS tartibida oldingisi", () => {
    expect(pickWeakSpot([s('fizika', 70, 35), s('kasb-standarti', 40, 10), s('pedagogika', 40, 10)], null)?.section)
      .toBe('kasb-standarti');
  });

  it("fizika bo'lsa eng past mavzu (10+ javobli)", () => {
    const spot = pickWeakSpot([s('fizika', 50, 70), s('pedagogika', 80, 20)], [t('mexanika', 60, 30), t('optika', 10, 5), t('atom', 30, 12)]);
    expect(spot?.section).toBe('fizika');
    expect(spot?.topic?.key).toBe('atom');
  });

  it("fizika bo'lmasa yoki mavzular ishonchsiz bo'lsa topic null", () => {
    expect(pickWeakSpot([s('pedagogika', 10, 20)], [t('mexanika', 0, 30)])?.topic).toBeNull();
    expect(pickWeakSpot([s('fizika', 10, 20)], null)?.topic).toBeNull();
  });

  it("mock yo'q (sections null) + ≥10 javobli mavzu — eng past mavzu zaif joy", () => {
    const spot = pickWeakSpot(null, [t('mexanika', 70, 40), t('optika', 35, 12), t('atom', 5, 4)]);
    expect(spot).toEqual({ section: 'fizika', topic: t('optika', 35, 12), percent: 35 });
  });

  it("mock yo'q + hamma mavzu 10 dan kam javobli — null", () => {
    expect(pickWeakSpot(null, [t('mexanika', 10, 9), t('optika', 0, 3)])).toBeNull();
    expect(pickWeakSpot(null, [])).toBeNull();
  });

  it("mock bor — eski tartib: avval bo'lim, mavzular bo'lim o'rnini bosmaydi", () => {
    // Bo'limlarda ≥10 javob yo'q — mavzular yetarli bo'lsa ham null.
    expect(pickWeakSpot([s('fizika', 10, 9)], [t('mexanika', 0, 30)])).toBeNull();
    // Eng past bo'lim pedagogika — mavzu ko'rsatilmaydi, foiz bo'limniki.
    expect(pickWeakSpot([s('fizika', 60, 35), s('pedagogika', 20, 10)], [t('mexanika', 0, 30)])).toEqual({
      section: 'pedagogika',
      topic: null,
      percent: 20,
    });
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

describe('classifyAttestationTests', () => {
  const tests = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
  const tag = (k: string) => [`section:${k}`];

  it("mock yo'q — hamma mavzu testi (tegsiz, qisman tegli, savolsiz)", () => {
    const { mocks, topics } = classifyAttestationTests(tests, [
      { testId: 'a', tags: [] },
      { testId: 'b', tags: tag('fizika') },
      { testId: 'b', tags: [] },
      { testId: 'c', tags: ['boshqa'] },
    ]);
    expect(mocks).toEqual([]);
    expect(topics.map((t) => t.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it("faqat mock — barcha savollarda section: tegi", () => {
    const { mocks, topics } = classifyAttestationTests(tests.slice(0, 2), [
      { testId: 'a', tags: tag('fizika') },
      { testId: 'a', tags: tag('pedagogika') },
      { testId: 'b', tags: tag('kasb-standarti') },
    ]);
    expect(mocks.map((t) => t.id)).toEqual(['a', 'b']);
    expect(topics).toEqual([]);
  });

  it("aralash — kirish tartibi saqlanadi, noma'lum section kaliti mock emas", () => {
    const { mocks, topics } = classifyAttestationTests(tests, [
      { testId: 'a', tags: [] },
      { testId: 'b', tags: tag('fizika') },
      { testId: 'c', tags: tag('nomalum') },
      { testId: 'd', tags: tag('pedagogika') },
    ]);
    expect(mocks.map((t) => t.id)).toEqual(['b', 'd']);
    expect(topics.map((t) => t.id)).toEqual(['a', 'c']);
  });
});

describe('pickHeroTarget', () => {
  const mocks = [{ id: 'm1' }, { id: 'm2' }];
  const topics = [{ id: 't1' }, { id: 't2' }];

  it("hech narsa yo'q bo'lsa null", () => {
    expect(pickHeroTarget([], [], new Map())).toBeNull();
  });

  it('faqat mock — raqamli', () => {
    expect(pickHeroTarget(mocks, [], new Map([['m1', { percentage: 50 }]]))).toEqual({ kind: 'mockNext', testId: 'm2', number: 2 });
    expect(
      pickHeroTarget(mocks, [], new Map([['m1', { percentage: 50 }], ['m2', { percentage: 30 }]])),
    ).toEqual({ kind: 'mockRetake', testId: 'm2', number: 2 });
  });

  it("mock yo'q — mavzu testlari, raqamsiz", () => {
    expect(pickHeroTarget([], topics, new Map([['t1', { percentage: 90 }]]))).toEqual({ kind: 'topicStart', testId: 't2', number: null });
    expect(
      pickHeroTarget([], topics, new Map([['t1', { percentage: 20 }], ['t2', { percentage: 80 }]])),
    ).toEqual({ kind: 'topicRetake', testId: 't1', number: null });
  });

  it("aralash — mavzu testlari yechilmagan bo'lsa ham mock ustida", () => {
    const latest = new Map([['m1', { percentage: 70 }], ['m2', { percentage: 40 }]]);
    expect(pickHeroTarget(mocks, topics, latest)).toEqual({ kind: 'mockRetake', testId: 'm2', number: 2 });
  });
});
