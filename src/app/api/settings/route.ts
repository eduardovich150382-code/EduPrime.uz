import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

// Public keys that are safe to expose
const PUBLIC_KEYS = [
  'payment_card_number',
  'payment_card_owner',
  'site_announcement',
  'telegram_support_username',
  'referral_friends_required',
  'referral_reward_days',
  'free_daily_test_limit',
  // /tests attestatsiya banneridagi "kun qoldi" hisoblagichi (YYYY-MM-DD).
  'attestation_date',
];

const DEFAULTS: Record<string, string> = {
  payment_card_number: '',
  payment_card_owner: '',
  site_announcement: '',
  telegram_support_username: '',
  referral_friends_required: '3',
  referral_reward_days: '5',
  free_daily_test_limit: '3',
  // Bo'sh — hisoblagich yashirin, banner qoladi.
  attestation_date: '',
};

// GET /api/settings — public settings (card info, announcement)
export async function GET() {
  try {
    const settings = await db.systemSetting.findMany({
      where: {
        key: { in: PUBLIC_KEYS },
      },
    });

    const result: Record<string, string> = { ...DEFAULTS };
    for (const s of settings) {
      result[s.key] = s.value;
    }

    return NextResponse.json({ settings: result });
  } catch (error) {
    logger.error('GET /api/settings error:', { error });
    return NextResponse.json({ settings: DEFAULTS });
  }
}
