import { describe, it, expect } from 'vitest';
import { sanitizeReturnPath, withReturnTo } from '../safe-return-path';

describe('sanitizeReturnPath', () => {
  it('ichki manzilni qabul qiladi', () => {
    expect(sanitizeReturnPath('/courses/abc/learn')).toBe('/courses/abc/learn');
  });

  it('so\'rov parametrli ichki manzilni qabul qiladi', () => {
    expect(sanitizeReturnPath('/courses/abc/learn?lesson=xyz')).toBe('/courses/abc/learn?lesson=xyz');
  });

  it('bo\'sh yoki berilmagan qiymatni rad etadi', () => {
    expect(sanitizeReturnPath(null)).toBeNull();
    expect(sanitizeReturnPath(undefined)).toBeNull();
    expect(sanitizeReturnPath('')).toBeNull();
    expect(sanitizeReturnPath('   ')).toBeNull();
  });

  it('"/" bilan boshlanmagan qiymatni rad etadi', () => {
    expect(sanitizeReturnPath('courses/abc/learn')).toBeNull();
  });

  it('tashqi URL (http/https)ni rad etadi', () => {
    expect(sanitizeReturnPath('https://evil.com')).toBeNull();
    expect(sanitizeReturnPath('http://evil.com/phish')).toBeNull();
  });

  it('protokol-nisbiy URL ("//")ni rad etadi', () => {
    expect(sanitizeReturnPath('//evil.com')).toBeNull();
    expect(sanitizeReturnPath('//evil.com/phish')).toBeNull();
  });

  it('teskari qiya chiziq bilan boshlanadigan qiymatni rad etadi', () => {
    expect(sanitizeReturnPath('/\\evil.com')).toBeNull();
    expect(sanitizeReturnPath('\\\\evil.com')).toBeNull();
    expect(sanitizeReturnPath('\\evil.com')).toBeNull();
  });

  it('boshqa sxemalarni (javascript:, mailto:) rad etadi', () => {
    expect(sanitizeReturnPath('javascript:alert(1)')).toBeNull();
    expect(sanitizeReturnPath('mailto:a@b.com')).toBeNull();
  });

  it('boshida/oxirida bo\'sh joy bo\'lsa qirqib beradi', () => {
    expect(sanitizeReturnPath('  /courses/abc/learn  ')).toBe('/courses/abc/learn');
  });

  it('bo\'sh joydan keyin tashqi URL yashiringan qiymatni rad etadi', () => {
    expect(sanitizeReturnPath('  //evil.com')).toBeNull();
  });
});

describe('withReturnTo', () => {
  it('xavfsiz returnTo bo\'lsa so\'rov parametri sifatida qo\'shadi (kodlangan holda)', () => {
    expect(withReturnTo('/tests/123/solve', '/courses/abc/learn?lesson=xyz')).toBe(
      '/tests/123/solve?returnTo=%2Fcourses%2Fabc%2Flearn%3Flesson%3Dxyz',
    );
  });

  it('returnTo berilmasa path o\'zgarishsiz qaytadi', () => {
    expect(withReturnTo('/tests/123/solve', null)).toBe('/tests/123/solve');
    expect(withReturnTo('/tests/123/solve', undefined)).toBe('/tests/123/solve');
  });

  it('returnTo xavfsiz bo\'lmasa path o\'zgarishsiz qaytadi', () => {
    expect(withReturnTo('/tests/123/solve', 'https://evil.com')).toBe('/tests/123/solve');
    expect(withReturnTo('/tests/123/solve', '//evil.com')).toBe('/tests/123/solve');
  });

  it('path allaqachon "?" ga ega bo\'lsa "&" bilan qo\'shadi', () => {
    expect(withReturnTo('/results/1?foo=bar', '/courses/abc/learn')).toBe(
      '/results/1?foo=bar&returnTo=%2Fcourses%2Fabc%2Flearn',
    );
  });
});
