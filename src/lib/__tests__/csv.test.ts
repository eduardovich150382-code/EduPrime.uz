import { describe, expect, it } from 'vitest';
import { attachmentHeader, buildCsv, csvCell, fileSlug } from '../csv';

describe('csvCell', () => {
  it.each([
    ['oddiy', 'oddiy'],
    ["O'zbekiston", "O'zbekiston"],
    ['Ali; Vali', '"Ali; Vali"'],
    ['Ism "laqab"', '"Ism ""laqab"""'],
    ['bir\nikki', '"bir\nikki"'],
    ['bir\r\nikki', '"bir\r\nikki"'],
    ['=HYPERLINK("x")', `"'=HYPERLINK(""x"")"`],
    ['+998901234567', "'+998901234567"],
    ['-1', "'-1"],
    ['@user', "'@user"],
  ])('%j → %j', (input, expected) => {
    expect(csvCell(input)).toBe(expected);
  });

  it('raqamlar, null va undefined', () => {
    expect(csvCell(42)).toBe('42');
    expect(csvCell(-3)).toBe('-3');
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
  });
});

describe('buildCsv', () => {
  it('UTF-8 BOM, `;` ajratuvchi, CRLF qatorlar', () => {
    const csv = buildCsv([['O\'rin', 'Ism'], [1, 'Ғайрат; "Бек"']]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toBe('﻿O\'rin;Ism\r\n1;"Ғайрат; ""Бек"""\r\n');
  });
});

describe('fileSlug', () => {
  it.each([
    ["O'zbekiston tarixi — 1-variant", 'ozbekiston-tarixi-1-variant'],
    ['Gʻalaba  va  oʻsish!', 'galaba-va-osish'],
    ['Тест по физике', 'test'],
    ['', 'test'],
    ['Résumé Café', 'resume-cafe'],
  ])('%j → %j', (input, expected) => {
    expect(fileSlug(input)).toBe(expected);
  });

  it('uzunlik cheklanadi va oxirida chiziqcha qolmaydi', () => {
    const slug = fileSlug('a '.repeat(100));
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith('-')).toBe(false);
  });
});

describe('attachmentHeader', () => {
  it('ASCII nom va RFC 5987 to‘liq nom', () => {
    expect(attachmentHeader('fizika_best_2026-11-08.csv')).toBe(
      "attachment; filename=\"fizika_best_2026-11-08.csv\"; filename*=UTF-8''fizika_best_2026-11-08.csv",
    );
    expect(attachmentHeader('a"b.csv')).toContain('filename="a_b.csv"');
  });
});
