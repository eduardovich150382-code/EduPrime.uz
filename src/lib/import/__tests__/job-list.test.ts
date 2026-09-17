import { describe, expect, it } from 'vitest';
import { mergeJobs, type JobItem } from '../job-list';

const job = (id: string, drafts = 1): JobItem => ({ id, fileName: `${id}.zip`, createdAt: '2026-09-17T10:00:00Z', drafts });

describe('mergeJobs', () => {
  it('tanlov bo\'lmasa yangi ro\'yxatni qaytaradi', () => {
    const next = [job('b')];
    expect(mergeJobs([job('a')], next, '')).toBe(next);
  });

  it('tanlangan import yangi ro\'yxatda bo\'lsa uni yangi holatda qoldiradi', () => {
    const next = [job('a', 5), job('b')];
    expect(mergeJobs([job('a', 0)], next, 'a')).toEqual(next);
  });

  it('ro\'yxatdan siqib chiqqan tanlovni oxiriga qo\'shadi', () => {
    const old = job('a');
    expect(mergeJobs([old], [job('b'), job('c')], 'a')).toEqual([job('b'), job('c'), old]);
  });

  it('oldingi ro\'yxat bo\'lmasa yangi ro\'yxatni qaytaradi', () => {
    const next = [job('b')];
    expect(mergeJobs(null, next, 'a')).toBe(next);
  });
});
