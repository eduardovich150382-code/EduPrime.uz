BEGIN;

-- S22b — Interaktiv dars bloklari: EMBED (tashqi simulyatsiya) va PRACTICE
-- (baholanmaydigan mashq). Faqat ADDITIVE: yangi enum qiymatlar + ikkita
-- nullable/default ustun, hech qanday DROP yo'q.
--
-- DIQQAT — Postgres enum tuzog'i: `ALTER TYPE ... ADD VALUE` va o'sha yangi
-- qiymatni bitta so'rovda ISHLATISH bir tranzaksiyada bo'lolmaydi (Postgres
-- cheklovi — yangi enum yorlig'i commit bo'lmaguncha ko'rinmaydi). Shu
-- sababli bu migratsiya FAQAT qiymat qo'shadi — 'EMBED'/'PRACTICE'ni
-- ishlatadigan hech qanday INSERT/UPDATE bu yerda YO'Q va bo'lmasin.
ALTER TYPE "LessonBlockType" ADD VALUE 'EMBED';
ALTER TYPE "LessonBlockType" ADD VALUE 'PRACTICE';

-- AlterTable
ALTER TABLE "LessonBlock" ADD COLUMN     "embedUrl" TEXT,
ADD COLUMN     "itemIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES (gen_random_uuid()::text, '40f1de30d2d5f46aca0860ed32509b0738b13eb955177c8f5d29339538492a39', now(), '20260903120000_lesson_block_embed_practice', NULL, NULL, now(), 1);

COMMIT;
