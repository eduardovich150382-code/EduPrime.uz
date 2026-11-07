import { describe, expect, it } from 'vitest';
import { initialStatusFilter } from '../payment-labels';

describe('initialStatusFilter (?status= dan boshlang\'ich filtr)', () => {
  it.each([
    ['PENDING', 'PENDING'],
    ['CONFIRMED', 'CONFIRMED'],
    ['REJECTED', 'REJECTED'],
    [null, ''],
    ['', ''],
    ['pending', ''],
    ["PENDING' OR 1=1", ''],
  ])('%s → %s', (value, expected) => {
    expect(initialStatusFilter(value)).toBe(expected);
  });
});
