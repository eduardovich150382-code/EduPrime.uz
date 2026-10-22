import { describe, expect, it } from 'vitest';
import {
  buildQuery,
  buildTestsApiQuery,
  DEFAULT_FILTERS,
  isTypingTarget,
  MAX_QUERY_LENGTH,
  parseFilters,
  TEST_GOALS,
} from '../tests-filters';

const parse = (query: string) => parseFilters(new URLSearchParams(query));

describe('parseFilters', () => {
  it("bo'sh URL — standart filtr (Hammasi, yangilari)", () => {
    expect(parse('')).toEqual(DEFAULT_FILTERS);
  });

  it("menyudagi ATTESTATION_HREF ('?type=ATTESTATION') attestatsiyani tanlaydi", () => {
    expect(parse('type=ATTESTATION')).toEqual({ ...DEFAULT_FILTERS, type: 'ATTESTATION' });
  });

  it('barcha TEST_GOALS qiymatlari qabul qilinadi', () => {
    for (const goal of TEST_GOALS) {
      expect(parse(`type=${goal}`).type).toBe(goal);
    }
  });

  it("noma'lum yoki kichik harfli type — Hammasi", () => {
    expect(parse('type=OLYMPIAD').type).toBeNull();
    expect(parse('type=dtm').type).toBeNull();
  });

  it('subject faqat type bilan birga saqlanadi', () => {
    expect(parse('type=DTM&subject=abc').subject).toBe('abc');
    expect(parse('subject=abc').subject).toBeNull();
    expect(parse('type=BAD&subject=abc').subject).toBeNull();
    expect(parse('type=DTM&subject=%20%20').subject).toBeNull();
  });

  it("q trim qilinadi va uzunligi cheklanadi", () => {
    expect(parse('q=%20%20fizika%20').q).toBe('fizika');
    expect(parse(`q=${'a'.repeat(MAX_QUERY_LENGTH + 20)}`).q).toHaveLength(MAX_QUERY_LENGTH);
  });

  it("sort faqat 'popular' yoki standart 'newest'", () => {
    expect(parse('sort=popular').sort).toBe('popular');
    expect(parse('sort=hardest').sort).toBe('newest');
    expect(parse('sort=easiest').sort).toBe('newest');
  });
});

describe('buildQuery', () => {
  it("standart filtr uchun bo'sh satr — /tests toza qoladi", () => {
    expect(buildQuery(DEFAULT_FILTERS)).toBe('');
  });

  it('standart qiymatlarni yozmaydi', () => {
    expect(buildQuery({ ...DEFAULT_FILTERS, type: 'ATTESTATION' })).toBe('?type=ATTESTATION');
  });

  it("type bo'lmasa subject yozilmaydi", () => {
    expect(buildQuery({ ...DEFAULT_FILTERS, subject: 'abc' })).toBe('');
  });

  it("maxsus belgilar va kirillni kodlaydi", () => {
    const query = buildQuery({ ...DEFAULT_FILTERS, q: 'физика & a=b?' });
    expect(new URLSearchParams(query.slice(1)).get('q')).toBe('физика & a=b?');
    expect(query).not.toContain('&a=b');
  });

  it("parseFilters bilan aylanma (round-trip) mos keladi", () => {
    const cases = [
      DEFAULT_FILTERS,
      { type: 'DTM' as const, subject: 'subj1', q: 'kvadrat tenglama', sort: 'popular' as const },
      { type: 'SAT' as const, subject: null, q: '', sort: 'newest' as const },
      { type: null, subject: null, q: "o'zbek tili", sort: 'popular' as const },
    ];
    for (const filters of cases) {
      expect(parse(buildQuery(filters).replace(/^\?/, ''))).toEqual(filters);
    }
  });
});

describe('buildTestsApiQuery', () => {
  it('Hammasi — type/subject yuborilmaydi, sahifalash doim bor', () => {
    expect(buildTestsApiQuery(DEFAULT_FILTERS, 1, 24)).toBe('page=1&limit=24');
  });

  it('barcha filtrlarni yuboradi', () => {
    const params = new URLSearchParams(
      buildTestsApiQuery({ type: 'DTM', subject: 's1', q: ' fizika ', sort: 'popular' }, 3, 24),
    );
    expect(Object.fromEntries(params)).toEqual({
      type: 'DTM',
      subject: 's1',
      q: 'fizika',
      sort: 'popular',
      page: '3',
      limit: '24',
    });
  });

  it("type'siz subject yuborilmaydi", () => {
    expect(buildTestsApiQuery({ ...DEFAULT_FILTERS, subject: 's1' }, 1, 24)).not.toContain('subject');
  });
});

describe('isTypingTarget', () => {
  it('yozish maydonlarini taniydi', () => {
    expect(isTypingTarget({ tagName: 'INPUT' })).toBe(true);
    expect(isTypingTarget({ tagName: 'textarea' })).toBe(true);
    expect(isTypingTarget({ tagName: 'SELECT' })).toBe(true);
    expect(isTypingTarget({ tagName: 'DIV', isContentEditable: true })).toBe(true);
  });

  it('oddiy elementlar va null — yozish emas', () => {
    expect(isTypingTarget({ tagName: 'BODY' })).toBe(false);
    expect(isTypingTarget({ tagName: 'BUTTON' })).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
    expect(isTypingTarget(undefined)).toBe(false);
  });
});
