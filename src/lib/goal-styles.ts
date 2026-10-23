import type { TestGoal } from './tests-filters';

// Ranglar docs/design/testlar-ui.md jadvalidan — Tailwind palitrasida aynan
// shu juftliklar yo'q, shuning uchun inline style.
export const GOAL_STYLES: Record<TestGoal, { color: string; background: string }> = {
  ATTESTATION: { color: '#92400e', background: '#fef3c7' },
  CERTIFICATE: { color: '#1e40af', background: '#dbeafe' },
  DTM: { color: '#9a3412', background: '#ffedd5' },
  SCHOOL: { color: '#115e59', background: '#ccfbf1' },
  PRESIDENT_SCHOOL: { color: '#3730a3', background: '#e0e7ff' },
  SAT: { color: '#334155', background: '#e2e8f0' },
  GRE: { color: '#155e75', background: '#cffafe' },
};
