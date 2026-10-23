import 'server-only';
import { db } from './db';
import { parsePositiveInt } from './attestation-stats';
import {
  ATTESTATION_DATE_KEY,
  ATTESTATION_DURATION_KEY,
  parseTierThresholds,
  TIER_SETTING_KEYS,
  type TierThresholds,
} from './attestation-tiers';

// Attestatsiya sozlamalari bitta joyda o'qiladi: /attestation sahifasi va
// natija API'si (toifa chegaralari) bir xil qiymatni ko'rsin. Eski
// `attestation_pass_score` ataylab o'qilmaydi — bazada qolsa ham zarari yo'q.

const SETTING_KEYS = [ATTESTATION_DATE_KEY, ATTESTATION_DURATION_KEY, ...Object.values(TIER_SETTING_KEYS)];

export interface AttestationSettings {
  /** `YYYY-MM-DD`; hisoblagich `daysUntil` orqali. */
  date: string | null;
  durationMin: number | null;
  tiers: TierThresholds;
}

export async function loadAttestationSettings(): Promise<AttestationSettings> {
  const rows = await db.systemSetting.findMany({ where: { key: { in: SETTING_KEYS } }, select: { key: true, value: true } });
  const map = new Map(rows.map((s) => [s.key, s.value]));
  return {
    date: map.get(ATTESTATION_DATE_KEY)?.trim() || null,
    durationMin: parsePositiveInt(map.get(ATTESTATION_DURATION_KEY)),
    tiers: parseTierThresholds((key) => map.get(key)),
  };
}
