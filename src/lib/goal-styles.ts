import type { TestGoal } from './tests-filters';

// Ranglar docs/design/testlar-ui.md jadvalidan — Tailwind palitrasida aynan
// shu juftliklar yo'q, shuning uchun inline style. Kartalar yonma-yon turadi:
// fon tuslari bir-biridan kamida 30° farq qiladi (goal-styles.test.ts).
export const GOAL_STYLES: Record<TestGoal, { color: string; background: string }> = {
  ATTESTATION: { color: '#92400e', background: '#fef3c7' },
  CERTIFICATE: { color: '#1e40af', background: '#dbeafe' },
  DTM: { color: '#9f1239', background: '#ffe4e6' },
  SCHOOL: { color: '#115e59', background: '#ccfbf1' },
  PRESIDENT_SCHOOL: { color: '#86198f', background: '#fae8ff' },
  SAT: { color: '#334155', background: '#e2e8f0' },
  GRE: { color: '#3f6212', background: '#ecfccb' },
};

export interface SubscriptionStyle {
  color: string;
  background: string;
  // Kartochka ramkasi va popover nuqtasi; maqsadlarda matn rangi bilan bir xil.
  border: string;
}

// BUNDLE barcha yo'nalishni ochadi — hech bir maqsad rangiga o'xshamasin.
// docs/design/testlar-ui.md kartalarda gradientni taqiqlaydi, shuning uchun
// "oltin" — yaxlit to'q sariq fon va qalin ramka.
export const BUNDLE_STYLE: SubscriptionStyle = { color: '#78350f', background: '#fde68a', border: '#d97706' };
// Eski tarif endi sotilmaydi — e'tibor tortmaydigan neytral rang.
export const LEGACY_STYLE: SubscriptionStyle = { color: '#374151', background: '#f3f4f6', border: '#9ca3af' };

export function subscriptionStyle(s: { plan: string; goal: string | null; isLegacy: boolean }): SubscriptionStyle {
  if (s.isLegacy) return LEGACY_STYLE;
  if (s.plan === 'BUNDLE') return BUNDLE_STYLE;
  const goal = s.goal && s.goal in GOAL_STYLES ? GOAL_STYLES[s.goal as TestGoal] : null;
  return goal ? { ...goal, border: goal.color } : LEGACY_STYLE;
}

export type ExpiryState = 'ok' | 'soon' | 'urgent' | 'expired';

/** >7 kun — ok, 4–7 — soon, 0–3 — urgent, manfiy — expired. */
export function expiryState(days: number): ExpiryState {
  return days < 0 ? 'expired' : days <= 3 ? 'urgent' : days <= 7 ? 'soon' : 'ok';
}

// Rang yolg'iz emas — pill matni ham holatni aytadi ("3 kun qoldi", "Tugagan").
export const EXPIRY_PILL_STYLES: Record<ExpiryState, { color: string; background: string }> = {
  ok: { color: '#166534', background: '#dcfce7' },
  soon: { color: '#1e40af', background: '#dbeafe' },
  urgent: { color: '#9a3412', background: '#ffedd5' },
  expired: { color: '#991b1b', background: '#fee2e2' },
};
