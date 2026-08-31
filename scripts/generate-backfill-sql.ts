/**
 * `backfill-items.ts` va `backfill-purchases.ts` Prisma Client orqali
 * bazaga ulanadi — lekin loyihada (CLAUDE.md) na lokal bazaga, na GitHub
 * runner'idan Neon'ga ulanish bor. Ya'ni ular hozircha ishga tushirib
 * bo'lmaydi.
 *
 * Bu skript ULANMAYDI — u ikkala backfill mantig'ini sof SQL ko'rinishida,
 * statik matn sifatida yozib chiqadi:
 *   - prisma/backfill/01-items.sql     (BankQuestion/Question -> Item)
 *   - prisma/backfill/02-purchases.sql (Payment.selectedSubjects -> Purchase)
 *
 * Har ikkalasi ham bitta tranzaksiya (`BEGIN;` ... `COMMIT;`) — Neon
 * Console -> SQL Editor'ga to'liq nusxa-qo'yib bajarish uchun mo'ljallangan.
 * INSERT ... SELECT ko'chirishni server tomonda, bir so'rovda bajaradi —
 * bu yerda Prisma Client yoki tarmoq ulanishi umuman kerak emas.
 *
 * Dublikat aniqlash va mavzu moslashtirish uchun ishlatiladigan
 * normalizatsiya ifodalari `backfill-sql-lib.ts`da TypeScript sifatida ham
 * takrorlangan (faqat testlash uchun — `backfill-sql-lib.test.ts`), lekin
 * haqiqiy ko'chirish har doim shu yerdagi SQL orqali bajariladi.
 *
 * Ishlatish:
 *   npm run db:backfill-sql
 */
import fs from "fs";
import path from "path";

const OUTPUT_DIR = path.join(__dirname, "..", "prisma", "backfill");

