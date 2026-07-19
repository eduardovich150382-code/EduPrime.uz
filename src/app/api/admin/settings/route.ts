import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

const DEFAULT_SETTINGS = [
  { key: 'payment_card_number', value: '' },
  { key: 'payment_card_owner', value: '' },
  // Premium narxlari
  { key: 'premium_price_1_month', value: '29000' },
  { key: 'premium_price_3_months', value: '79000' },
  { key: 'premium_price_6_months', value: '150000' },
  { key: 'premium_price_1_year', value: '270000' },
  // Ustoz tarifi narxlari
  { key: 'teacher_price_1_month', value: '49000' },
  { key: 'teacher_price_3_months', value: '129000' },
  { key: 'teacher_price_6_months', value: '240000' },
  { key: 'teacher_price_1_year', value: '430000' },
  // Boshqa sozlamalar
  { key: 'telegram_support_username', value: '' },
  { key: 'site_announcement', value: '' },
  { key: 'referral_friends_required', value: '3' },
  { key: 'referral_reward_days', value: '5' },
  { key: 'free_daily_test_limit', value: '3' },
  { key: 'subscription_alert_days', value: '7,3,1' },
  { key: 'bot_welcome_message', value: '' },
  { key: 'bot_payment_message', value: '' },
];

// GET /api/admin/settings — get all settings (ADMIN only)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = (session.user as any)?.role;
    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const settings = await db.systemSetting.findMany();

    // Merge with defaults (show all expected keys even if not in DB yet)
    const settingsMap: Record<string, string> = {};
    for (const def of DEFAULT_SETTINGS) {
      settingsMap[def.key] = def.value;
    }
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }

    return NextResponse.json({ settings: settingsMap });
  } catch (error) {
    console.error('GET /api/admin/settings error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PUT /api/admin/settings — update settings (ADMIN only)
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = (session.user as any)?.role;
    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { settings } = body;

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'settings object required' }, { status: 400 });
    }

    // Upsert each setting
    const results = [];
    for (const [key, value] of Object.entries(settings)) {
      if (typeof value !== 'string') continue;

      const result = await db.systemSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
      results.push(result);
    }

    return NextResponse.json({ message: 'Settings updated', count: results.length });
  } catch (error) {
    console.error('PUT /api/admin/settings error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
