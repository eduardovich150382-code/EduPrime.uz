import type { SubjectRule, SubscriptionPlan, TestType } from '@prisma/client';

export interface TestAccessInfo {
  id: string;
  categoryId: string;
  subjectId: string;
  isFree: boolean;
  accessType: string;
}

export interface SubscriptionEntitlement {
  plan: SubscriptionPlan;
  categoryId: string | null;
  subjectIds: readonly string[];
  subjectRule: SubjectRule | null;
  isActive: boolean;
  endDate: Date;
  startDate?: Date;
}

export interface PermissionEntitlement {
  categoryId: string;
  subjectId: string | null;
  isActive: boolean;
  expiresAt: Date | null;
}

export interface UserEntitlements {
  now: Date;
  subscriptions: readonly SubscriptionEntitlement[];
  permissions: readonly PermissionEntitlement[];
  isAdmin?: boolean;
  subjects?: readonly ScopeSubject[];
}

export interface ScopeSubject {
  id: string;
  categoryId: string;
  disciplineKey: string | null;
}

export type FeatureScope =
  | { kind: 'test'; categoryId: string; subjectId: string }
  | { kind: 'discipline'; disciplineKey: string | null };

export interface FeatureQuotaContext {
  entitlements: UserEntitlements;
  scopes: readonly FeatureScope[];
}

export function isActiveEntitlement(s: SubscriptionEntitlement, now: Date): boolean {
  return s.isActive && s.endDate >= now
    && (s.plan === 'PREMIUM' || s.plan === 'TEACHER_PLAN' || !s.startDate || s.startDate <= now);
}

export function hasLegacyPlan(ent: UserEntitlements, plan: 'PREMIUM' | 'TEACHER_PLAN'): boolean {
  return ent.subscriptions.some((s) => s.plan === plan && isActiveEntitlement(s, ent.now));
}

export function hasBundle(ent: UserEntitlements): boolean {
  return ent.subscriptions.some((s) => s.plan === 'BUNDLE' && isActiveEntitlement(s, ent.now));
}

export function hasGlobalFeatureScope(ent: UserEntitlements): boolean {
  return !!ent.isAdmin || hasBundle(ent) || hasLegacyPlan(ent, 'PREMIUM') || hasLegacyPlan(ent, 'TEACHER_PLAN');
}

function activePermission(p: PermissionEntitlement, now: Date): boolean {
  return p.isActive && (p.expiresAt === null || p.expiresAt >= now);
}

// Eski tariflarning umumiy funksiya huquqi test paywall'iga ko'chirilmaydi:
// canAccessByEntitlements eski accessType qoidalarini alohida saqlaydi.
export function inScope(ent: UserEntitlements, scope: { categoryId: string; subjectId: string }): boolean {
  if (hasGlobalFeatureScope(ent)) return true;
  if (!scope.categoryId || !scope.subjectId) return false;
  return ent.subscriptions.some((s) => isActiveEntitlement(s, ent.now) && s.plan === 'CATEGORY'
    && s.categoryId === scope.categoryId && (s.subjectRule === 'NONE'
      || ((s.subjectRule === 'ONE' || s.subjectRule === 'DTM_BLOCK') && s.subjectIds.includes(scope.subjectId))))
    || ent.permissions.some((p) => activePermission(p, ent.now) && p.categoryId === scope.categoryId
      && (p.subjectId === null || p.subjectId === scope.subjectId));
}

export function hasAnyScope(ent: UserEntitlements): boolean {
  return hasGlobalFeatureScope(ent)
    || ent.subscriptions.some((s) => isActiveEntitlement(s, ent.now) && s.plan === 'CATEGORY' && !!s.categoryId
      && (s.subjectRule === 'NONE' || ((s.subjectRule === 'ONE' || s.subjectRule === 'DTM_BLOCK') && s.subjectIds.length > 0)))
    || ent.permissions.some((p) => activePermission(p, ent.now) && !!p.categoryId);
}

export function inDisciplineScope(ent: UserEntitlements, disciplineKey: string | null): boolean {
  if (hasGlobalFeatureScope(ent)) return true;
  if (!disciplineKey) return false;
  return (ent.subjects ?? []).some((s) => s.disciplineKey === disciplineKey
    && inScope(ent, { categoryId: s.categoryId, subjectId: s.id }));
}

export function coversFeatureScope(ent: UserEntitlements, scope: FeatureScope): boolean {
  return scope.kind === 'test' ? inScope(ent, scope) : inDisciplineScope(ent, scope.disciplineKey);
}

export function coversAllFeatureScopes(context: FeatureQuotaContext): boolean {
  return hasGlobalFeatureScope(context.entitlements)
    || (context.scopes.length > 0 && context.scopes.every((scope) => coversFeatureScope(context.entitlements, scope)));
}

export function withoutLegacyPlans(ent: UserEntitlements): UserEntitlements {
  return { ...ent, subscriptions: ent.subscriptions.filter((s) => s.plan !== 'PREMIUM' && s.plan !== 'TEACHER_PLAN') };
}

export interface TestAccessContext extends UserEntitlements {
  isAdmin: boolean;
  categoryTypes: ReadonlyMap<string, TestType>;
  purchasedTestIds: ReadonlySet<string>;
}

export function hasAnyActiveSubscription(ent: UserEntitlements): boolean {
  return ent.subscriptions.some((s) => isActiveEntitlement(s, ent.now));
}

export function isFreeTest(test: TestAccessInfo): boolean {
  return test.isFree || test.accessType === 'free';
}

// Qaror faqat berilgan ma'lumotdan olinadi; vaqt ham kontekstga kiritilgan,
// shunda ro'yxat va alohida tekshiruvda muddat chegarasi bir xil ishlaydi.
export function canAccessByEntitlements(test: TestAccessInfo, ent: TestAccessContext | null): boolean {
  if (isFreeTest(test)) return true;
  if (!ent) return false;
  if (ent.isAdmin) return true;

  const active = ent.subscriptions.filter((s) => isActiveEntitlement(s, ent.now));
  if (active.some((s) => s.plan === 'BUNDLE')) return true;
  if (active.some((s) => s.plan === 'CATEGORY' && s.categoryId === test.categoryId && (
    s.subjectRule === 'NONE' || (
      (s.subjectRule === 'ONE' || s.subjectRule === 'DTM_BLOCK') && s.subjectIds.includes(test.subjectId)
    )
  ))) return true;

  if (ent.permissions.some((p) => p.isActive && (p.expiresAt === null || p.expiresAt >= ent.now)
    && p.categoryId === test.categoryId && (p.subjectId === null || p.subjectId === test.subjectId))) return true;

  const premium = active.some((s) => s.plan === 'PREMIUM');
  const teacher = active.some((s) => s.plan === 'TEACHER_PLAN');
  // Eski accessType'larda oldingi huquqlar saqlanadi; kategoriya cheklovi
  // faqat yangi subscription turiga tegishli.
  if (test.accessType === 'premium' && premium) return true;
  if (test.accessType === 'teacher' && teacher) return true;
  if (test.accessType === 'premium_teacher' && (premium || teacher)) return true;
  if (test.accessType === 'subscription') {
    const categoryType = ent.categoryTypes.get(test.categoryId);
    if (categoryType === 'ATTESTATION') return teacher;
    // Kategoriya topilmasa eski Premium bilan tasodifan ochilib ketmasin.
    return categoryType !== undefined && premium;
  }
  return test.accessType === 'paid' && ent.purchasedTestIds.has(test.id);
}