// Lotin apostrof variantlari — normalizeText (backfill-items-lib.ts) bilan
// deyarli bir xil to'plam: to'g'ri kavichcha ', chapga va o'ngga qayrilgan
// tipografik qo'shtirnoqlar '‘'/'’', modifikator harflar
// 'ʻ'/'ʼ'. Backtick bu yerda qoldirilmagan — SQL ichida uni
// belgisiz kiritish (JS shablon literalidagi qochish belgilaridan qochish
// uchun) qiyinlashtiradi va u haqiqiy matnda apostrof sifatida deyarli
// uchramaydi.
const ITEMS_SQL = `-- ============================================================================
-- Item backfill — BankQuestion va Question yozuvlarini kanonik Item
-- jadvaliga ko'chiradi (dublikatlarni birlashtirib, TestItem va ItemTopic
-- bog'lanishlari bilan birga).
--
-- Bu fayl \`scripts/generate-backfill-sql.ts\` orqali hosil qilingan —
-- statik matn, bazaga ulanmasdan yozilgan. \`scripts/backfill-items.ts\`
-- (Prisma Client orqali, hozircha ishga tushirib bo'lmaydigan) dagi
-- mantiqning aynan shu qoidalarini takrorlaydi:
--   - BankQuestion -> Item, legacyBankId orqali
--   - Question -> Item, dublikat (subjectId + normallashtirilgan text +
--     correctAnswer) topilsa mavjud Item'ga bog'lanadi, aks holda yangi
--     Item yaratiladi
--   - Question -> TestItem (testId, itemId, order, points)
--   - Question.topic / BankQuestion.topic -> TopicNode.nameUz
--     (normallashtirilgan holda solishtirib) -> ItemTopic
--
-- IDEMPOTENT: qayta ishga tushirilsa dublikat yaratmaydi (ON CONFLICT DO
-- NOTHING / NOT EXISTS tekshiruvlari). Question/BankQuestion'dan HECH NARSA
-- o'chirilmaydi yoki o'zgartirilmaydi — bu faqat qo'shimcha ko'chirish.
--
-- Ishlatish: bu faylning to'liq mazmunini Neon Console -> SQL Editor'ga
-- nusxa-qo'ying va bajaring. Oxiridagi tekshiruv so'rovlari izoh sifatida
-- berilgan — natijani ko'rish uchun ularni alohida, COMMIT'dan keyin
-- ishga tushiring.
-- ============================================================================

BEGIN;

-- ============ Vaqtinchalik normalizatsiya funksiyalari ============
-- pg_temp sxemasi — shu sessiya uchun vaqtinchalik, boshqa hech narsaga
-- ta'sir qilmaydi. Fayl oxirida DROP qilinadi.

-- Dublikat kaliti uchun: pastki registr + bo'shliqlarni siqish (apostrof va
-- boshqa belgilarga tegilmaydi — to'g'ri javob harflari A/B/C/D/E bo'lgani
-- uchun bu yerda ortiqcha normalizatsiya kerak emas).
CREATE OR REPLACE FUNCTION pg_temp.eduprime_dup_key(p_subject_id TEXT, p_text TEXT, p_correct TEXT)
RETURNS TEXT AS $$
  SELECT md5(
    p_subject_id || '|' ||
    trim(lower(regexp_replace(p_text, '\\s+', ' ', 'g'))) || '|' ||
    coalesce(p_correct, '')
  )
$$ LANGUAGE SQL IMMUTABLE;

-- Mavzu matnini TopicNode.nameUz bilan solishtirish uchun: pastki registr +
-- lotin apostrof variantlarini olib tashlash + bo'shliqlarni siqish.
CREATE OR REPLACE FUNCTION pg_temp.eduprime_norm_topic(p_text TEXT)
RETURNS TEXT AS $$
  SELECT trim(regexp_replace(lower(regexp_replace(p_text, '[''‘’ʻʼ]', '', 'g')), '\\s+', ' ', 'g'))
$$ LANGUAGE SQL IMMUTABLE;

-- ============ 1-BOSQICH: BankQuestion -> Item ============
-- visibility=PUBLIC: visibility ustuni savolni HAVZADAN (konstruktor/DTM/
-- qidiruv) ataylab yashirish uchun ishlatiladigan bayroq — "manbasi bank
-- edi" degan sabab bunga kirmaydi. Savollar banki ham umumiy mahsulot:
-- Test'dagi savollar kabi standart holat PUBLIC (BankQuestion'da
-- Test.accessType kabi pullik/bepul belgisi umuman yo'q). Bu qoida avval
-- xato ravishda PRIVATE edi — 454 ta bank Item (shu jumladan Ona tili va
-- Tarix fanlarining BARCHA savollari) konstruktor/DTM/qidiruvda ko'rinmay
-- qolgan edi, prod'da qo'lda tuzatilgan.
INSERT INTO "Item" (
  id, "authorTeacherId", "subjectId", text, images, options, "correctAnswer",
  type, explanation, "explanationImages", "explanationSource", "videoUrl",
  grade, exams, "bloomLevel", difficulty, tags, lang, source, status,
  visibility, "templateId", "variantSig", "legacyBankId", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  bq."teacherId",
  bq."subjectId",
  bq.text,
  bq.images,
  bq.options,
  bq."correctAnswer",
  bq.type,
  bq.explanation,
  bq."explanationImages",
  CASE WHEN bq.explanation IS NOT NULL THEN 'AUTHORED' ELSE 'NONE' END::"ExplanationSource",
  NULL,
  ARRAY[]::INTEGER[],
  ARRAY[]::TEXT[],
  bq."bloomLevel",
  bq.difficulty,
  ARRAY[]::TEXT[],
  'uz',
  'MANUAL'::"ItemSource",
  'PUBLISHED'::"ItemStatus",
  'PUBLIC'::"ItemVisibility",
  NULL,
  NULL,
  bq.id,
  now(),
  now()
FROM "BankQuestion" bq
ON CONFLICT ("legacyBankId") DO NOTHING;

-- ============ 2-BOSQICH: Question -> Item (dublikatlarni birlashtirib) ============
-- Har xil Test'dagi bir xil mazmunli Question'lar (subjectId + normal-
-- lashtirilgan text + correctAnswer bo'yicha) bitta Item'ga tushadi —
-- birinchi (id bo'yicha eng kichik) qator "vakil" sifatida yangi Item
-- yaratadi, qolganlari keyingi bosqichda shu Item'ga bog'lanadi.
WITH q AS (
  SELECT
    q.id,
    q."testId",
    COALESCE(q."subjectId", t."subjectId") AS "effectiveSubjectId",
    q.text,
    q.images,
    q.options,
    q."correctAnswer",
    q.type,
    q.explanation,
    q."explanationImages",
    q."videoUrl",
    q.grade,
    q.exams,
    q."bloomLevel",
    q.difficulty,
    q.tags,
    q.lang,
    q.source,
    q."templateId",
    q."variantSig",
    t."accessType",
    t."teacherId",
    pg_temp.eduprime_dup_key(COALESCE(q."subjectId", t."subjectId"), q.text, q."correctAnswer") AS dup_key
  FROM "Question" q
  JOIN "Test" t ON t.id = q."testId"
  WHERE NOT EXISTS (SELECT 1 FROM "Item" i WHERE i."legacyQuestionId" = q.id)
),
item_keys AS (
  SELECT dup_key, MIN("itemId") AS "itemId"
  FROM (
    SELECT id AS "itemId", pg_temp.eduprime_dup_key("subjectId", text, "correctAnswer") AS dup_key
    FROM "Item"
  ) x
  GROUP BY dup_key
),
candidates AS (
  SELECT q.*
  FROM q
  LEFT JOIN item_keys ik ON ik.dup_key = q.dup_key
  WHERE ik."itemId" IS NULL
),
representative AS (
  SELECT DISTINCT ON (dup_key) *
  FROM candidates
  ORDER BY dup_key, id
)
INSERT INTO "Item" (
  id, "authorTeacherId", "subjectId", text, images, options, "correctAnswer",
  type, explanation, "explanationImages", "explanationSource", "videoUrl",
  grade, exams, "bloomLevel", difficulty, tags, lang, source, status,
  visibility, "templateId", "variantSig", "legacyQuestionId", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  r."teacherId",
  r."effectiveSubjectId",
  r.text,
  r.images,
  r.options,
  r."correctAnswer",
  r.type,
  r.explanation,
  r."explanationImages",
  CASE WHEN r.explanation IS NOT NULL THEN 'AUTHORED' ELSE 'NONE' END::"ExplanationSource",
  r."videoUrl",
  r.grade,
  r.exams,
  r."bloomLevel",
  r.difficulty,
  r.tags,
  r.lang,
  CASE WHEN r.source = 'parametric' THEN 'PARAMETRIC' ELSE 'MANUAL' END::"ItemSource",
  'PUBLISHED'::"ItemStatus",
  CASE WHEN r."accessType" = 'free' THEN 'PUBLIC' ELSE 'PRIVATE' END::"ItemVisibility",
  r."templateId",
  r."variantSig",
  r.id,
  now(),
  now()
FROM representative r
ON CONFLICT ("legacyQuestionId") DO NOTHING;

-- ============ Vaqtinchalik xarita: har Question -> yakuniy Item.id ============
-- 1- va 2-bosqichlardan keyin Item jadvali to'liq holatda — endi har bir
-- Question uchun (yangi yoki oldindan mavjud/allaqachon ko'chirilgan
-- bo'lishidan qat'i nazar) mos Item'ni aniq topish mumkin: avval
-- legacyQuestionId bo'yicha, topilmasa dublikat kaliti bo'yicha.
CREATE TEMP TABLE "_question_item_map" ON COMMIT DROP AS
WITH q AS (
  SELECT
    q.id AS "questionId",
    q."testId",
    q."order",
    q.points,
    q.topic,
    COALESCE(q."subjectId", t."subjectId") AS "effectiveSubjectId",
    q.text,
    q."correctAnswer"
  FROM "Question" q
  JOIN "Test" t ON t.id = q."testId"
)
SELECT
  q."questionId",
  q."testId",
  q."order",
  q.points,
  q.topic,
  q."effectiveSubjectId",
  COALESCE(
    (SELECT i.id FROM "Item" i WHERE i."legacyQuestionId" = q."questionId"),
    (
      SELECT ik."itemId"
      FROM (
        SELECT id AS "itemId", pg_temp.eduprime_dup_key("subjectId", text, "correctAnswer") AS dup_key
        FROM "Item"
      ) ik
      WHERE ik.dup_key = pg_temp.eduprime_dup_key(q."effectiveSubjectId", q.text, q."correctAnswer")
      LIMIT 1
    )
  ) AS "itemId"
FROM q;

-- ============ 3-BOSQICH: Question -> TestItem ============
INSERT INTO "TestItem" ("testId", "itemId", "order", points)
SELECT "testId", "itemId", "order", points
FROM "_question_item_map"
WHERE "itemId" IS NOT NULL
ON CONFLICT ("testId", "itemId") DO NOTHING;

-- ============ 4-BOSQICH: ItemTopic (Question.topic -> TopicNode.nameUz) ============
INSERT INTO "ItemTopic" ("itemId", "topicId")
SELECT DISTINCT qim."itemId", tn.id
FROM "_question_item_map" qim
JOIN "TopicNode" tn
  ON tn."subjectId" = qim."effectiveSubjectId"
 AND pg_temp.eduprime_norm_topic(tn."nameUz") = pg_temp.eduprime_norm_topic(qim.topic)
WHERE qim."itemId" IS NOT NULL
  AND qim.topic IS NOT NULL
  AND trim(qim.topic) <> ''
ON CONFLICT ("itemId", "topicId") DO NOTHING;

-- ============ 4-BOSQICH (davomi): ItemTopic (BankQuestion.topic -> TopicNode.nameUz) ============
INSERT INTO "ItemTopic" ("itemId", "topicId")
SELECT DISTINCT i.id, tn.id
FROM "BankQuestion" bq
JOIN "Item" i ON i."legacyBankId" = bq.id
JOIN "TopicNode" tn
  ON tn."subjectId" = bq."subjectId"
 AND pg_temp.eduprime_norm_topic(tn."nameUz") = pg_temp.eduprime_norm_topic(bq.topic)
WHERE bq.topic IS NOT NULL
  AND trim(bq.topic) <> ''
ON CONFLICT ("itemId", "topicId") DO NOTHING;

-- ============ Tozalash ============
DROP FUNCTION IF EXISTS pg_temp.eduprime_dup_key(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS pg_temp.eduprime_norm_topic(TEXT);

COMMIT;

-- ============================================================================
-- TEKSHIRUV SO'ROVLARI — COMMIT'dan keyin, alohida ishga tushiring.
-- ============================================================================

-- Nechta Item BankQuestion'dan yaratildi:
-- SELECT count(*) FROM "Item" WHERE "legacyBankId" IS NOT NULL;

-- Nechta Item Question'dan yaratildi (dublikat sifatida mavjud Item'ga
-- bog'langan Question'lar hisobga kirmaydi — ular alohida Item yaratmagan):
-- SELECT count(*) FROM "Item" WHERE "legacyQuestionId" IS NOT NULL;

-- Nechta TestItem yozildi:
-- SELECT count(*) FROM "TestItem";

-- Nechta ItemTopic bog'lanishi yozildi:
-- SELECT count(*) FROM "ItemTopic";

-- Mavzuga BOG'LANMAGAN Question'lar ro'yxati (topic bor, lekin mos
-- TopicNode topilmagan) — testId va topic matni bo'yicha:
-- SELECT DISTINCT q."testId", COALESCE(q."subjectId", t."subjectId") AS "subjectId", q.topic
-- FROM "Question" q
-- JOIN "Test" t ON t.id = q."testId"
-- WHERE q.topic IS NOT NULL AND trim(q.topic) <> ''
--   AND NOT EXISTS (
--     SELECT 1 FROM "TopicNode" tn
--     WHERE tn."subjectId" = COALESCE(q."subjectId", t."subjectId")
--       AND trim(regexp_replace(lower(regexp_replace(tn."nameUz", '[''‘’ʻʼ]', '', 'g')), '\\s+', ' ', 'g')) =
--           trim(regexp_replace(lower(regexp_replace(q.topic, '[''‘’ʻʼ]', '', 'g')), '\\s+', ' ', 'g'))
--   )
-- ORDER BY q."testId";

-- Mavzuga bog'lanmagan BankQuestion'lar ro'yxati:
-- SELECT bq.id, bq."subjectId", bq.topic
-- FROM "BankQuestion" bq
-- WHERE bq.topic IS NOT NULL AND trim(bq.topic) <> ''
--   AND NOT EXISTS (
--     SELECT 1 FROM "TopicNode" tn
--     WHERE tn."subjectId" = bq."subjectId"
--       AND trim(regexp_replace(lower(regexp_replace(tn."nameUz", '[''‘’ʻʼ]', '', 'g')), '\\s+', ' ', 'g')) =
--           trim(regexp_replace(lower(regexp_replace(bq.topic, '[''‘’ʻʼ]', '', 'g')), '\\s+', ' ', 'g'))
--   )
-- ORDER BY bq."subjectId";
`;

