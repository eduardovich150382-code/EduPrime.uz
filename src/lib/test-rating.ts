import { Prisma } from '@prisma/client';
import { db } from './db';

export type RatingMode = 'best' | 'first';

export function parseRatingMode(value: string | null): RatingMode {
  return value === 'first' ? 'first' : 'best';
}

// Har foydalanuvchining qaysi natijasi olinadi. Qiymatlar qat'iy — SQL'ga
// faqat shu ikki konstantadan biri kiradi (foydalanuvchi matni emas).
const PICK_ORDER: Record<RatingMode, Prisma.Sql> = {
  best: Prisma.sql`r."score" DESC, r."timeSpent" ASC, r."completedAt" ASC, r."id" ASC`,
  first: Prisma.sql`r."completedAt" ASC, r."id" ASC`,
};

export interface RatingRow {
  rank: number;
  userId: string;
  name: string | null;
  telegramUsername: string | null;
  email: string | null;
  score: number;
  maxScore: number;
  percentage: number;
  timeSpent: number;
  completedAt: Date;
  attemptsCount: number;
  participants: number;
  attemptsTotal: number;
  avgPercentage: number;
  maxPercentage: number;
}

/**
 * Bitta so'rov: 1) har foydalanuvchining tanlangan natijasi (ROW_NUMBER
 * PARTITION BY userId), 2) butun to'plam bo'yicha o'rin, 3) umumiy
 * ko'rsatkichlar window aggregat bilan — LIMIT'dan oldin hisoblanadi,
 * shuning uchun o'rin va jami sahifalashdan qat'i nazar to'g'ri.
 * Faqat `testId` bo'yicha (sessiya natijalari kirmaydi), adminlar chiqariladi.
 * Mavjud `TestResult(testId)` indeksi bitta test qatorlariga olib boradi.
 */
export function testRatingSql({ testId, mode, limit, offset }: {
  testId: string; mode: RatingMode; limit: number | null; offset: number;
}): Prisma.Sql {
  const page = limit === null ? Prisma.empty : Prisma.sql`LIMIT ${limit} OFFSET ${offset}`;
  return Prisma.sql`
    WITH ranked AS (
      SELECT r."userId", r."score", r."maxScore", r."percentage", r."timeSpent", r."completedAt",
        ROW_NUMBER() OVER (PARTITION BY r."userId" ORDER BY ${PICK_ORDER[mode]}) AS "pick",
        COUNT(*) OVER (PARTITION BY r."userId")::int AS "attemptsCount"
      FROM "TestResult" r
      JOIN "User" u ON u."id" = r."userId"
      WHERE r."testId" = ${testId} AND u."role" <> 'ADMIN'
    ),
    picked AS (
      SELECT p.*, ROW_NUMBER() OVER (ORDER BY p."score" DESC, p."timeSpent" ASC, p."completedAt" ASC, p."userId" ASC)::int AS "rank"
      FROM ranked p
      WHERE p."pick" = 1
    )
    SELECT p."rank", p."userId", u."name", u."telegramUsername", u."email",
      p."score", p."maxScore", p."percentage", p."timeSpent", p."completedAt", p."attemptsCount",
      COUNT(*) OVER ()::int AS "participants",
      SUM(p."attemptsCount") OVER ()::int AS "attemptsTotal",
      AVG(p."percentage") OVER () AS "avgPercentage",
      MAX(p."percentage") OVER () AS "maxPercentage"
    FROM picked p
    JOIN "User" u ON u."id" = p."userId"
    ORDER BY p."rank"
    ${page}
  `;
}

export interface RatingSummary { participants: number; attemptsTotal: number; avgPercentage: number; maxPercentage: number }

const EMPTY_SUMMARY: RatingSummary = { participants: 0, attemptsTotal: 0, avgPercentage: 0, maxPercentage: 0 };

function summaryOf(row: RatingRow | undefined): RatingSummary {
  if (!row) return EMPTY_SUMMARY;
  return {
    participants: row.participants,
    attemptsTotal: row.attemptsTotal,
    avgPercentage: Math.round(row.avgPercentage * 10) / 10,
    maxPercentage: Math.round(row.maxPercentage * 10) / 10,
  };
}

export async function loadTestRating(testId: string, mode: RatingMode, page: number, limit: number | null) {
  const offset = limit === null ? 0 : (page - 1) * limit;
  const rows = await db.$queryRaw<RatingRow[]>(testRatingSql({ testId, mode, limit, offset }));
  let summary = summaryOf(rows[0]);
  // Sahifa natijalardan tashqarida bo'lsa ham kartalar to'g'ri tursin —
  // faqat shu kam uchraydigan holatda bitta qator bilan ikkinchi so'rov.
  if (!rows.length && offset > 0) {
    const [first] = await db.$queryRaw<RatingRow[]>(testRatingSql({ testId, mode, limit: 1, offset: 0 }));
    summary = summaryOf(first);
  }
  return { rows, summary };
}

const TASHKENT_OFFSET_MS = 5 * 60 * 60_000;

/** "YYYY-MM-DD HH:mm" — Toshkent vaqti (Excel uchun bir xil, locale'dan mustaqil). */
export function tashkentDateTime(value: Date | string): string {
  return new Date(new Date(value).getTime() + TASHKENT_OFFSET_MS).toISOString().slice(0, 16).replace('T', ' ');
}

/** Soniyalarni "daq:son" ko'rinishiga: 754 → "12:34". */
export function minutesSeconds(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
