import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { logger } from '@/lib/logger';
import { loadAdSourceReport } from '@/lib/ad-source-report';

/** GET /api/admin/ad-sources — reklama manbalari hisoboti (7/30 kun, 5 daqiqa kesh). */
export async function GET() {
  try {
    const { error } = await requireAdmin();
    if (error) return error;
    return NextResponse.json(await loadAdSourceReport());
  } catch (error) {
    logger.error('GET /api/admin/ad-sources error:', { error });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
