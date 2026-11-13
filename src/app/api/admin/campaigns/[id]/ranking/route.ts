import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/api-auth';
import { logger } from '@/lib/logger';
import { loadAdminRanking } from '@/lib/campaign/admin-store';
import { campaignIdSchema, jsonError } from '@/lib/campaign/admin-api';

const RANKING_PAGE_SIZE = 50;

/** GET /api/admin/campaigns/[id]/ranking?page= — 50 tadan + jami raqamlar. Avto-yangilanish yo'q (Vercel CPU). */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const id = campaignIdSchema.safeParse((await context.params).id);
    const campaign = id.success ? await db.campaign.findUnique({ where: { id: id.data } }) : null;
    if (!campaign) return jsonError(404, 'Aksiya topilmadi');

    const { rows, totals } = await loadAdminRanking(campaign, new Date());
    const totalPages = Math.max(1, Math.ceil(rows.length / RANKING_PAGE_SIZE));
    const requested = Number.parseInt(request.nextUrl.searchParams.get('page') ?? '1', 10);
    const page = Math.min(Math.max(Number.isFinite(requested) ? requested : 1, 1), totalPages);
    return NextResponse.json({
      totals,
      rows: rows.slice((page - 1) * RANKING_PAGE_SIZE, page * RANKING_PAGE_SIZE),
      page,
      totalPages,
      total: rows.length,
      pageSize: RANKING_PAGE_SIZE,
    });
  } catch (err) {
    logger.error('GET /api/admin/campaigns/[id]/ranking error:', { error: err });
    return jsonError(500, 'Server xatosi');
  }
}
