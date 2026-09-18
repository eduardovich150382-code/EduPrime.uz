import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";

/**
 * HAQIQIY bazaga qarshi ishlaydigan yagona test.
 *
 * Nega kerak: `PUT /api/teacher/tests/[id]/questions` dagi advisory qulf
 * `$queryRaw` bilan chaqirilgan edi va prod'da butun saqlashni to'xtatdi —
 * `pg_advisory_xact_lock()` `void` qaytaradi, `$queryRaw` esa qaytgan
 * ustunlarni deserializatsiya qilmoqchi bo'lib yiqiladi ("Failed to
 * deserialize column of type 'void'"). Route testi `$queryRaw` ni MOCK
 * qilgani uchun yashil turaverdi va nuqson prod'ga chiqib ketdi.
 *
 * Mock hech qachon bu xatoni ko'rsatmaydi, shuning uchun qoplama faqat
 * haqiqiy Postgres'da bo'lishi mumkin. CI'dagi `migration-check` job'ida
 * `postgres:16` konteyneri bor — test o'sha yerda ishlaydi.
 *
 * `INTEGRATION_DATABASE_URL` berilmagan bo'lsa butunlay o'tkazib yuboriladi:
 * odatdagi `npm test` (CI'ning `checks` job'i va ishlab chiquvchi mashinasi)
 * bazasiz ishlaydi.
 */
const url = process.env.INTEGRATION_DATABASE_URL;

// `@/lib/db` singleton'i `DATABASE_URL` ni o'qiydi — bu yerda alohida klient
// kerak, toki test faqat CI konteyneriga ulansin va boshqa hech qayerga.
const prisma = url ? new PrismaClient({ datasources: { db: { url } } }) : null;

afterAll(async () => {
  await prisma?.$disconnect();
});

describe.skipIf(!url)("pg_advisory_xact_lock — haqiqiy Postgres", () => {
  const lockKey = "test-questions:ci-integration";

  it("`$executeRaw` bilan tranzaksiya ichida xatosiz olinadi", async () => {
    await expect(
      prisma!.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
        return "ok";
      }),
    ).resolves.toBe("ok");
  });

  it("`$queryRaw` bilan YIQILADI — #170 dagi aynan shu nuqson", async () => {
    // Bu band testning haqiqatan ham ajrata olishini isbotlaydi: usiz test
    // "har doim yashil" bo'lib, keyingi safar ham hech narsani tutmasdi.
    await expect(
      prisma!.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
      }),
    ).rejects.toThrow(/deserialize|void/i);
  });

  it("bitta tranzaksiyada ketma-ket ikki marta olinishi mumkin (qulf qayta kiriluvchi)", async () => {
    // Postgres advisory qulflari bir sessiya ichida qayta kiriluvchi —
    // saqlash yo'li kelajakda qulfni ikki marta so'rasa ham blok bo'lmaydi.
    await expect(
      prisma!.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
        return "ok";
      }),
    ).resolves.toBe("ok");
  });

  it("tranzaksiya tugagach qulf bo'shaydi", async () => {
    // `_xact_` variantining butun ma'nosi shu: xato yoki timeout holatida ham
    // qulf qolib ketmaydi. Agar bo'shamasa, ikkinchi tranzaksiya osilib qolardi.
    for (let i = 0; i < 2; i++) {
      await prisma!.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
      });
    }

    // Kalit bo'yicha filtrlamaymiz: `hashtext` int4 qaytaradi va advisory
    // kaliti `pg_locks` da classid/objid juftligiga bo'linadi — moslashtirish
    // ishonchsiz. CI konteyneri izolyatsiya qilingani uchun "umuman advisory
    // qulf qolmagan" tekshiruvi aniqroq va yetarli.
    const held = await prisma!.$queryRaw<{ count: bigint }[]>`
      SELECT count(*)::bigint AS count FROM pg_locks WHERE locktype = 'advisory'
    `;
    expect(Number(held[0].count)).toBe(0);
  });
});
