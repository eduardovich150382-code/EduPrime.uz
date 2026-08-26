-- Avtomatik hosil qilingan — QO'LDA TAHRIRLAMANG.
-- Manba: prisma/seeds/topics/*.json (npm run seed:topics orqali qayta hosil qilinadi)
-- Idempotent: ON CONFLICT ("subjectId", "slug") DO UPDATE — qayta qo'yilsa dublikat yozilmaydi.
-- Agar quyidagi fan nomlaridan biri DTM kategoriyasida topilmasa, mos INSERT
-- jimgina 0 qator yozadi — oxiridagi tekshiruv so'rovi shuni ko'rsatadi.
BEGIN;
INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_1415d97c5c82ce6d8c93121e',
  subj."id",
  NULL::text,
  'mexanika',
  'mexanika',
  0,
  'Mexanika',
  NULL,
  NULL,
  ARRAY[7,8,9,10,11]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_4bb581f636934207e858bdf9',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'mexanika'),
  'kinematika',
  'mexanika/kinematika',
  1,
  'Kinematika',
  NULL,
  NULL,
  ARRAY[9]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_91a3368e35df1d08bf41d1e1',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'kinematika'),
  'tekis-harakat',
  'mexanika/kinematika/tekis-harakat',
  2,
  'Tekis harakat',
  NULL,
  NULL,
  ARRAY[9]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_3c7cd50536bee76dd9d6b3c1',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'kinematika'),
  'tezlanish-va-tekis-ozgaruvchan-harakat',
  'mexanika/kinematika/tezlanish-va-tekis-ozgaruvchan-harakat',
  2,
  'Tezlanish va tekis o''zgaruvchan harakat',
  NULL,
  NULL,
  ARRAY[9]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_04a0de1bc7bbaf3c2926eeaf',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'kinematika'),
  'erkin-tushish',
  'mexanika/kinematika/erkin-tushish',
  2,
  'Erkin tushish',
  NULL,
  NULL,
  ARRAY[9]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_2756c999c0279144119279aa',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'kinematika'),
  'egri-chiziqli-harakat',
  'mexanika/kinematika/egri-chiziqli-harakat',
  2,
  'Egri chiziqli harakat',
  NULL,
  NULL,
  ARRAY[9,10]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_8a1bb2cd66ec1e54bc46fd58',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'mexanika'),
  'dinamika',
  'mexanika/dinamika',
  1,
  'Dinamika',
  NULL,
  NULL,
  ARRAY[9]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_5e91facf9b074ef796743152',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'dinamika'),
  'nyuton-qonunlari',
  'mexanika/dinamika/nyuton-qonunlari',
  2,
  'Nyuton qonunlari',
  NULL,
  NULL,
  ARRAY[9]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_7573469178f52f3f03cd3e21',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'dinamika'),
  'erkinlik-kuchi-va-ogirlik-kuchi',
  'mexanika/dinamika/erkinlik-kuchi-va-ogirlik-kuchi',
  2,
  'Erkinlik kuchi va og''irlik kuchi',
  NULL,
  NULL,
  ARRAY[9]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_d2e72a1aa23907bca3ddcd92',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'dinamika'),
  'ishqalanish-kuchi',
  'mexanika/dinamika/ishqalanish-kuchi',
  2,
  'Ishqalanish kuchi',
  NULL,
  NULL,
  ARRAY[9]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_a7112da070a1f07d1fe6d9a5',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'dinamika'),
  'elastiklik-kuchi',
  'mexanika/dinamika/elastiklik-kuchi',
  2,
  'Elastiklik kuchi',
  NULL,
  NULL,
  ARRAY[9]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_a14f401bd3a5a58d9d22fa88',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'mexanika'),
  'statika',
  'mexanika/statika',
  1,
  'Statika',
  NULL,
  NULL,
  ARRAY[9]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_fcdd67a87372227dc3976034',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'statika'),
  'kuchlar-muvozanati',
  'mexanika/statika/kuchlar-muvozanati',
  2,
  'Kuchlar muvozanati',
  NULL,
  NULL,
  ARRAY[9]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_28591d0af4614664fdeadb31',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'statika'),
  'kuch-momenti-va-richag',
  'mexanika/statika/kuch-momenti-va-richag',
  2,
  'Kuch momenti va richag',
  NULL,
  NULL,
  ARRAY[9]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_cadad18cbb93112a316b0152',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'statika'),
  'ogirlik-markazi',
  'mexanika/statika/ogirlik-markazi',
  2,
  'Og''irlik markazi',
  NULL,
  NULL,
  ARRAY[9]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_89f5a0ebbe38bd66a1a3197b',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'statika'),
  'jismlarning-muvozanat-turlari',
  'mexanika/statika/jismlarning-muvozanat-turlari',
  2,
  'Jismlarning muvozanat turlari',
  NULL,
  NULL,
  ARRAY[9]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_8eb8e6f366fba8879532f8ac',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'mexanika'),
  'saqlanish-qonunlari',
  'mexanika/saqlanish-qonunlari',
  1,
  'Saqlanish qonunlari',
  NULL,
  NULL,
  ARRAY[9]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_b2394293415e9fa207683c6d',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'saqlanish-qonunlari'),
  'impulsning-saqlanish-qonuni',
  'mexanika/saqlanish-qonunlari/impulsning-saqlanish-qonuni',
  2,
  'Impulsning saqlanish qonuni',
  NULL,
  NULL,
  ARRAY[9]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_c25e9f77799e732adfcd8e18',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'saqlanish-qonunlari'),
  'mexanik-energiyaning-saqlanish-qonuni',
  'mexanika/saqlanish-qonunlari/mexanik-energiyaning-saqlanish-qonuni',
  2,
  'Mexanik energiyaning saqlanish qonuni',
  NULL,
  NULL,
  ARRAY[9]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_574467af83008bbfebeb1e7e',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'saqlanish-qonunlari'),
  'ish-va-quvvat',
  'mexanika/saqlanish-qonunlari/ish-va-quvvat',
  2,
  'Ish va quvvat',
  NULL,
  NULL,
  ARRAY[9]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_624bbb7b1499d63ed8082234',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'mexanika'),
  'aylanma-harakat',
  'mexanika/aylanma-harakat',
  1,
  'Aylanma harakat',
  NULL,
  NULL,
  ARRAY[9,10]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_8ba8d97a9154685553718fe6',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'aylanma-harakat'),
  'burchak-tezlik-va-chiziqli-tezlik',
  'mexanika/aylanma-harakat/burchak-tezlik-va-chiziqli-tezlik',
  2,
  'Burchak tezlik va chiziqli tezlik',
  NULL,
  NULL,
  ARRAY[10]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_6fe3b46cef360956576ac601',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'aylanma-harakat'),
  'markazga-intilma-tezlanish',
  'mexanika/aylanma-harakat/markazga-intilma-tezlanish',
  2,
  'Markazga intilma tezlanish',
  NULL,
  NULL,
  ARRAY[10]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_4e63d60d34ae195e2e9e7639',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'aylanma-harakat'),
  'aylana-boylab-tekis-harakat',
  'mexanika/aylanma-harakat/aylana-boylab-tekis-harakat',
  2,
  'Aylana bo''ylab tekis harakat',
  NULL,
  NULL,
  ARRAY[10]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_6689917dc747e8dd970d8be6',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'aylanma-harakat'),
  'markazdan-qochma-kuch',
  'mexanika/aylanma-harakat/markazdan-qochma-kuch',
  2,
  'Markazdan qochma kuch',
  NULL,
  NULL,
  ARRAY[10]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_cdd011c6ab0e97cee6c473be',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'mexanika'),
  'gidromexanika',
  'mexanika/gidromexanika',
  1,
  'Gidromexanika',
  NULL,
  NULL,
  ARRAY[7,10]::integer[],
  5
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_4cf478704142da7ae2b6b171',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'gidromexanika'),
  'paskal-qonuni',
  'mexanika/gidromexanika/paskal-qonuni',
  2,
  'Paskal qonuni',
  NULL,
  NULL,
  ARRAY[7]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_be28bea796539a2a90026dda',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'gidromexanika'),
  'arximed-kuchi',
  'mexanika/gidromexanika/arximed-kuchi',
  2,
  'Arximed kuchi',
  NULL,
  NULL,
  ARRAY[7]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_623a8e380c7cd7c1329746f9',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'gidromexanika'),
  'bernulli-tenglamasi',
  'mexanika/gidromexanika/bernulli-tenglamasi',
  2,
  'Bernulli tenglamasi',
  NULL,
  NULL,
  ARRAY[10]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_7cf79b299ca765e8c7c33834',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'gidromexanika'),
  'suyuqlik-oqimining-uzluksizlik-tenglamasi',
  'mexanika/gidromexanika/suyuqlik-oqimining-uzluksizlik-tenglamasi',
  2,
  'Suyuqlik oqimining uzluksizlik tenglamasi',
  NULL,
  NULL,
  ARRAY[10]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_8a511807eb3fc9c878b7c4ac',
  subj."id",
  NULL::text,
  'molekulyar-fizika-va-termodinamika',
  'molekulyar-fizika-va-termodinamika',
  0,
  'Molekulyar fizika va termodinamika',
  NULL,
  NULL,
  ARRAY[8,10]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_8df968570a08b747535cacda',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'molekulyar-fizika-va-termodinamika'),
  'mktn-asoslari',
  'molekulyar-fizika-va-termodinamika/mktn-asoslari',
  1,
  'Modda tuzilishining molekulyar-kinetik nazariyasi',
  NULL,
  NULL,
  ARRAY[10]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_4f21d017c6fde743f59e6145',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'molekulyar-fizika-va-termodinamika'),
  'ideal-gaz-qonunlari',
  'molekulyar-fizika-va-termodinamika/ideal-gaz-qonunlari',
  1,
  'Ideal gaz qonunlari',
  NULL,
  NULL,
  ARRAY[10]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_c146eb2e7d5f1b36e9f3e858',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'molekulyar-fizika-va-termodinamika'),
  'termodinamika-asoslari',
  'molekulyar-fizika-va-termodinamika/termodinamika-asoslari',
  1,
  'Termodinamika asoslari',
  NULL,
  NULL,
  ARRAY[10]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_929eef5303e92c94a79df056',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'molekulyar-fizika-va-termodinamika'),
  'fazaviy-otishlar',
  'molekulyar-fizika-va-termodinamika/fazaviy-otishlar',
  1,
  'Fazaviy o''tishlar (bug''lanish, kondensatsiya, kristallanish)',
  NULL,
  NULL,
  ARRAY[8,10]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_f2b90ccb5923c13fa8cbec15',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'molekulyar-fizika-va-termodinamika'),
  'sirt-taranglik-va-namlanish',
  'molekulyar-fizika-va-termodinamika/sirt-taranglik-va-namlanish',
  1,
  'Sirt taranglik va namlanish',
  NULL,
  NULL,
  ARRAY[10]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_028373df314c8ec483d527f0',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'molekulyar-fizika-va-termodinamika'),
  'qattiq-jismlar-fizikasi',
  'molekulyar-fizika-va-termodinamika/qattiq-jismlar-fizikasi',
  1,
  'Qattiq jismlar fizikasi',
  NULL,
  NULL,
  ARRAY[10]::integer[],
  5
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_203d0ebe676140908996fddd',
  subj."id",
  NULL::text,
  'elektr-va-magnetizm',
  'elektr-va-magnetizm',
  0,
  'Elektr va magnetizm',
  NULL,
  NULL,
  ARRAY[8,10,11]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_6136851c40187b3b9dcafc86',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektr-va-magnetizm'),
  'elektrostatika',
  'elektr-va-magnetizm/elektrostatika',
  1,
  'Elektrostatika',
  NULL,
  NULL,
  ARRAY[10]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_3ee320519b9efd643ba84f99',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektr-va-magnetizm'),
  'ozgarmas-elektr-tok',
  'elektr-va-magnetizm/ozgarmas-elektr-tok',
  1,
  'O''zgarmas elektr tok',
  NULL,
  NULL,
  ARRAY[8,10]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_8e8b4d74ef041133bd2177d3',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektr-va-magnetizm'),
  'yarimotkazgichlar',
  'elektr-va-magnetizm/yarimotkazgichlar',
  1,
  'Yarimo''tkazgichlar',
  NULL,
  NULL,
  ARRAY[10,11]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_3fa4c6100067696908d4e9a9',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektr-va-magnetizm'),
  'magnit-maydon',
  'elektr-va-magnetizm/magnit-maydon',
  1,
  'Magnit maydon',
  NULL,
  NULL,
  ARRAY[10]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_9cecf87969561934a9fba8f3',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektr-va-magnetizm'),
  'elektromagnit-induksiya',
  'elektr-va-magnetizm/elektromagnit-induksiya',
  1,
  'Elektromagnit induksiya',
  NULL,
  NULL,
  ARRAY[11]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_a692118da9604fb705a54c53',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektr-va-magnetizm'),
  'ozgaruvchan-tok',
  'elektr-va-magnetizm/ozgaruvchan-tok',
  1,
  'O''zgaruvchan tok',
  NULL,
  NULL,
  ARRAY[11]::integer[],
  5
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_5ced10faffb0f31559709c95',
  subj."id",
  NULL::text,
  'tebranishlar-va-tolqinlar',
  'tebranishlar-va-tolqinlar',
  0,
  'Tebranishlar va to''lqinlar',
  NULL,
  NULL,
  ARRAY[9,11]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_9c1f42c0207896359357ac9f',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'tebranishlar-va-tolqinlar'),
  'mexanik-tebranishlar',
  'tebranishlar-va-tolqinlar/mexanik-tebranishlar',
  1,
  'Mexanik tebranishlar',
  NULL,
  NULL,
  ARRAY[9]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_250c7886686217c089f8a4fb',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'tebranishlar-va-tolqinlar'),
  'mexanik-tolqinlar-va-tovush',
  'tebranishlar-va-tolqinlar/mexanik-tolqinlar-va-tovush',
  1,
  'Mexanik to''lqinlar va tovush',
  NULL,
  NULL,
  ARRAY[9]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_d47fbf84c748a3e493a54d9c',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'tebranishlar-va-tolqinlar'),
  'elektromagnit-tebranishlar',
  'tebranishlar-va-tolqinlar/elektromagnit-tebranishlar',
  1,
  'Elektromagnit tebranishlar',
  NULL,
  NULL,
  ARRAY[11]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_32868081e54e929f0bbc8222',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'tebranishlar-va-tolqinlar'),
  'elektromagnit-tolqinlar',
  'tebranishlar-va-tolqinlar/elektromagnit-tolqinlar',
  1,
  'Elektromagnit to''lqinlar',
  NULL,
  NULL,
  ARRAY[11]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_8ef625730dabaec98c1e4756',
  subj."id",
  NULL::text,
  'optika',
  'optika',
  0,
  'Optika',
  NULL,
  NULL,
  ARRAY[11]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_29d59b55049d06873440284a',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'optika'),
  'geometrik-optika',
  'optika/geometrik-optika',
  1,
  'Geometrik optika',
  NULL,
  NULL,
  ARRAY[11]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_9c05f86b3c74f29c393af666',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'optika'),
  'yoruglikning-tolqin-xossalari',
  'optika/yoruglikning-tolqin-xossalari',
  1,
  'Yorug''likning to''lqin xossalari',
  NULL,
  NULL,
  ARRAY[11]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_2fb99773535ac5104f5a92b6',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'optika'),
  'yoruglikning-kvant-xossalari',
  'optika/yoruglikning-kvant-xossalari',
  1,
  'Yorug''likning kvant xossalari',
  NULL,
  NULL,
  ARRAY[11]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_686ef2bc516f433f3dd4fb16',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'optika'),
  'linzalar-va-optik-asboblar',
  'optika/linzalar-va-optik-asboblar',
  1,
  'Linzalar va optik asboblar',
  NULL,
  NULL,
  ARRAY[11]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_b58761928422f6df82e0a7ab',
  subj."id",
  NULL::text,
  'kvant-va-atom-fizikasi',
  'kvant-va-atom-fizikasi',
  0,
  'Kvant va atom fizikasi',
  NULL,
  NULL,
  ARRAY[11]::integer[],
  5
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_98496b8ab77c1e0e93f9faae',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'kvant-va-atom-fizikasi'),
  'atom-tuzilishi',
  'kvant-va-atom-fizikasi/atom-tuzilishi',
  1,
  'Atom tuzilishi',
  NULL,
  NULL,
  ARRAY[11]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_900cc10b507ae21509f09354',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'kvant-va-atom-fizikasi'),
  'atom-yadrosi-fizikasi',
  'kvant-va-atom-fizikasi/atom-yadrosi-fizikasi',
  1,
  'Atom yadrosi fizikasi',
  NULL,
  NULL,
  ARRAY[11]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_911e8f6b209023ab55b6d090',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'kvant-va-atom-fizikasi'),
  'radioaktivlik',
  'kvant-va-atom-fizikasi/radioaktivlik',
  1,
  'Radioaktivlik',
  NULL,
  NULL,
  ARRAY[11]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_a83c1b06db2d592074b2fa63',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'kvant-va-atom-fizikasi'),
  'yadro-reaksiyalari',
  'kvant-va-atom-fizikasi/yadro-reaksiyalari',
  1,
  'Yadro reaksiyalari',
  NULL,
  NULL,
  ARRAY[11]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Fizika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_1201f283f93a6c1d8856f6a2',
  subj."id",
  NULL::text,
  'sonlar-va-amallar',
  'sonlar-va-amallar',
  0,
  'Sonlar va amallar',
  NULL,
  NULL,
  ARRAY[5,6,7,8,9,10,11]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Matematika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_a68e093c822825d5afd37e13',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'sonlar-va-amallar'),
  'natural-va-butun-sonlar',
  'sonlar-va-amallar/natural-va-butun-sonlar',
  1,
  'Natural va butun sonlar',
  NULL,
  NULL,
  ARRAY[5,6]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Matematika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_b92cd022aef12339aa2718f2',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'sonlar-va-amallar'),
  'ratsional-va-irratsional-sonlar',
  'sonlar-va-amallar/ratsional-va-irratsional-sonlar',
  1,
  'Ratsional va irratsional sonlar',
  NULL,
  NULL,
  ARRAY[8]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Matematika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_4f091b05b61d003bedef6c25',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'sonlar-va-amallar'),
  'foizlar',
  'sonlar-va-amallar/foizlar',
  1,
  'Foizlar',
  NULL,
  NULL,
  ARRAY[5,6]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Matematika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_d3a3330ea5f078dd5d3d7d8e',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'sonlar-va-amallar'),
  'proporsiya-va-nisbat',
  'sonlar-va-amallar/proporsiya-va-nisbat',
  1,
  'Proporsiya va nisbat',
  NULL,
  NULL,
  ARRAY[6]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Matematika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_d69a709bb1bbf73933d0156c',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'sonlar-va-amallar'),
  'daraja-va-ildiz',
  'sonlar-va-amallar/daraja-va-ildiz',
  1,
  'Daraja va ildiz',
  NULL,
  NULL,
  ARRAY[7,8,9]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Matematika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_bfbdad99d6b51bb1cb9c10ab',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'sonlar-va-amallar'),
  'modul',
  'sonlar-va-amallar/modul',
  1,
  'Modul',
  NULL,
  NULL,
  ARRAY[6,7]::integer[],
  5
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Matematika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_280944d46021bb9437f7b330',
  subj."id",
  NULL::text,
  'algebraik-ifodalar-va-tenglamalar',
  'algebraik-ifodalar-va-tenglamalar',
  0,
  'Algebraik ifodalar va tenglamalar',
  NULL,
  NULL,
  ARRAY[7,8,9]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Matematika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_c4801f971155998651b32c5b',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'algebraik-ifodalar-va-tenglamalar'),
  'kophadlar',
  'algebraik-ifodalar-va-tenglamalar/kophadlar',
  1,
  'Ko''phadlar',
  NULL,
  NULL,
  ARRAY[7]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Matematika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_5a655bfe6775afa5a893d95c',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'algebraik-ifodalar-va-tenglamalar'),
  'kopaytuvchilarga-ajratish',
  'algebraik-ifodalar-va-tenglamalar/kopaytuvchilarga-ajratish',
  1,
  'Ko''paytuvchilarga ajratish',
  NULL,
  NULL,
  ARRAY[7]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Matematika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_f7f964937ab7cc1cf22f3f3d',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'algebraik-ifodalar-va-tenglamalar'),
  'ratsional-ifodalar',
  'algebraik-ifodalar-va-tenglamalar/ratsional-ifodalar',
  1,
  'Ratsional ifodalar',
  NULL,
  NULL,
  ARRAY[8]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Matematika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_7455677d04e2f6e9eb2f1d43',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'algebraik-ifodalar-va-tenglamalar'),
  'chiziqli-tenglama-va-tengsizliklar',
  'algebraik-ifodalar-va-tenglamalar/chiziqli-tenglama-va-tengsizliklar',
  1,
  'Chiziqli tenglama va tengsizliklar',
  NULL,
  NULL,
  ARRAY[7]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Matematika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_02af2dcb4728a825fc66be8b',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'algebraik-ifodalar-va-tenglamalar'),
  'kvadrat-tenglama-va-tengsizliklar',
  'algebraik-ifodalar-va-tenglamalar/kvadrat-tenglama-va-tengsizliklar',
  1,
  'Kvadrat tenglama va tengsizliklar',
  NULL,
  NULL,
  ARRAY[8,9]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Matematika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_cfacafc7e19cdae5ee823a2e',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'algebraik-ifodalar-va-tenglamalar'),
  'tenglamalar-sistemasi',
  'algebraik-ifodalar-va-tenglamalar/tenglamalar-sistemasi',
  1,
  'Tenglamalar sistemasi',
  NULL,
  NULL,
  ARRAY[7,9]::integer[],
  5
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Matematika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_0bf2635e9b85121144948d9c',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'algebraik-ifodalar-va-tenglamalar'),
  'modulli-tenglama-va-tengsizliklar',
  'algebraik-ifodalar-va-tenglamalar/modulli-tenglama-va-tengsizliklar',
  1,
  'Modulli tenglama va tengsizliklar',
  NULL,
  NULL,
  ARRAY[9]::integer[],
  6
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Matematika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_a5bd5c63f650f2cf7ff2c143',
  subj."id",
  NULL::text,
  'funksiyalar',
  'funksiyalar',
  0,
  'Funksiyalar',
  NULL,
  NULL,
  ARRAY[8,9,10]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Matematika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_968fbf7ebaf9d86dc6196ab6',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'funksiyalar'),
  'funksiya-tushunchasi-va-grafigi',
  'funksiyalar/funksiya-tushunchasi-va-grafigi',
  1,
  'Funksiya tushunchasi va grafigi',
  NULL,
  NULL,
  ARRAY[8]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Matematika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_c4d2ba57e943a1fd183a5b2c',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'funksiyalar'),
  'chiziqli-funksiya',
  'funksiyalar/chiziqli-funksiya',
  1,
  'Chiziqli funksiya',
  NULL,
  NULL,
  ARRAY[7]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Matematika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_f4c8a95b51ba352e488c816d',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'funksiyalar'),
  'kvadratik-funksiya',
  'funksiyalar/kvadratik-funksiya',
  1,
  'Kvadratik funksiya',
  NULL,
  NULL,
  ARRAY[8,9]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Matematika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_a0999b7078f4049c984ba2e9',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'funksiyalar'),
  'darajali-funksiya',
  'funksiyalar/darajali-funksiya',
  1,
  'Darajali funksiya',
  NULL,
  NULL,
  ARRAY[9]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Matematika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_aeaf40754199c79bc7f14383',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'funksiyalar'),
  'korsatkichli-funksiya',
  'funksiyalar/korsatkichli-funksiya',
  1,
  'Ko''rsatkichli funksiya',
  NULL,
  NULL,
  ARRAY[10]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Matematika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_30d7bca74cdca9f1d473fa8e',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'funksiyalar'),
  'logarifmik-funksiya',
  'funksiyalar/logarifmik-funksiya',
  1,
  'Logarifmik funksiya',
  NULL,
  NULL,
  ARRAY[10]::integer[],
  5
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Matematika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_24ebda7819fe549e62526a7a',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'funksiyalar'),
  'trigonometrik-funksiyalar',
  'funksiyalar/trigonometrik-funksiyalar',
  1,
  'Trigonometrik funksiyalar',
  NULL,
  NULL,
  ARRAY[10]::integer[],
  6
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Matematika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_9a85c590aa2b40779e7cb873',
  subj."id",
  NULL::text,
  'trigonometriya',
  'trigonometriya',
  0,
  'Trigonometriya',
  NULL,
  NULL,
  ARRAY[10]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Matematika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_7fc62ff6348874c7634dc968',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'trigonometriya'),
  'burchak-olchov-birliklari',
  'trigonometriya/burchak-olchov-birliklari',
  1,
  'Burchak o''lchov birliklari (radian, gradus)',
  NULL,
  NULL,
  ARRAY[10]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Matematika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_b23ae77b8073130e3b6c5c5b',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'trigonometriya'),
  'trigonometrik-ayniyatlar',
  'trigonometriya/trigonometrik-ayniyatlar',
  1,
  'Trigonometrik ayniyatlar',
  NULL,
  NULL,
  ARRAY[10]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Matematika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_02e9e6b589dc0080d06786b5',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'trigonometriya'),
  'trigonometrik-tenglamalar',
  'trigonometriya/trigonometrik-tenglamalar',
  1,
  'Trigonometrik tenglamalar',
  NULL,
  NULL,
  ARRAY[10]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Matematika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_69cd6500c2eb82d7b4573e0e',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'trigonometriya'),
  'trigonometrik-tengsizliklar',
  'trigonometriya/trigonometrik-tengsizliklar',
  1,
  'Trigonometrik tengsizliklar',
  NULL,
  NULL,
  ARRAY[10]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Matematika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_541fa46b3677ba98338a2ac1',
  subj."id",
  NULL::text,
  'progressiyalar',
  'progressiyalar',
  0,
  'Progressiyalar',
  NULL,
  NULL,
  ARRAY[9]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Matematika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_b9078001e2cb044494212cd4',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'progressiyalar'),
  'arifmetik-progressiya',
  'progressiyalar/arifmetik-progressiya',
  1,
  'Arifmetik progressiya',
  NULL,
  NULL,
  ARRAY[9]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Matematika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_bb53fa0f8cb941cb403a8215',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'progressiyalar'),
  'geometrik-progressiya',
  'progressiyalar/geometrik-progressiya',
  1,
  'Geometrik progressiya',
  NULL,
  NULL,
  ARRAY[9]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Matematika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_b6bc62cc5e5856ad9ba11afa',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'progressiyalar'),
  'progressiyalarga-doir-masalalar',
  'progressiyalar/progressiyalarga-doir-masalalar',
  1,
  'Progressiyalarga doir masalalar',
  NULL,
  NULL,
  ARRAY[9]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Matematika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_7584e068d831ed1b5c5344f9',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'progressiyalar'),
  'cheksiz-kamayuvchi-geometrik-progressiya',
  'progressiyalar/cheksiz-kamayuvchi-geometrik-progressiya',
  1,
  'Cheksiz kamayuvchi geometrik progressiya',
  NULL,
  NULL,
  ARRAY[11]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Matematika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_48f62df332423f4d0e40bda0',
  subj."id",
  NULL::text,
  'planimetriya',
  'planimetriya',
  0,
  'Planimetriya',
  NULL,
  NULL,
  ARRAY[7,8,9]::integer[],
  5
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Matematika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_765c0b55bff0287ee7ca035a',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'planimetriya'),
  'uchburchaklar',
  'planimetriya/uchburchaklar',
  1,
  'Uchburchaklar',
  NULL,
  NULL,
  ARRAY[7,8]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Matematika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_df952688355995d98df12a5c',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'planimetriya'),
  'tortburchaklar',
  'planimetriya/tortburchaklar',
  1,
  'To''rtburchaklar',
  NULL,
  NULL,
  ARRAY[8]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Matematika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_fbe69f5482420b6abbb2e79b',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'planimetriya'),
  'aylana-va-doira',
  'planimetriya/aylana-va-doira',
  1,
  'Aylana va doira',
  NULL,
  NULL,
  ARRAY[8,9]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Matematika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_5e0e8bfcd7c0927ed345b061',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'planimetriya'),
  'yuzlar',
  'planimetriya/yuzlar',
  1,
  'Yuzlar',
  NULL,
  NULL,
  ARRAY[8,9]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Matematika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_cbe86bf043c6c48302ed49d4',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'planimetriya'),
  'vektorlar-va-koordinatalar-usuli',
  'planimetriya/vektorlar-va-koordinatalar-usuli',
  1,
  'Vektorlar va koordinatalar usuli',
  NULL,
  NULL,
  ARRAY[9]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Matematika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_a33cc920173882ba2b8fdbce',
  subj."id",
  NULL::text,
  'stereometriya',
  'stereometriya',
  0,
  'Stereometriya',
  NULL,
  NULL,
  ARRAY[10,11]::integer[],
  6
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Matematika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_d3d052b242baa57fd5b8827b',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'stereometriya'),
  'togri-chiziq-va-tekisliklar',
  'stereometriya/togri-chiziq-va-tekisliklar',
  1,
  'To''g''ri chiziq va tekisliklar',
  NULL,
  NULL,
  ARRAY[10]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Matematika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_602a13a44ad99f9ed1a8b974',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'stereometriya'),
  'kopyoqlar',
  'stereometriya/kopyoqlar',
  1,
  'Ko''pyoqlar',
  NULL,
  NULL,
  ARRAY[10,11]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Matematika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_c9f5afd2cc22f130dea9be8f',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'stereometriya'),
  'prizma-va-piramida',
  'stereometriya/prizma-va-piramida',
  1,
  'Prizma va piramida',
  NULL,
  NULL,
  ARRAY[10,11]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Matematika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_9ddbe8edf14a3d5eb835b991',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'stereometriya'),
  'aylanish-jismlari',
  'stereometriya/aylanish-jismlari',
  1,
  'Aylanish jismlari (silindr, konus, shar)',
  NULL,
  NULL,
  ARRAY[11]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Matematika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_35d02b08e57aa826755b1f39',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'stereometriya'),
  'yuza-va-hajmlar',
  'stereometriya/yuza-va-hajmlar',
  1,
  'Ko''pyoqlar va aylanish jismlarining yuza va hajmlari',
  NULL,
  NULL,
  ARRAY[11]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Matematika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_2a6b40fe673db5525544f851',
  subj."id",
  NULL::text,
  'matematik-analiz-asoslari',
  'matematik-analiz-asoslari',
  0,
  'Matematik analiz asoslari',
  NULL,
  NULL,
  ARRAY[10,11]::integer[],
  7
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Matematika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_b58bf389d6897719fe507271',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'matematik-analiz-asoslari'),
  'limit-va-uzluksizlik',
  'matematik-analiz-asoslari/limit-va-uzluksizlik',
  1,
  'Limit va uzluksizlik',
  NULL,
  NULL,
  ARRAY[10]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Matematika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_5c17dc0abcb1fad45a86c237',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'matematik-analiz-asoslari'),
  'hosila-va-uning-tatbiqlari',
  'matematik-analiz-asoslari/hosila-va-uning-tatbiqlari',
  1,
  'Hosila va uning tatbiqlari',
  NULL,
  NULL,
  ARRAY[10,11]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Matematika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_d097a2a4b79c071b298e6bfe',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'matematik-analiz-asoslari'),
  'integral-va-uning-tatbiqlari',
  'matematik-analiz-asoslari/integral-va-uning-tatbiqlari',
  1,
  'Integral va uning tatbiqlari',
  NULL,
  NULL,
  ARRAY[11]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Matematika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_f834c61abba2886ed08c75fd',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'matematik-analiz-asoslari'),
  'kombinatorika',
  'matematik-analiz-asoslari/kombinatorika',
  1,
  'Kombinatorika',
  NULL,
  NULL,
  ARRAY[11]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Matematika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_ba22a61eb2e37df85f879d50',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'matematik-analiz-asoslari'),
  'ehtimollar-nazariyasi',
  'matematik-analiz-asoslari/ehtimollar-nazariyasi',
  1,
  'Ehtimollar nazariyasi',
  NULL,
  NULL,
  ARRAY[11]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND subj."nameUz" = 'Matematika'
LIMIT 1
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";
COMMIT;

-- Tekshiruv: har fan uchun qancha mavzu yozilganini ko'rsatadi.
SELECT s."nameUz" AS subject, count(*) AS topic_count
FROM "TopicNode" tn JOIN "Subject" s ON s."id" = tn."subjectId"
GROUP BY s."nameUz" ORDER BY s."nameUz";
