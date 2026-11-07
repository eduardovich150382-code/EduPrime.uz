import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { logger } from '@/lib/logger';
import { loadOnlineCounts, loadOnlineUsers } from '@/lib/online-users';

const NO_STORE = { 'Cache-Control': 'private, no-store' };

/**
 * GET /api/admin/online — hozir onlayn foydalanuvchilar va faollik sonlari.
 * Sahifa ochiq va ko'rinib turganda har 60 soniyada chaqiriladi — 4 ta
 * indeksli so'rov (3 ta COUNT + 1 ta findMany, ko'pi bilan 200 qator).
 */
export async function GET() {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const now = new Date();
    const [counts, users] = await Promise.all([loadOnlineCounts(now), loadOnlineUsers(now)]);
    return NextResponse.json({ counts, users, generatedAt: now }, { headers: NO_STORE });
  } catch (error) {
    logger.error('GET /api/admin/online error:', { error });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
