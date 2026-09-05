import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { computeItemStats, MIN_ATTEMPTS_FOR_STATS } from '@/lib/item-stats';

// Vercel Hobby cron funksiyalari ~10-60s ichida tugashi kerak — 25s
// zaxira bilan chegara, oshib ketsa keyingi ishga tushirishga qoldiriladi.
const TIME_BUDGET_MS = 25_000;
const BATCH_SIZE = 25;
// SystemSetting.key — oxirgi ishlangan itemId shu yerda saqlanadi (S27
// bo'laklab ishlash). Bo'sh qiymat — "boshidan boshla" degani.
const CURSOR_KEY = 'item_stats_cursor';

/**
 * GET /api/cron/item-stats — S27: har kecha ishlab, kamida
 * `MIN_ATTEMPTS_FOR_STATS` urinishi bo'lgan har bir Item uchun pValue,
 * discrimination, avgTimeSec, distractorHits'ni qayta hisoblaydi va
 * `ItemStat`ga yozadi. Hisoblashning o'zi `lib/item-stats.ts`da (sof, testlangan).
 *
 * Bitta ishga tushishda vaqt chegarasidan oshmasligi uchun itemId bo'yicha
 * BO'LAKLAB ishlaydi — oxirgi ishlangan itemId `SystemSetting`da saqlanadi.
 * Barcha item tugagach kursor tozalanadi (keyingi ishga tushirishda
 * boshidan boshlanadi — yangi to'plangan urinishlarni ham qamrab olish uchun).
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = Date.now();

  try {
    const cursorSetting = await db.systemSetting.findUnique({ where: { key: CURSOR_KEY } });
    let cursor = cursorSetting?.value || '';
    let processed = 0;
    let reachedEnd = false;

    while (Date.now() - startedAt < TIME_BUDGET_MS) {
      // Kamida MIN_ATTEMPTS_FOR_STATS urinishi bo'lgan itemId'lar, cursor'dan
      // KEYINGI (itemId bo'yicha o'sish tartibida) — bo'laklab ishlash shu
      // orqali izchil davom etadi.
      const candidates = await db.attempt.groupBy({
        by: ['itemId'],
        where: { itemId: { gt: cursor } },
        _count: { itemId: true },
        having: { itemId: { _count: { gte: MIN_ATTEMPTS_FOR_STATS } } },
        orderBy: { itemId: 'asc' },
        take: BATCH_SIZE,
      });

      if (candidates.length === 0) {
        reachedEnd = true;
        break;
      }

      for (const { itemId } of candidates) {
        await recomputeItemStat(itemId);
        processed++;
        cursor = itemId;
      }

      if (candidates.length < BATCH_SIZE) {
        reachedEnd = true;
        break;
      }
    }

    await db.systemSetting.upsert({
      where: { key: CURSOR_KEY },
      create: { key: CURSOR_KEY, value: reachedEnd ? '' : cursor },
      update: { value: reachedEnd ? '' : cursor },
    });

    return NextResponse.json({
      success: true,
      processed,
      reachedEnd,
      tookMs: Date.now() - startedAt,
    });
  } catch (error) {
    console.error('GET /api/cron/item-stats error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/** Bitta Item uchun ItemStat'ni Attempt yozuvlaridan qayta hisoblaydi. */
async function recomputeItemStat(itemId: string): Promise<void> {
  const attempts = await db.attempt.findMany({
    where: { itemId },
    select: { isCorrect: true, answer: true, timeSpentSec: true, testResultId: true },
  });

  const resultIds = [...new Set(attempts.map((a) => a.testResultId).filter((v): v is string => !!v))];
  const results = resultIds.length
    ? await db.testResult.findMany({ where: { id: { in: resultIds } }, select: { id: true, percentage: true } })
    : [];
  const percentageById = new Map(results.map((r) => [r.id, r.percentage]));

  const stats = computeItemStats(
    attempts.map((a) => ({
      isCorrect: a.isCorrect,
      answer: a.answer,
      timeSpentSec: a.timeSpentSec,
      // TestResult topilmasa (juda kam ehtimol — natija keyinchalik
      // o'chirilgan bo'lishi mumkin) 0% sifatida "eng zaif" guruhga
      // tushadi — diskriminatsiyani yengil pastga suradi, lekin butun
      // hisoblashni to'xtatmaydi.
      percentage: a.testResultId ? percentageById.get(a.testResultId) ?? 0 : 0,
    }))
  );

  // `groupBy`dagi count so'rov vaqtida >= MIN_ATTEMPTS_FOR_STATS edi, shu
  // orada o'zgarishi amalda deyarli mumkin emas — himoya sifatida qoldirilgan.
  if (!stats) return;

  await db.itemStat.upsert({
    where: { itemId },
    create: {
      itemId,
      attempts: stats.attemptCount,
      correct: stats.correct,
      pValue: stats.pValue,
      discrimination: stats.discrimination,
      avgTimeSec: stats.avgTimeSec,
      distractorHits: stats.distractorHits as Prisma.InputJsonValue,
    },
    update: {
      attempts: stats.attemptCount,
      correct: stats.correct,
      pValue: stats.pValue,
      discrimination: stats.discrimination,
      avgTimeSec: stats.avgTimeSec,
      distractorHits: stats.distractorHits as Prisma.InputJsonValue,
    },
  });
}
