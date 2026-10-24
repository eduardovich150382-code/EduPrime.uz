import { describe, expect, it } from 'vitest';
import type { SubscriptionPlan } from '@prisma/client';
import {
  canAccessByEntitlements, coversAllFeatureScopes, hasAnyScope, inDisciplineScope, inScope,
  type SubscriptionEntitlement, type UserEntitlements,
} from '../entitlements';
import { resolveSolutionTiers } from '../solution-visibility';
import { sessionFeatureScope } from '../feature-context';

const now = new Date('2026-10-24T09:00:00Z');
const future = new Date('2026-11-24T09:00:00Z');
const att = { kind: 'test' as const, categoryId: 'att', subjectId: 'att-physics' };
const dtm = { kind: 'test' as const, categoryId: 'dtm', subjectId: 'dtm-physics' };
const physics = { kind: 'discipline' as const, disciplineKey: 'fizika' };
const subjects = [
  { id: 'att-physics', categoryId: 'att', disciplineKey: 'fizika' },
  { id: 'att-math', categoryId: 'att', disciplineKey: 'matematika' },
  { id: 'dtm-physics', categoryId: 'dtm', disciplineKey: 'fizika' },
];

function sub(plan: SubscriptionPlan = 'CATEGORY', overrides: Partial<SubscriptionEntitlement> = {}): SubscriptionEntitlement {
  return { plan, isActive: true, endDate: future, startDate: now, categoryId: 'att', subjectIds: ['att-physics'], subjectRule: 'ONE', ...overrides };
}
function ent(overrides: Partial<UserEntitlements> = {}): UserEntitlements {
  return { now, subscriptions: [sub()], permissions: [], subjects, ...overrides };
}

describe('funksiya doirasi', () => {
  it('attestatsiya va mustaqil fizika ochiq, DTM yoki matematika yopiq', () => {
    expect(inScope(ent(), att)).toBe(true);
    expect(inScope(ent(), dtm)).toBe(false);
    expect(inScope(ent(), { ...att, subjectId: 'att-math' })).toBe(false);
    expect(inDisciplineScope(ent(), 'fizika')).toBe(true);
    expect(inDisciplineScope(ent(), 'matematika')).toBe(false);
    expect(hasAnyScope(ent())).toBe(true);
  });

  it('CATEGORY NONE kalitlari faqat o‘z kategoriyasidagi fanlardan keladi', () => {
    const ctx = ent({ subscriptions: [sub('CATEGORY', { subjectRule: 'NONE', subjectIds: [] })] });
    expect(inScope(ctx, { ...att, subjectId: 'att-math' })).toBe(true);
    expect(inDisciplineScope(ctx, 'matematika')).toBe(true);
    expect(inDisciplineScope(ctx, 'kimyo')).toBe(false);
    expect(inScope(ctx, dtm)).toBe(false);
  });

  it('DTM_BLOCK saqlangan fanlar va kategoriya bilan tekshiriladi', () => {
    const ctx = ent({ subscriptions: [sub('CATEGORY', { subjectRule: 'DTM_BLOCK', categoryId: 'dtm', subjectIds: ['dtm-physics', 'dtm-math'] })] });
    expect(inScope(ctx, dtm)).toBe(true);
    expect(inScope(ctx, { ...dtm, subjectId: 'dtm-math' })).toBe(true);
    expect(inScope(ctx, { ...dtm, subjectId: 'dtm-biology' })).toBe(false);
    expect(inScope(ctx, att)).toBe(false);
  });

  it('fanli va butun kategoriya ruxsatlari obunaga qo‘shiladi', () => {
    const permission = { categoryId: 'att', subjectId: 'att-math', isActive: true, expiresAt: future };
    const ctx = ent({ permissions: [permission] });
    expect(inDisciplineScope(ctx, 'fizika')).toBe(true);
    expect(inDisciplineScope(ctx, 'matematika')).toBe(true);
    expect(inScope(ctx, dtm)).toBe(false);
    expect(inDisciplineScope(ent({ subscriptions: [], permissions: [{ ...permission, subjectId: null, expiresAt: null }] }), 'fizika')).toBe(true);
  });

  it.each([
    { isActive: false }, { endDate: new Date(now.getTime() - 1) }, { startDate: new Date(now.getTime() + 1) },
  ])('nofaol yoki hali boshlanmagan obuna ochmaydi: %j', (overrides) => {
    const ctx = ent({ subscriptions: [sub('CATEGORY', overrides)] });
    expect(inScope(ctx, att)).toBe(false);
    expect(inDisciplineScope(ctx, 'fizika')).toBe(false);
    expect(hasAnyScope(ctx)).toBe(false);
  });

  it('obuna va ruxsatning muddat chegarasi inclusive qoladi', () => {
    expect(inScope(ent({ subscriptions: [sub('CATEGORY', { endDate: now })] }), att)).toBe(true);
    const permission = { ...att, subjectId: 'att-physics', isActive: true, expiresAt: now };
    expect(inScope(ent({ subscriptions: [], permissions: [permission] }), att)).toBe(true);
    expect(hasAnyScope(ent({ subscriptions: [], permissions: [{ ...permission, expiresAt: new Date(now.getTime() - 1) }] }))).toBe(false);
    expect(hasAnyScope(ent({ subscriptions: [], permissions: [{ ...permission, isActive: false }] }))).toBe(false);
  });

  it('kalitsiz kontentni fan nomi yoki jismoniy id orqali ochmaydi', () => {
    expect(inDisciplineScope(ent(), null)).toBe(false);
    expect(inDisciplineScope(ent({ subjects: subjects.map((s) => ({ ...s, disciplineKey: null })) }), 'fizika')).toBe(false);
    expect(inScope(ent(), att)).toBe(true);
    expect(inScope(ent({ subscriptions: [sub('CATEGORY', { subjectRule: null })] }), att)).toBe(false);
  });

  it('aralash konstruktor barcha fanlar qamralgandagina cheklovsiz', () => {
    expect(coversAllFeatureScopes({ entitlements: ent(), scopes: [physics] })).toBe(true);
    expect(coversAllFeatureScopes({ entitlements: ent(), scopes: [physics, { kind: 'discipline', disciplineKey: 'kimyo' }] })).toBe(false);
    expect(coversAllFeatureScopes({ entitlements: ent(), scopes: [] })).toBe(false);
    expect(coversAllFeatureScopes({ entitlements: ent({ subscriptions: [sub(), sub('CATEGORY', { subjectIds: ['att-math'] })] }), scopes: [physics, { kind: 'discipline', disciplineKey: 'matematika' }] })).toBe(true);
  });

  it.each(['BUNDLE', 'PREMIUM', 'TEACHER_PLAN'] as const)('%s barcha funksiya doirasida cheklovsiz', (plan) => {
    const ctx = ent({ subscriptions: [sub(plan)] });
    expect(inScope(ctx, dtm)).toBe(true);
    expect(inDisciplineScope(ctx, null)).toBe(true);
    expect(hasAnyScope(ctx)).toBe(true);
  });

  it('ADMIN uchun obuna yoki fan metama’lumoti shart emas', () => {
    const ctx = ent({ isAdmin: true, subscriptions: [], subjects: [] });
    expect(inScope(ctx, dtm)).toBe(true);
    expect(inDisciplineScope(ctx, null)).toBe(true);
    expect(hasAnyScope(ctx)).toBe(true);
  });

  it('funksiyalardagi eski umumiy doira O1 test paywall’ini kengaytirmaydi', () => {
    const ctx = { ...ent({ subscriptions: [sub('PREMIUM')] }), isAdmin: false,
      categoryTypes: new Map([['att', 'ATTESTATION' as const]]), purchasedTestIds: new Set<string>() };
    expect(inScope(ctx, att)).toBe(true);
    expect(canAccessByEntitlements({ ...att, id: 't', accessType: 'subscription', isFree: false }, ctx)).toBe(false);
  });
});

