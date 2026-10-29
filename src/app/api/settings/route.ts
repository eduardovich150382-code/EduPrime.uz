import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getPublicSettings, PUBLIC_SETTING_DEFAULTS } from '@/lib/public-catalog';

// GET /api/settings — public settings (card info, announcement)
export async function GET() {
  try {
    return NextResponse.json({ settings: await getPublicSettings() });
  } catch (error) {
    logger.error('GET /api/settings error:', { error });
    return NextResponse.json({ settings: PUBLIC_SETTING_DEFAULTS });
  }
}
