import { describe, expect, it } from 'vitest';
import { getCleanPath, isProtectedPath } from '@/lib/protected-paths';

describe('isProtectedPath', () => {
  it('/tests ro\'yxati — har tilda va filtr bilan ochiq', () => {
    for (const path of ['/tests', '/tests/', '/tests?type=ATTESTATION', '/ru/tests', '/en/tests?q=fizika', '/uz/tests']) {
      expect(isProtectedPath(path), path).toBe(false);
    }
  });

  it('/tests ichidagi har bir yo\'l (solve va boshqalar) yopiq', () => {
    for (const path of ['/tests/abc/solve', '/ru/tests/abc/solve', '/en/tests/abc/solve', '/tests/abc', '/tests/abc/solve?returnTo=%2Fcourses']) {
      expect(isProtectedPath(path), path).toBe(true);
    }
  });

  it('qolgan himoyalangan bo\'limlar avvalgidek yopiq', () => {
    for (const path of ['/dashboard', '/ru/results/r1', '/courses', '/rating', '/profile', '/teacher/tests', '/admin']) {
      expect(isProtectedPath(path), path).toBe(true);
    }
  });

  it('ochiq sahifalar ochiq qoladi', () => {
    for (const path of ['/', '/ru', '/login', '/attestation', '/ru/attestation', '/share/x', '/certificate/x', '/pricing', '/ru/pricing', '/en/pricing?goal=ATTESTATION']) {
      expect(isProtectedPath(path), path).toBe(false);
    }
  });
});

describe('getCleanPath', () => {
  it('locale prefiksi va query olib tashlanadi', () => {
    expect(getCleanPath('/ru/tests')).toBe('/tests');
    expect(getCleanPath('/en')).toBe('/');
    expect(getCleanPath('/tests?type=DTM')).toBe('/tests');
    expect(getCleanPath('/login')).toBe('/login');
  });
});
