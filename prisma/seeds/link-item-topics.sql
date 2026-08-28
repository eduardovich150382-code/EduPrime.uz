-- ============================================================================
-- Item <-> TopicNode bog'lanishini (qayta) hosil qiladi — ItemTopic.
--
-- prisma/backfill/01-items.sql dagi bir martalik ko'chirishdan farqli
-- o'laroq, bu skript QAYTA-QAYTA ishga tushirish uchun mo'ljallangan: yangi
-- Item yoki yangi TopicNode/alias qo'shilgandan keyin, yetishmagan
-- bog'lanishlarni to'ldirish uchun.
--
-- Manba matn: Item'ning manba savolidagi topic — Item.legacyQuestionId
-- orqali Question.topic, yoki Item.legacyBankId orqali BankQuestion.topic
-- (Item'ning o'zida "topic" ustuni yo'q — Question/BankQuestion sxemasiga bu
-- skriptda tegilmaydi, faqat o'qiladi).
--
-- Solishtirish TopicNode.nameUz VA TopicNode.aliases massividagi HAR BIR
-- qiymat bilan, normallashtirilgan holda: kichik harf, apostrof turlari
-- (' ' ' ʻ ʼ) olib tashlangan, ketma-ket bo'shliqlar bitta bo'shliqqa
-- siqilgan (prisma/backfill/01-items.sql dagi eduprime_norm_topic bilan bir
-- xil qoida).
--
-- Faqat Item'ning O'Z subjectId'siga tegishli TopicNode'lar bilan
-- solishtiriladi — boshqa fan mavzusiga tasodifan bog'lanmaydi.
--
-- IDEMPOTENT: ON CONFLICT ("itemId", "topicId") DO NOTHING — mavjud
-- bog'lanishlar takrorlanmaydi, hech narsa o'chirilmaydi yoki
-- o'zgartirilmaydi.
--
-- Ishlatish: bu faylning to'liq mazmunini Neon Console -> SQL Editor'ga
-- nusxa-qo'ying va bajaring. INSERT natijasidagi "yangi_boglanishlar" ustuni
-- shu ishga tushirishda nechta YANGI ItemTopic yozuvi qo'shilganini
-- ko'rsatadi (COMMIT'dan oldin, shu tranzaksiya ichida).
-- ============================================================================

BEGIN;

-- Vaqtinchalik normalizatsiya funksiyasi — pg_temp sxemasi, shu sessiya
-- uchun. Fayl oxirida DROP qilinadi.
CREATE OR REPLACE FUNCTION pg_temp.eduprime_norm_topic(p_text TEXT)
RETURNS TEXT AS $$
  SELECT trim(regexp_replace(lower(regexp_replace(p_text, '[''‘’ʻʼ]', '', 'g')), '\s+', ' ', 'g'))
$$ LANGUAGE SQL IMMUTABLE;

-- Har Item uchun manba savolidagi topic matni — avval Question
-- (legacyQuestionId), u yo'q bo'lsa BankQuestion (legacyBankId). Bo'sh yoki
-- NULL topic'li Item'lar bu yerda qolmaydi.
CREATE TEMP TABLE "_item_topic_text" ON COMMIT DROP AS
SELECT
  i.id AS "itemId",
  i."subjectId",
  COALESCE(q.topic, bq.topic) AS topic
FROM "Item" i
LEFT JOIN "Question" q ON q.id = i."legacyQuestionId"
LEFT JOIN "BankQuestion" bq ON bq.id = i."legacyBankId"
WHERE COALESCE(q.topic, bq.topic) IS NOT NULL
  AND trim(COALESCE(q.topic, bq.topic)) <> '';

-- Bog'lanishni yozadi va shu ishga tushirishda qo'shilgan YANGI qatorlar
-- sonini qaytaradi (ON CONFLICT DO NOTHING tufayli mavjudlari RETURNING'ga
-- kirmaydi).
WITH inserted AS (
  INSERT INTO "ItemTopic" ("itemId", "topicId")
  SELECT DISTINCT itt."itemId", tn.id
  FROM "_item_topic_text" itt
  JOIN "TopicNode" tn
    ON tn."subjectId" = itt."subjectId"
   AND (
        pg_temp.eduprime_norm_topic(tn."nameUz") = pg_temp.eduprime_norm_topic(itt.topic)
        OR EXISTS (
          SELECT 1 FROM unnest(tn.aliases) AS alias
          WHERE pg_temp.eduprime_norm_topic(alias) = pg_temp.eduprime_norm_topic(itt.topic)
        )
      )
  ON CONFLICT ("itemId", "topicId") DO NOTHING
  RETURNING 1
)
SELECT count(*) AS "yangi_boglanishlar" FROM inserted;

DROP FUNCTION IF EXISTS pg_temp.eduprime_norm_topic(TEXT);

COMMIT;

-- ============================================================================
-- TEKSHIRUV SO'ROVLARI — COMMIT'dan keyin, alohida ishga tushiring.
-- ============================================================================

-- Nechta ItemTopic bog'lanishi bor (jami, shu skript va boshqa manbalardan):
-- SELECT count(*) FROM "ItemTopic";

-- Topic matni bor, lekin hali BIRON TA mavzuga bog'lanmagan Item'lar soni
-- (mos TopicNode.nameUz/aliases topilmagan — JSON'ga alias qo'shish kerak
-- bo'lishi mumkin):
-- SELECT count(DISTINCT i.id)
-- FROM "Item" i
-- LEFT JOIN "Question" q ON q.id = i."legacyQuestionId"
-- LEFT JOIN "BankQuestion" bq ON bq.id = i."legacyBankId"
-- WHERE COALESCE(q.topic, bq.topic) IS NOT NULL
--   AND trim(COALESCE(q.topic, bq.topic)) <> ''
--   AND NOT EXISTS (SELECT 1 FROM "ItemTopic" it WHERE it."itemId" = i.id);

-- Bog'lanmagan Item'larning aniq topic matnlari (qaysi TopicNode/alias
-- yetishmayotganini ko'rish uchun):
-- SELECT i.id, i."subjectId", COALESCE(q.topic, bq.topic) AS topic
-- FROM "Item" i
-- LEFT JOIN "Question" q ON q.id = i."legacyQuestionId"
-- LEFT JOIN "BankQuestion" bq ON bq.id = i."legacyBankId"
-- WHERE COALESCE(q.topic, bq.topic) IS NOT NULL
--   AND trim(COALESCE(q.topic, bq.topic)) <> ''
--   AND NOT EXISTS (SELECT 1 FROM "ItemTopic" it WHERE it."itemId" = i.id)
-- ORDER BY i."subjectId";
