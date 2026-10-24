import type { FeatureScope, ScopeSubject } from './entitlements';

export const scopeSubjectSelect = { id: true, categoryId: true, disciplineKey: true } as const;

export function testFeatureScope(test: { categoryId: string; subjectId: string }): FeatureScope {
  return { kind: 'test', categoryId: test.categoryId, subjectId: test.subjectId };
}

// DTM yechimlarini discipline orqali ochish attestatsiya huquqini DTM'ga yoyadi.
export function sessionFeatureScope(spec: unknown, subject: ScopeSubject | undefined): FeatureScope {
  const sections = spec && typeof spec === 'object' && 'sections' in spec ? spec.sections : null;
  if (Array.isArray(sections) && sections.length) {
    return { kind: 'test', categoryId: subject?.categoryId ?? '', subjectId: subject?.id ?? '' };
  }
  return { kind: 'discipline', disciplineKey: subject?.disciplineKey ?? null };
}

export function wasBuiltQuotaCharged(spec: unknown): boolean | undefined {
  if (!spec || typeof spec !== 'object' || !('builtQuotaCharged' in spec)) return undefined;
  return typeof spec.builtQuotaCharged === 'boolean' ? spec.builtQuotaCharged : undefined;
}
