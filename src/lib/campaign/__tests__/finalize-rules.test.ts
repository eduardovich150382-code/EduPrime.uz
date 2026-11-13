import { describe, expect, it } from 'vitest';
import { canPublishWinners, displayPhase, hasEnded, promoValidUntil, recheckTransition, restoredStatus } from '../finalize-rules';
import { campaignFixture } from './fixtures';

const ended = new Date('2026-11-27T10:00:00Z'); // fixture endsAt = 2026-11-26T18:59Z dan keyin
const active = new Date('2026-11-20T15:00:00Z');

describe('hasEnded', () => {
  it('tugagan va pauzadagi tugagan aksiya — true', () => {
    expect(hasEnded(campaignFixture(), ended)).toBe(true);
    expect(hasEnded(campaignFixture({ isPaused: true }), ended)).toBe(true);
  });
  it('qoralama ham — sinov uchun yakunlash mumkin', () => {
    expect(hasEnded(campaignFixture({ isPublished: false }), ended)).toBe(true);
  });
  it('tugamagan va yakunlangan — false', () => {
    expect(hasEnded(campaignFixture(), active)).toBe(false);
    expect(hasEnded(campaignFixture({ finalizedAt: ended }), ended)).toBe(false);
  });
  it('aynan endsAt da — tugagan', () => {
    const c = campaignFixture();
    expect(hasEnded(c, c.endsAt)).toBe(true);
  });
});

describe('displayPhase va canPublishWinners', () => {
  it('yakunlangan qoralama "Yakunlandi" ko‘rinadi, lekin g‘oliblar posti kanalga chiqmaydi', () => {
    expect(displayPhase('DRAFT', true)).toBe('FINISHED');
    expect(displayPhase('DRAFT', false)).toBe('DRAFT');
    expect(canPublishWinners(campaignFixture({ isPublished: false, finalizedAt: ended }))).toBe(false);
    expect(canPublishWinners(campaignFixture({ finalizedAt: ended }))).toBe(true);
    expect(canPublishWinners(campaignFixture())).toBe(false);
  });
});

describe('recheckTransition', () => {
  const endsAt = campaignFixture().endsAt;
  it('ACTIVE: a’zo — qoladi, a’zo emas — LEFT', () => {
    expect(recheckTransition('ACTIVE', 'member', endsAt, ended)).toEqual({ status: 'ACTIVE', checkedAt: ended });
    expect(recheckTransition('ACTIVE', 'not_member', endsAt, ended)).toEqual({ status: 'LEFT', checkedAt: ended });
  });
  it('LEFT + a’zo → ACTIVE (qayta obuna)', () => {
    expect(recheckTransition('LEFT', 'member', endsAt, ended)).toEqual({ status: 'ACTIVE', checkedAt: ended });
    expect(recheckTransition('LEFT', 'not_member', endsAt, ended)).toEqual({ status: 'LEFT', checkedAt: ended });
  });
  it('PENDING + a’zo → ACTIVE, confirmedAt = endsAt; a’zo emas — PENDING qoladi', () => {
    expect(recheckTransition('PENDING', 'member', endsAt, ended)).toEqual({ status: 'ACTIVE', confirmedAt: endsAt, checkedAt: ended });
    expect(recheckTransition('PENDING', 'not_member', endsAt, ended)).toEqual({ status: 'PENDING', checkedAt: ended });
  });
  it('unknown va INVALID — o‘zgarmaydi', () => {
    expect(recheckTransition('ACTIVE', 'unknown', endsAt, ended)).toBeNull();
    expect(recheckTransition('INVALID', 'member', endsAt, ended)).toBeNull();
  });
});

describe('restoredStatus', () => {
  it('tasdiqlangan → ACTIVE, tasdiqlanmagan → PENDING (ball bermasin)', () => {
    expect(restoredStatus(new Date())).toBe('ACTIVE');
    expect(restoredStatus(null)).toBe('PENDING');
  });
});

describe('promoValidUntil', () => {
  it('Toshkent kunidan N kun keyin 23:59:59 (Toshkent)', () => {
    // 27-noyabr 15:00 Toshkent + 5 kun → 2-dekabr 23:59:59 Toshkent = 18:59:59Z.
    expect(promoValidUntil(new Date('2026-11-27T10:00:00Z'), 5).toISOString()).toBe('2026-12-02T18:59:59.000Z');
  });
  it('Toshkentda yarim tundan keyin, UTC da hali kecha — Toshkent kuni olinadi', () => {
    // 26-noyabr 20:00Z = 27-noyabr 01:00 Toshkent.
    expect(promoValidUntil(new Date('2026-11-26T20:00:00Z'), 5).toISOString()).toBe('2026-12-02T18:59:59.000Z');
  });
});
