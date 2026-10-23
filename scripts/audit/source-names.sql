-- Foydalanuvchiga ko'rinadigan test nomlarida kitob/muallif nomlari.
--
-- NIMA UCHUN: import qilingan to'plamlar nomi test sarlavhasiga tushib qolgan
-- bo'lishi mumkin ("Makarov 1.2 Dinamika", "3D AYT ..."). Koddagi statik
-- matnlarda bunday nom yo'q (PR'da tekshirilgan) — qolgani bazadagi ma'lumot.
-- Ichki manba maydonlari (Question.source, ImportJob.*) O'ZGARTIRILMAYDI —
-- ular admin uchun kerak, foydalanuvchi API'lari ularni qaytarmaydi.
--
-- KIM BAJARADI: loyiha egasi, Neon SQL Editor'da. Lokal terminaldan
-- bajarilmaydi. 1–4-so'rovlar faqat o'qiydi; UPDATE andozasi pastda, izoh
-- ichida — SELECT natijasiga qarab qo'lda to'ldiriladi.
--
-- QIDIRUV NAQSHI: `~` (registrga SEZGIR) va har harfning ikkala ko'rinishi
-- aniq yozilgan. `~*` ga tayanilmaydi: kirill harflarida registr farqsizligi
-- bazaning locale/ICU sozlamasiga bog'liq va kafolatlanmagan.
--   [Tt]o.plam — apostrofning har xil ko'rinishi (' ’ ʻ) uchun bitta istalgan belgi.
--   \mAYT\M, \m3D\M — butun so'z (masalan "3Dimensional" yoki "QAYTA" emas).
-- Naqsh 1–3-so'rovlarda takrorlanadi — o'zgartirsangiz, uchalasida ham.

-- 1) NASHR ETILGAN VA QORALAMA TESTLAR NOMI. `isPublished = false` lar ham
--    ko'rsatiladi: keyin nashr qilinsa nom shu holida chiqadi.
SELECT
  t."id",
  t."isPublished",
  t."titleUz",
  t."titleRu",
  t."titleEn"
FROM "Test" t
WHERE concat_ws(' | ', t."titleUz", t."titleRu", t."titleEn") ~
  '[Mm]akarov|[Мм]акаров|[Cc]hesnokov|[Чч]есноков|[Tt]urchina|[Тт]урчина|[Зз]адачник|[Ff]izik [Ss]oru [Bb]ankas|[Tt]o.plam|11-sinf darslik|\mAYT\M|\m3D\M|3800'
ORDER BY t."isPublished" DESC, t."titleUz", t."id";

-- 2) IMPORT BILAN BOG'LANGAN TESTLAR: ImportJob → ImportDraft.itemId → TestItem → Test.
--    DIQQAT: hozirgi kod `ImportDraft.itemId`ni to'ldirmaydi (eksport JSON
--    orqali ustoz o'zi testga qo'yadi), shuning uchun bu so'rov bo'sh qaytishi
--    mumkin — bu xato emas. Shu sababli 3-so'rov alohida beriladi.
SELECT DISTINCT
  t."id"          AS test_id,
  t."isPublished",
  t."titleUz",
  j."id"          AS import_job_id,
  j."fileName"
FROM "ImportJob" j
JOIN "ImportDraft" d ON d."jobId" = j."id" AND d."itemId" IS NOT NULL
JOIN "TestItem" ti   ON ti."itemId" = d."itemId"
JOIN "Test" t        ON t."id" = ti."testId"
ORDER BY t."titleUz", t."id";

-- 3) MANBA NOMI BOR IMPORTLAR (faqat ma'lumot uchun — o'zgartirilmaydi).
--    Shu ustozning shu vaqt atrofida yaratilgan testlarini 1-so'rov bilan
--    solishtirib ko'ring.
SELECT
  j."id",
  j."teacherId",
  j."fileName",
  j."status",
  j."createdAt"
FROM "ImportJob" j
WHERE j."fileName" ~
  '[Mm]akarov|[Мм]акаров|[Cc]hesnokov|[Чч]есноков|[Tt]urchina|[Тт]урчина|[Зз]адачник|[Ff]izik [Ss]oru [Bb]ankas|[Tt]o.plam|11-sinf darslik|\mAYT\M|\m3D\M|3800'
ORDER BY j."createdAt" DESC;

-- 4) MA'LUMOT UCHUN: nashr etilgan testlarda savol matni yoki yechimida
--    shu so'zlar uchraydigan savollar soni (masalan "Makarov 1.23 masalasi").
--    Bu yerda faqat "kitob/muallif" nomlari — AYT/3D/3800 savol matnida
--    tabiiy ravishda uchrashi mumkin (3D shakl, 3800 m), ular kiritilmagan.
SELECT
  t."id"      AS test_id,
  t."titleUz",
  count(*)    AS question_count
FROM "Question" q
JOIN "Test" t ON t."id" = q."testId"
WHERE t."isPublished" = true
  AND concat_ws(' ', q."text", q."explanation") ~
    '[Mm]akarov|[Мм]акаров|[Cc]hesnokov|[Чч]есноков|[Tt]urchina|[Тт]урчина|[Зз]адачник|[Ff]izik [Ss]oru [Bb]ankas'
GROUP BY t."id", t."titleUz"
ORDER BY question_count DESC;

-- 5) YANGILASH ANDOZASI — ataylab izoh ichida. 1-so'rov natijasidan
--    id'larni ko'chirib, har test uchun neytral nom yozing (masalan
--    "Makarov 1.2 Dinamika" → "Dinamika"). Bir xil nom oladigan testlarni
--    bitta UPDATE'ga yig'ish mumkin; boshqacha nomlilar — alohida UPDATE.
--    Avval natijani ko'ring (RETURNING), hammasi to'g'ri bo'lsa COMMIT,
--    aks holda ROLLBACK.
--
-- BEGIN;
--
-- UPDATE "Test"
-- SET "titleUz" = '<yangi nom uz>',
--     "titleRu" = '<yangi nom ru yoki NULL>',
--     "titleEn" = '<yangi nom en yoki NULL>',
--     "updatedAt" = now()
-- WHERE "id" IN ('<id1>', '<id2>')
-- RETURNING "id", "titleUz", "titleRu", "titleEn";
--
-- -- Tekshiruv: 1-so'rovni qayta bajaring — o'zgartirilgan id'lar chiqmasligi kerak.
--
-- COMMIT;   -- yoki ROLLBACK;
