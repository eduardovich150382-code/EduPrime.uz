import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/api-auth';
import { logger } from '@/lib/logger';
import { attachmentHeader, buildCsv, fileSlug } from '@/lib/csv';
import { tashkentDateKey, utcToTashkentLocal } from '@/lib/date';
import { loadAdminRanking } from '@/lib/campaign/admin-store';
import { campaignIdSchema, jsonError } from '@/lib/campaign/admin-api';

// Ustun nomlari mashina o'qiydigan (lotin, `_`) — fayl A5 da promokod
// tarqatish va qo'lda tekshirish uchun Excel/skriptga olinadi.
const HEADER = [
  "o'rin", 'telegram_id', 'username', 'ism', 'faol', 'kutilmoqda', 'chiqqan', 'yaroqsiz', 'oxirgi_referal', 'chegirma_foiz', "qo'shilgan_vaqt",
];

const tashkentTime = (d: Date | null) => (d ? utcToTashkentLocal(d).replace('T', ' ') : '');

/** GET /api/admin/campaigns/[id]/ranking.csv — to'liq reyting (BOM, `;`), vaqtlar Toshkent bo'yicha. */
export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const id = campaignIdSchema.safeParse((await context.params).id);
    const campaign = id.success ? await db.campaign.findUnique({ where: { id: id.data } }) : null;
    if (!campaign) return jsonError(404, 'Aksiya topilmadi');

    const now = new Date();
    const { rows } = await loadAdminRanking(campaign, now);
    const csv = buildCsv([
      HEADER,
      ...rows.map((r) => [
        r.rank, r.telegramId,
        // `@` siz: Excel `@` bilan boshlangan katakni formula deb o'qiydi.
        r.username ?? '', r.firstName ?? '',
        r.active, r.pending, r.left, r.invalid, tashkentTime(r.lastActiveAt), r.percent, tashkentTime(r.joinedAt),
      ]),
    ]);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': attachmentHeader(`aksiya_${fileSlug(campaign.title, 'reyting')}_${tashkentDateKey(now)}.csv`),
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err) {
    logger.error('GET /api/admin/campaigns/[id]/ranking.csv error:', { error: err });
    return jsonError(500, 'Server xatosi');
  }
}
