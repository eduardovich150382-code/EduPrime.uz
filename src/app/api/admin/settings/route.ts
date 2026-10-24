import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { hasAttestationKeys, validateAttestationSettings } from '@/lib/attestation-tiers';

const DEFAULT_SETTINGS = [
  { key: 'payment_card_number', value: '' },
  { key: 'payment_card_owner', value: '' },
  // Boshqa sozlamalar
  { key: 'telegram_support_username', value: '' },
  { key: 'site_announcement', value: '' },
  { key: 'referral_friends_required', value: '3' },
  { key: 'referral_reward_days', value: '5' },
  { key: 'free_daily_test_limit', value: '3' },
  { key: 'subscription_alert_days', value: '7,3,1' },
  { key: 'bot_welcome_message', value: '' },
  { key: 'bot_payment_message', value: '' },
  // Attestatsiya — sana/davomiylik bo'sh bo'lsa sahifada qator yashirinadi,
  // toifa chegaralari rasmiy shkala (lib/attestation-tiers.ts).
  { key: 'attestation_date', value: '' },
  { key: 'attestation_duration_min', value: '' },
  { key: 'attestation_tier2_min', value: '60' },
  { key: 'attestation_tier1_min', value: '70' },
  { key: 'attestation_tier_top_min', value: '80' },
  { key: 'attestation_tier_top_bonus_min', value: '86' },
];

// GET /api/admin/settings — get all settings (ADMIN only)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = session.user?.role;
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
      if (/^(premium|teacher)_price_/.test(s.key)) continue;
      settingsMap[s.key] = s.value;
    }

    return NextResponse.json({ settings: settingsMap });
  } catch (error) {
    logger.error('GET /api/admin/settings error:', { error });
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

    const role = session.user?.role;
    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { settings } = body;

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'settings object required' }, { status: 400 });
    }

    // Attestatsiya qiymatlari yozishdan OLDIN tekshiriladi — xato bo'lsa
    // hech narsa saqlanmaydi (yarim yozilgan shkala sahifada standartga
    // tushib, admin kiritganini "yo'qotib" qo'yardi).
    let entries = Object.entries(settings as Record<string, unknown>);
    const attestation = hasAttestationKeys(settings) ? validateAttestationSettings(settings) : null;
    if (attestation && !attestation.ok) {
      return NextResponse.json({ error: attestation.error }, { status: 400 });
    }
    if (attestation?.ok) {
      entries = entries.map(([key, value]) => [key, key in attestation.values ? attestation.values[key] : value]);
    }

    // Upsert each setting
    const results = [];
    for (const [key, value] of entries) {
      if (typeof value !== 'string' || /^(premium|teacher)_price_/.test(key)) continue;

      const result = await db.systemSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
      results.push(result);
    }

    // Ikkala sahifa hozir dinamik (auth() / client fetch), lekin kesh
    // qo'shilsa ham yangi sana va chegaralar darhol ko'rinsin.
    if (attestation) {
      revalidatePath('/[locale]/(public)/attestation', 'page');
      revalidatePath('/[locale]/(public)/tests', 'page');
    }

    return NextResponse.json({ message: 'Settings updated', count: results.length });
  } catch (error) {
    logger.error('PUT /api/admin/settings error:', { error });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