const PURCHASES_SQL = `-- ============================================================================
-- Purchase backfill — CONFIRMED to'lovlardagi Payment.selectedSubjects
-- massividan haqiqiy test/kurs xaridlarini kanonik Purchase jadvaliga
-- ko'chiradi. Fan (Subject) id'lariga mos kelgan qiymatlar (TEACHER_PLAN
-- uchun tanlangan fanlar) tegilmay qoldiriladi.
--
-- Bu fayl \`scripts/generate-backfill-sql.ts\` orqali hosil qilingan —
-- statik matn, bazaga ulanmasdan yozilgan. \`scripts/backfill-purchases.ts\`
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
`;

function main(): void {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const itemsPath = path.join(OUTPUT_DIR, "01-items.sql");
  const purchasesPath = path.join(OUTPUT_DIR, "02-purchases.sql");

  fs.writeFileSync(itemsPath, ITEMS_SQL, "utf8");
  fs.writeFileSync(purchasesPath, PURCHASES_SQL, "utf8");

  console.log(`Yozildi: ${itemsPath}`);
  console.log(`Yozildi: ${purchasesPath}`);
  console.log("");
  console.log(
    "Keyingi qadam: shu fayllarning to'liq mazmunini navbat bilan (01, keyin " +
      "02) Neon Console -> SQL Editor'ga nusxa-qo'ying va bajaring."
  );
}

// Faqat to'g'ridan-to'g'ri `npm run db:backfill-sql` orqali chaqirilganda
// ishga tushadi — test fayli funksiyalarni shu yon ta'sirsiz import qila
// oladi (hozircha bu faylda alohida eksport qilinadigan sof funksiya yo'q,
// dublikat/mavzu mantig'i testlari `backfill-sql-lib.test.ts`da).
if (require.main === module) {
  main();
}
