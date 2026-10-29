import { unstable_cache } from 'next/cache';
import { Prisma } from '@prisma/client';
import { db } from './db';
import { WEB_SOURCE } from './bot-start';
import { getAdFreeTestId } from './ad-free-test';

// "Reklama manbalari" hisoboti. Kohort — oyna ichida BIRINCHI marta /start
// bosganlar, birinchi /start manbasi bo'yicha. Har bosqich shu odamning
// birinchi /start'idan keyin sanaladi: eski foydalanuvchining oldingi
// to'lovi yangi reklamaga yozilib qolmasin. Botsiz kelganlar ('web') —
// alohida qator, oynada yaratilgan akkauntlar bo'yicha.

export const AD_REPORT_WINDOWS = [7, 30] as const;
export type AdReportWindow = (typeof AD_REPORT_WINDOWS)[number];

export interface AdSourceRow {
  source: string;
  firstStarts: number;
  signedIn: number;
  adTestStarted: number;
  adTestFinished: number;
  paid: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Bitta so'rov: kohort CTE + har odam uchun EXISTS. JOIN emas — bir
 * odamning bir nechta natijasi/to'lovi qatorlarni ko'paytirib sanoqni buzardi.
 * Alohida eksport — CI Postgres integration testi aynan shu SQL'ni ishlatadi.
 */
export function adSourceReportSql(since: Date, adTestId: string | null): Prisma.Sql {
  return Prisma.sql`
    WITH cohort AS (
      SELECT DISTINCT ON (bs."telegramId") bs."telegramId", bs."source", bs."createdAt" AS "startedAt"
      FROM "BotStart" bs
      WHERE bs."isFirst" AND bs."createdAt" >= ${since}
      ORDER BY bs."telegramId", bs."createdAt"
    ),
    people AS (
      SELECT c."source", c."startedAt", u."id" AS "userId", u."firstSource", u."adTestStartedAt", 1 AS "started"
      FROM cohort c LEFT JOIN "User" u ON u."telegramId" = c."telegramId"::text
      UNION ALL
      SELECT ${WEB_SOURCE}::text, u."createdAt", u."id", u."firstSource", u."adTestStartedAt", 0
      FROM "User" u
      WHERE u."firstSource" = ${WEB_SOURCE}::text AND u."createdAt" >= ${since}
    )
    SELECT p."source",
      SUM(p."started")::int AS "firstStarts",
      COUNT(p."userId") FILTER (WHERE p."firstSource" IS NOT NULL)::int AS "signedIn",
      COUNT(p."userId") FILTER (WHERE p."adTestStartedAt" >= p."startedAt")::int AS "adTestStarted",
      COUNT(p."userId") FILTER (WHERE EXISTS (
        SELECT 1 FROM "TestResult" r
        WHERE r."userId" = p."userId" AND r."testId" = ${adTestId}::text AND r."completedAt" >= p."startedAt"
      ))::int AS "adTestFinished",
      COUNT(p."userId") FILTER (WHERE EXISTS (
        SELECT 1 FROM "Payment" pay
        WHERE pay."userId" = p."userId" AND pay."status" = 'CONFIRMED' AND pay."createdAt" >= p."startedAt"
      ))::int AS "paid"
    FROM people p
    GROUP BY p."source"
    ORDER BY "firstStarts" DESC, "signedIn" DESC, p."source"
  `;
}

function queryAdSourceRows(days: AdReportWindow, adTestId: string | null): Promise<AdSourceRow[]> {
  return db.$queryRaw<AdSourceRow[]>(adSourceReportSql(new Date(Date.now() - days * DAY_MS), adTestId));
}

// Admin hisoboti — 5 daqiqalik kesh yetarli, har ochilishda og'ir so'rov ketmasin.
const cachedRows = unstable_cache(queryAdSourceRows, ['ad-source-report'], { revalidate: 300 });

export async function loadAdSourceReport(): Promise<{
  adTest: { id: string; title: string } | null;
  windows: Record<AdReportWindow, AdSourceRow[]>;
}> {
  const adTestId = await getAdFreeTestId();
  const [adTest, ...rows] = await Promise.all([
    adTestId ? db.test.findUnique({ where: { id: adTestId }, select: { id: true, titleUz: true } }) : null,
    ...AD_REPORT_WINDOWS.map((days) => cachedRows(days, adTestId)),
  ]);
  return {
    adTest: adTest ? { id: adTest.id, title: adTest.titleUz } : null,
    windows: Object.fromEntries(AD_REPORT_WINDOWS.map((days, index) => [days, rows[index]])) as Record<AdReportWindow, AdSourceRow[]>,
  };
}
