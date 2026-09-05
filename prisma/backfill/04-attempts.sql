-- ============================================================================
-- Attempt backfill (S27) — mavjud TestResult.answers JSON blobidan Attempt
-- yozuvlarini chiqaradi. Bundan buyon /api/tests/[id]/submit va
-- /api/sessions/[id]/submit har yangi topshiriqda Attempt'ni to'g'ridan-
-- to'g'ri yozadi (lib/attempts.ts) — bu skript FAQAT o'sha kod ishga
-- tushishidan OLDIN yig'ilgan tarixiy natijalarni to'ldirish uchun.
--
-- ID normallashtirish — lib/quota.ts#resolveUnlockKey bilan bir xil qoida:
-- avval Item.legacyQuestionId bo'yicha (eski Test tarmog'i), topilmasa
-- to'g'ridan-to'g'ri Item.id bo'yicha (sessiya tarmog'i — javob allaqachon
-- Item.id). Ikkalasi ham topilmasa (hali backfill qilinmagan/o'chirilgan
-- savol) — SHU JAVOB o'tkazib yuboriladi, yetim Attempt qatori qolmaydi.
--
-- IDEMPOTENT: qayta ishga tushirilsa dublikat yaratmaydi — har bir
-- (testResultId, itemId) juftligi uchun NOT EXISTS tekshiruvi bor.
--
-- BO'LAKLAB ISHLASH: baza katta bo'lsa, pastdagi (# bilan izohlangan)
-- sana filtrini oching va oraliqni har chaqiriqda o'zgartirib bir necha
-- marta ketma-ket ishga tushiring — har safar faqat shu oraliqdagi
-- TestResult qayta ishlanadi, boshqalariga tegilmaydi.
--
-- BIR MARTALIK — CLAUDE.md talabiga ko'ra loyiha egasi Neon SQL Editor
-- orqali qo'llaydi, avtomatik ishga tushmaydi.
-- ============================================================================

BEGIN;

INSERT INTO "Attempt" (id, "userId", "itemId", "sessionId", "testResultId", answer, "isCorrect", "timeSpentSec", "answeredAt")
SELECT
  gen_random_uuid()::text,
  tr."userId",
  resolved."itemId",
  tr."sessionId",
  tr.id,
  COALESCE(elem->>'answer', ''),
  COALESCE((elem->>'isCorrect')::boolean, false),
  COALESCE((elem->>'timeSpent')::int, 0),
  tr."completedAt"
FROM "TestResult" tr
CROSS JOIN LATERAL jsonb_array_elements(tr.answers) AS elem
CROSS JOIN LATERAL (
  SELECT COALESCE(
    (SELECT i.id FROM "Item" i WHERE i."legacyQuestionId" = elem->>'questionId'),
    (SELECT i.id FROM "Item" i WHERE i.id = elem->>'questionId')
  ) AS "itemId"
) resolved
WHERE elem ? 'questionId'
  AND resolved."itemId" IS NOT NULL
  -- Bo'laklab ishlash uchun (ixtiyoriy) — quyidagi ikki qatorni oching va
  -- sanani har chaqiriqda o'zgartiring:
  -- AND tr."completedAt" >= '2026-01-01'
  -- AND tr."completedAt" <  '2026-02-01'
  AND NOT EXISTS (
    SELECT 1 FROM "Attempt" a
    WHERE a."testResultId" = tr.id AND a."itemId" = resolved."itemId"
  );

COMMIT;

-- ============================================================================
-- TEKSHIRUV SO'ROVLARI — COMMIT'dan keyin, alohida ishga tushiring.
-- ============================================================================

-- Jami ko'chirilgan Attempt:
-- SELECT count(*) FROM "Attempt";

-- Item topilmagani uchun o'tkazib yuborilgan javoblar soni (backfill'dan
-- keyin ham qolishi mumkin — sabab: savol hali Item'ga ko'chirilmagan yoki
-- o'chirilgan):
-- SELECT count(*)
-- FROM "TestResult" tr
-- CROSS JOIN LATERAL jsonb_array_elements(tr.answers) AS elem
-- WHERE elem ? 'questionId'
--   AND NOT EXISTS (SELECT 1 FROM "Item" i WHERE i."legacyQuestionId" = elem->>'questionId')
--   AND NOT EXISTS (SELECT 1 FROM "Item" i WHERE i.id = elem->>'questionId');
