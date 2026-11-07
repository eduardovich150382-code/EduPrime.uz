import { Prisma } from '@prisma/client';

export const ADMIN_TESTS_PAGE_SIZE = 30;

export interface TestStatsRow { testId: string; participants: number; avgScore: number | null }

/**
 * Sahifadagi testlar uchun bitta guruhlangan so'rov: noyob ishlaganlar
 * (adminlarsiz — reyting bilan bir xil ta'rif) va o'rtacha foiz (hamma
 * natijalar, avvalgidek). Avval har test uchun alohida aggregate edi (N+1).
 */
export function testStatsSql(ids: string[]): Prisma.Sql {
  return Prisma.sql`
    SELECT r."testId",
      (COUNT(DISTINCT r."userId") FILTER (WHERE u."role" <> 'ADMIN'))::int AS "participants",
      AVG(r."percentage") AS "avgScore"
    FROM "TestResult" r
    JOIN "User" u ON u."id" = r."userId"
    WHERE r."testId" = ANY(${ids}::text[])
    GROUP BY r."testId"
  `;
}

/**
 * "Ishlaganlar" bo'yicha saralangan sahifa id'lari. Filtrlar Prisma'dagi
 * `contains`/`isPublished` bilan bir xil; LIKE maxsus belgilari ekranlanadi.
 * Butun TestResult bo'yicha guruhlaydi — faqat admin shu saralashni
 * tanlaganda ishlaydi.
 */
export function participantsOrderSql({ search, published, limit, offset }: {
  search: string; published: boolean | null; limit: number; offset: number;
}): Prisma.Sql {
  const pattern = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
  return Prisma.sql`
    SELECT t."id"
    FROM "Test" t
    LEFT JOIN (
      SELECT r."testId", COUNT(DISTINCT r."userId") AS "n"
      FROM "TestResult" r
      JOIN "User" u ON u."id" = r."userId"
      WHERE r."testId" IS NOT NULL AND u."role" <> 'ADMIN'
      GROUP BY r."testId"
    ) p ON p."testId" = t."id"
    WHERE (${search} = '' OR t."titleUz" ILIKE ${pattern})
      AND (${published}::boolean IS NULL OR t."isPublished" = ${published}::boolean)
    ORDER BY COALESCE(p."n", 0) DESC, t."createdAt" DESC, t."id" ASC
    LIMIT ${limit} OFFSET ${offset}
  `;
}
