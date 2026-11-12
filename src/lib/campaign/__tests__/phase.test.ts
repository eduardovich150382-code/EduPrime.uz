import { describe, expect, it } from 'vitest';
import { campaignPhase, canJoin, type PhaseInput } from '../phase';

const now = new Date('2026-11-20T12:00:00Z');
const base: PhaseInput = {
  isPublished: true, isPaused: false, finalizedAt: null,
  startsAt: new Date('2026-11-15T00:00:00Z'), endsAt: new Date('2026-11-26T18:59:00Z'),
};

describe('campaignPhase', () => {
  it('barcha 6 bosqich', () => {
    expect(campaignPhase({ ...base, isPublished: false }, now)).toBe('DRAFT');
    expect(campaignPhase({ ...base, finalizedAt: now }, now)).toBe('FINISHED');
    expect(campaignPhase({ ...base, isPaused: true }, now)).toBe('PAUSED');
    expect(campaignPhase({ ...base, startsAt: new Date('2026-11-21T00:00:00Z') }, now)).toBe('UPCOMING');
    expect(campaignPhase(base, now)).toBe('ACTIVE');
    expect(campaignPhase({ ...base, endsAt: now }, now)).toBe('FINISHING');
  });
  it('tartib: qoralama har doim DRAFT, yakunlangan to‘xtatilgandan ustun', () => {
    expect(campaignPhase({ ...base, isPublished: false, finalizedAt: now, isPaused: true }, now)).toBe('DRAFT');
    expect(campaignPhase({ ...base, finalizedAt: now, isPaused: true }, now)).toBe('FINISHED');
  });
});

describe('canJoin', () => {
  it('ACTIVE — hamma; DRAFT — faqat admin; boshqa bosqichlar — hech kim', () => {
    expect(canJoin('ACTIVE', false)).toBe(true);
    expect(canJoin('DRAFT', true)).toBe(true);
    expect(canJoin('DRAFT', false)).toBe(false);
    for (const phase of ['PAUSED', 'UPCOMING', 'FINISHING', 'FINISHED'] as const) {
      expect(canJoin(phase, true)).toBe(false);
    }
  });
});
