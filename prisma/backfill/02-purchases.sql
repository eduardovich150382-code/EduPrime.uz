-- ============================================================================
-- Purchase backfill — CONFIRMED to'lovlardagi Payment.selectedSubjects
-- massividan haqiqiy test/kurs xaridlarini kanonik Purchase jadvaliga
-- ko'chiradi. Fan (Subject) id'lariga mos kelgan qiymatlar (TEACHER_PLAN
-- uchun tanlangan fanlar) tegilmay qoldiriladi.
--
-- Bu fayl `scripts/generate-backfill-sql.ts` orqali hosil qilingan —
-- statik matn, bazaga ulanmasdan yozilgan. `scripts/backfill-purchases.ts`
-- (Prisma Client orqali, hozircha ishga tushirib bo'lmaydigan) dagi
-- mantiqning aynan shu qoidalarini takrorlaydi.
--
-- IDEMPOTENT: ON CONFLICT (userId, itemType, itemId) DO NOTHING — qayta
-- ishga tushirilsa dublikat yaratmaydi. Payment'dan HECH NARSA
-- o'chirilmaydi yoki o'zgartirilmaydi.
--
-- Ishlatish: bu faylning to'liq mazmunini Neon Console -> SQL Editor'ga
-- nusxa-qo'ying va bajaring. Oxiridagi tekshiruv so'rovlari izoh sifatida
-- berilgan.
-- ============================================================================

BEGIN;

WITH selections AS (
  SELECT
    p.id AS "paymentId",
    p."userId",
    CASE WHEN t.id IS NOT NULL THEN 'test' ELSE 'course' END AS "itemType",
    s."itemId"
  FROM "Payment" p
  CROSS JOIN LATERAL unnest(p."selectedSubjects") AS s("itemId")
  LEFT JOIN "Test" t ON t.id = s."itemId"
  LEFT JOIN "Course" c ON c.id = s."itemId"
  WHERE p.status = 'CONFIRMED'
    AND (t.id IS NOT NULL OR c.id IS NOT NULL)
),
deduped AS (
  -- Bitta to'lov ichida yoki turli to'lovlar orasida takrorlangan
  -- userId+itemType+itemId juftligi bir marta hisoblanadi — birinchi
  -- (paymentId bo'yicha eng kichik, ya'ni eng birinchi) to'lov "sabab"
  -- sifatida saqlanadi.
  SELECT DISTINCT ON ("userId", "itemType", "itemId")
    "userId", "itemType", "itemId", "paymentId"
  FROM selections
  ORDER BY "userId", "itemType", "itemId", "paymentId" ASC
)
INSERT INTO "Purchase" (id, "userId", "itemType", "itemId", "paymentId", "createdAt")
SELECT gen_random_uuid()::text, "userId", "itemType", "itemId", "paymentId", now()
FROM deduped
ON CONFLICT ("userId", "itemType", "itemId") DO NOTHING;

COMMIT;

-- ============================================================================
-- TEKSHIRUV SO'ROVLARI — COMMIT'dan keyin, alohida ishga tushiring.
-- ============================================================================

-- Jami Purchase yozuvlari, turi bo'yicha:
-- SELECT "itemType", count(*) FROM "Purchase" GROUP BY "itemType";

-- Fan id'lariga mos kelib (Test'ga ham, Course'ga ham mos kelmagan)
-- tegilmay qoldirilgan selectedSubjects qiymatlari soni:
-- SELECT count(*)
-- FROM "Payment" p
-- CROSS JOIN LATERAL unnest(p."selectedSubjects") AS s("itemId")
-- LEFT JOIN "Test" t ON t.id = s."itemId"
-- LEFT JOIN "Course" c ON c.id = s."itemId"
-- WHERE p.status = 'CONFIRMED' AND t.id IS NULL AND c.id IS NULL;

-- Purchase'ga umuman yozuvi tushmagan CONFIRMED to'lovlar (barcha id'lari
-- fan bo'lib chiqqan yoki selectedSubjects bo'sh emas edi, lekin hech biri
-- Test/Course'ga mos kelmadi):
-- SELECT p.id, p."userId", p."selectedSubjects"
-- FROM "Payment" p
-- WHERE p.status = 'CONFIRMED'
--   AND cardinality(p."selectedSubjects") > 0
--   AND NOT EXISTS (
--     SELECT 1 FROM "Purchase" pu WHERE pu."paymentId" = p.id
--   );
