-- Attestatsiya testlaridagi savollarning bo'limi (Question.tags ichidagi
-- `section:fizika` / `section:kasb-standarti` / `section:pedagogika`).
--
-- NIMA UCHUN: bo'lim tegi faqat shu PR'dan keyin import qilingan yoki
-- muharrirda belgilangan savollarda bor. Eski testlarda teg yo'q, natija
-- xaritasi esa bitta savolda ham bo'lim bo'lmasa butun testni oddiy to'r
-- bilan ko'rsatadi (qisman guruhlash qilinmaydi).
--
-- KIM BAJARADI: loyiha egasi, Neon SQL Editor'da, HAR TEST UCHUN ALOHIDA.
-- Avval 1-so'rov bilan savollar tartibini ko'zdan kechiring — har testda
-- bo'limlar chegarasi boshqacha bo'lishi mumkin. Lokal terminaldan
-- bajarilmaydi.

-- 1) KO'RISH (faqat o'qiydi). `position` — 1 dan boshlanadigan raqam,
--    `order` esa bazadagi qiymat (odatda 0 dan). UPDATE `order` bo'yicha
--    yoziladi, shuning uchun ikkalasini ham solishtiring.
SELECT
  t."id"                                                          AS test_id,
  t."titleUz"                                                     AS test_title,
  q."order"                                                       AS "order",
  ROW_NUMBER() OVER (PARTITION BY t."id" ORDER BY q."order", q."id") AS position,
  (SELECT tag FROM unnest(q."tags") AS tag WHERE tag LIKE 'section:%' LIMIT 1) AS current_section,
  LEFT(q."text", 80)                                              AS text_preview
FROM "Test" t
JOIN "TestCategory" c ON c."id" = t."categoryId"
JOIN "Question" q     ON q."testId" = t."id"
WHERE c."type" = 'ATTESTATION'
ORDER BY t."titleUz", t."id", q."order", q."id";

-- 2) YANGILASH ANDOZASI — ataylab izoh ichida, nusxalab, <TEST_ID> va
--    chegaralarni 1-so'rov natijasiga qarab almashtiring.
--
--    Har UPDATE avval mavjud barcha `section:` teglarini olib tashlaydi
--    (bitta savolda ko'pi bilan bitta bo'lim), boshqa teglarga tegmaydi,
--    keyin yangisini qo'shadi — ya'ni qayta bajarish xavfsiz.
--
--    Misol: 50 savolli test, `order` 0 dan: 1–35 fizika, 36–40 kasb
--    standarti, 41–50 pedagogika.
--
-- BEGIN;
--
-- UPDATE "Question" q
-- SET "tags" = ARRAY(SELECT tag FROM unnest(q."tags") AS tag WHERE tag NOT LIKE 'section:%')
--              || ARRAY['section:fizika']
-- WHERE q."testId" = '<TEST_ID>' AND q."order" BETWEEN 0 AND 34;
--
-- UPDATE "Question" q
-- SET "tags" = ARRAY(SELECT tag FROM unnest(q."tags") AS tag WHERE tag NOT LIKE 'section:%')
--              || ARRAY['section:kasb-standarti']
-- WHERE q."testId" = '<TEST_ID>' AND q."order" BETWEEN 35 AND 39;
--
-- UPDATE "Question" q
-- SET "tags" = ARRAY(SELECT tag FROM unnest(q."tags") AS tag WHERE tag NOT LIKE 'section:%')
--              || ARRAY['section:pedagogika']
-- WHERE q."testId" = '<TEST_ID>' AND q."order" BETWEEN 40 AND 49;
--
-- -- Tekshiruv: har bo'limda nechta savol, bo'limsiz qolgani 0 bo'lishi kerak.
-- SELECT
--   COALESCE((SELECT tag FROM unnest(q."tags") AS tag WHERE tag LIKE 'section:%' LIMIT 1), '(yo''q)') AS section,
--   COUNT(*)
-- FROM "Question" q
-- WHERE q."testId" = '<TEST_ID>'
-- GROUP BY 1
-- ORDER BY 1;
--
-- COMMIT;   -- natija kutilganidek bo'lmasa: ROLLBACK;
