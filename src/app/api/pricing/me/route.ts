import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { logger } from '@/lib/logger';
import { loadPricingPage } from '@/lib/pricing-page';
import { requestLocale } from '@/lib/request-locale';

// /pricing statik (ISR) — faol obunalar va shaxsiy narx (2-fan chegirmasi)
// shu yerdan, klientda. Katalog `loadPricingCatalog` keshidan, shaxsiy qism
// keshsiz; javob hech qayerda keshlanmasin.
export const dynamic = 'force-dynamic';
const PRIVATE = { 'Cache-Control': 'private, no-store' };

export async function GET(request: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) {
    error.headers.set('Cache-Control', PRIVATE['Cache-Control']);
    return error;
  }
  try {
    return NextResponse.json(await loadPricingPage(user.id, requestLocale(request)), { headers: PRIVATE });
  } catch (err) {
    logger.error('GET /api/pricing/me error:', { error: err });
    return NextResponse.json({ error: 'Server error' }, { status: 500, headers: PRIVATE });
  }
}
