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
}

export interface TestAccessContext extends UserEntitlements {
  isAdmin: boolean;
  categoryTypes: ReadonlyMap<string, TestType>;
  purchasedTestIds: ReadonlySet<string>;
}

export function hasAnyActiveSubscription(ent: UserEntitlements): boolean {
  return ent.subscriptions.some((s) => s.isActive && s.endDate >= ent.now);
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

  const active = ent.subscriptions.filter((s) => s.isActive && s.endDate >= ent.now);
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
