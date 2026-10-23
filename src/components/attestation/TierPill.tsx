import type { AttestationTier } from '@/lib/attestation-tiers';

// Ranglar docs palitrasidan: toifa — Attestatsiya sarig'i, Oliy + ustama —
// banner binafshasi (eng yuqori daraja ajralib tursin). Hook'siz: server
// (ReadinessPanel) va client (TestRowList) komponentlari matnni o'zi beradi.
const TIER_PILL: Record<AttestationTier, string> = {
  none: 'bg-gray-100 text-gray-700',
  tier2: 'bg-[#fbbf24] text-[#451a03]',
  tier1: 'bg-[#fbbf24] text-[#451a03]',
  top: 'bg-[#fbbf24] text-[#451a03]',
  topBonus: 'bg-[#2e1065] text-[#fbbf24]',
};

export function TierPill({ tier, label }: { tier: AttestationTier; label: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${TIER_PILL[tier]}`}>
      {label}
    </span>
  );
}