describe('yozma/video darajalari — eski va yangi huquqlar', () => {
  it.each([
    [[], false, false], [['PREMIUM'], true, true], [['TEACHER_PLAN'], true, false],
    [['PREMIUM', 'TEACHER_PLAN'], true, true],
  ] as const)('eski %j → yozma=%s video=%s', (plans, writtenUnlimited, videoUnlocked) => {
    const ctx = ent({ subscriptions: plans.map((p) => sub(p)) });
    for (const scope of [att, dtm, physics]) {
      expect(resolveSolutionTiers('USER', ctx, scope)).toEqual({ writtenUnlimited, videoUnlocked });
    }
  });

  it('yangi doirada ikkala yechim ochiladi, boshqa kategoriyada yopiq', () => {
    expect(resolveSolutionTiers('USER', ent(), att)).toEqual({ writtenUnlimited: true, videoUnlocked: true });
    expect(resolveSolutionTiers('USER', ent(), dtm)).toEqual({ writtenUnlimited: false, videoUnlocked: false });
    expect(resolveSolutionTiers('USER', ent(), physics)).toEqual({ writtenUnlimited: true, videoUnlocked: true });
  });

  it('Teacher bilan yangi fan obunasi videoni faqat yangi doirada ochadi', () => {
    const ctx = ent({ subscriptions: [sub(), sub('TEACHER_PLAN')] });
    expect(resolveSolutionTiers('USER', ctx, att).videoUnlocked).toBe(true);
    expect(resolveSolutionTiers('USER', ctx, dtm).videoUnlocked).toBe(false);
  });

  it('sessiya konteksti DTM va konstruktorni ajratadi', () => {
    const subject = subjects[2];
    expect(sessionFeatureScope({}, subject)).toEqual(physics);
    expect(sessionFeatureScope({ sections: [{ subjectId: subject.id }] }, subject)).toEqual(dtm);
  });
});
