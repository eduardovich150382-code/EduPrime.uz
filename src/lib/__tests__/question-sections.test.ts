import { describe, expect, it } from 'vitest';
import {
  getQuestionSection,
  groupBySection,
  sectionRange,
  sectionScore,
  setQuestionSection,
} from '../question-sections';

describe('getQuestionSection', () => {
  it("section: tegidan kalitni oladi, boshqa teglarni e'tiborsiz qoldiradi", () => {
    expect(getQuestionSection(['x', 'section:kasb-standarti'])).toBe('kasb-standarti');
  });

  it("noma'lum kalit, teg yo'qligi va massiv bo'lmagan qiymat — null", () => {
    expect(getQuestionSection(['section:kimyo'])).toBeNull();
    expect(getQuestionSection(['fizika'])).toBeNull();
    expect(getQuestionSection([])).toBeNull();
    expect(getQuestionSection(undefined)).toBeNull();
    expect(getQuestionSection('section:fizika')).toBeNull();
  });

  it('ikkita section: tegi bo\'lsa birinchisi olinadi', () => {
    expect(getQuestionSection(['section:pedagogika', 'section:fizika'])).toBe('pedagogika');
  });
});

describe('setQuestionSection', () => {
  it("bo'lim tegini almashtiradi, boshqa teglar o'z tartibida qoladi", () => {
    expect(setQuestionSection(['a', 'section:fizika', 'b'], 'pedagogika')).toEqual(['a', 'b', 'section:pedagogika']);
  });

  it("null — barcha section: teglarini olib tashlaydi", () => {
    expect(setQuestionSection(['section:fizika', 'a', 'section:pedagogika'], null)).toEqual(['a']);
  });
});

const q = (id: string, section?: string, points?: number) => ({
  id,
  tags: section ? [`section:${section}`] : [],
  points,
});

describe('groupBySection', () => {
  it("guruhlar SECTION_KEYS tartibida, ichida kirish tartibi va asl indeks saqlanadi", () => {
    const groups = groupBySection([q('p1', 'pedagogika'), q('f1', 'fizika'), q('f2', 'fizika'), q('k1', 'kasb-standarti')]);
    expect(groups?.map((g) => [g.key, g.items.map((i) => [i.question.id, i.index])])).toEqual([
      ['fizika', [['f1', 1], ['f2', 2]]],
      ['kasb-standarti', [['k1', 3]]],
      ['pedagogika', [['p1', 0]]],
    ]);
  });

  it("bo'sh bo'lim tushib qoladi", () => {
    expect(groupBySection([q('f1', 'fizika')])?.map((g) => g.key)).toEqual(['fizika']);
  });

  it("birorta savolda bo'lim bo'lmasa — butun test uchun null (qisman guruhlash yo'q)", () => {
    expect(groupBySection([q('f1', 'fizika'), q('x')])).toBeNull();
    expect(groupBySection([q('f1', 'fizika'), { id: 'y', tags: ['section:kimyo'] }])).toBeNull();
  });

  it("bo'sh ro'yxat — null", () => {
    expect(groupBySection([])).toBeNull();
  });
});

describe('sectionRange', () => {
  it('uzluksiz indekslar — 1 dan boshlanadigan oraliq', () => {
    expect(sectionRange([0, 1, 2])).toEqual({ from: 1, to: 3 });
    expect(sectionRange([37, 35, 36])).toEqual({ from: 36, to: 38 });
  });

  it("aralashtirilgan (uzilgan) indekslar va bo'sh ro'yxat — null", () => {
    expect(sectionRange([0, 3, 6])).toBeNull();
    expect(sectionRange([])).toBeNull();
  });
});

describe('sectionScore', () => {
  it("to'g'ri javob ballarini yig'adi, points yo'q bo'lsa 1 deb oladi", () => {
    const groups = groupBySection([q('a', 'fizika', 2), q('b', 'fizika'), q('c', 'fizika', 3)])!;
    const answers = [
      { questionId: 'a', isCorrect: true },
      { questionId: 'b', isCorrect: true },
      { questionId: 'c', isCorrect: false },
    ];
    expect(sectionScore(groups[0].items, answers)).toEqual({ score: 3, max: 6 });
  });
});
