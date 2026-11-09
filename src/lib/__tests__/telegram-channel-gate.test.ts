import { describe, expect, it } from 'vitest';
import { checkCallbackData, isGatedStart, membershipFromReply, parseCheckCallback } from '../telegram-channel-gate';

describe('membershipFromReply', () => {
  it('a’zo statuslari', () => {
    for (const status of ['creator', 'administrator', 'member']) {
      expect(membershipFromReply({ ok: true, result: { status } })).toBe('member');
    }
    expect(membershipFromReply({ ok: true, result: { status: 'restricted', is_member: true } })).toBe('member');
  });
  it('a’zo emas', () => {
    expect(membershipFromReply({ ok: true, result: { status: 'left' } })).toBe('not_member');
    expect(membershipFromReply({ ok: true, result: { status: 'kicked' } })).toBe('not_member');
    expect(membershipFromReply({ ok: true, result: { status: 'restricted', is_member: false } })).toBe('not_member');
  });
  it('xato yoki tushunarsiz javob — unknown', () => {
    expect(membershipFromReply({ ok: false, description: 'Bad Request: member list is inaccessible' })).toBe('unknown');
    expect(membershipFromReply(null)).toBe('unknown');
    expect(membershipFromReply({ ok: true, result: { status: 'weird' } })).toBe('unknown');
  });
});

describe('isGatedStart', () => {
  it('oddiy, reklama va taklif /start — tekshiriladi', () => {
    for (const param of ['', 'ad_test1', 'ref_ali-ab12cd', 'other']) expect(isGatedStart(param)).toBe(true);
  });
  it('to‘lov va kirish — tekshirilmaydi', () => {
    for (const param of ['login', 'ci_abc', 'buy', 'obuna', 'buy_test_1', 'buy_course_1', 'buy_p_x']) expect(isGatedStart(param)).toBe(false);
  });
});

describe('check_subscription callback', () => {
  it('faqat reklama kodi saqlanadi va 64 baytdan oshmaydi', () => {
    expect(checkCallbackData('')).toBe('check_subscription');
    expect(checkCallbackData('ref_ali-ab12cd')).toBe('check_subscription');
    const longest = checkCallbackData(`ad_${'a'.repeat(32)}`);
    expect(longest.startsWith('check_subscription:ad_')).toBe(true);
    expect(Buffer.byteLength(longest)).toBeLessThanOrEqual(64);
  });
  it('parseCheckCallback', () => {
    expect(parseCheckCallback('check_subscription')).toBe('');
    expect(parseCheckCallback('check_subscription:ad_x')).toBe('ad_x');
    expect(parseCheckCallback('co:list')).toBeNull();
  });
});
