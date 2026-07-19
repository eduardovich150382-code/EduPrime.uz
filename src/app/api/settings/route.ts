import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Public pricing keys that are safe to expose
const PUBLIC_KEYS = [
  'premium_price_1_month',
  'premium_price_3_months',
  'premium_price_6_months',
  'premium_price_1_year',
  'teacher_price_1_month',
  'teacher_price_3_months',
  'teacher_price_6_months',
  'teacher_price_1_year',
  'payment_card_number',
  'payment_card_owner',
  'site_announcement',
  'telegram_support_username',
];

const DEFAULTS: Record<string, string> = {
  premium_price_1_month: '29000',
  premium_price_3_months: '79000',
  premium_price_6_months: '150000',
  premium_price_1_year: '270000',
  teacher_price_1_month: '49000',
  teacher_price_3_months: '129000',
  teacher_price_6_months: '240000',
  teacher_price_1_year: '430000',
  payment_card_number: '',
  payment_card_owner: '',
  site_announcement: '',
  telegram_support_username: '',
};

// GET /api/settings — public settings (pricing, card info, announcement)
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
    console.error('GET /api/settings error:', error);
    return NextResponse.json({ settings: DEFAULTS });
  }
}
