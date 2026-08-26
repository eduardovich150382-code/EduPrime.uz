-- Avtomatik hosil qilingan — QO'LDA TAHRIRLAMANG.
-- Manba: prisma/seeds/topics/*.json (npm run seed:topics orqali qayta hosil qilinadi)
-- Idempotent: ON CONFLICT ("subjectId", "slug") DO UPDATE — qayta qo'yilsa dublikat yozilmaydi.
-- Agar quyidagi fan nomlaridan biri DTM kategoriyasida topilmasa, mos INSERT
-- jimgina 0 qator yozadi — oxiridagi tekshiruv so'rovi shuni ko'rsatadi.
BEGIN;
INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "grade", "order")
SELECT
  'tn_ace55066143ac5b0d443651c',
  subj."id",
  NULL::text,
  'mexanika',
  'mexanika',
  0,
  'Mexanika',
  NULL,
  NULL,
  ARRAY[7,10]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_562230c9177169e9a3ef4265',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'mexanika'),
  'kinematika',
  'mexanika/kinematika',
  1,
  'Kinematika',
  NULL,
  NULL,
  ARRAY[7,10]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_e739495116a25fae0424b81f',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'kinematika'),
  'mexanik-harakat',
  'mexanika/kinematika/mexanik-harakat',
  2,
  'Mexanik harakat. Moddiy nuqta, trayektoriya, ko''chish, yo''l tushunchalari',
  NULL,
  NULL,
  ARRAY[7]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_6a1b74c237914733b69d79b8',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'kinematika'),
  'sanoq-sistemasi-vektorlar',
  'mexanika/kinematika/sanoq-sistemasi-vektorlar',
  2,
  'Sanoq sistemasi. Vektor kattaliklar va ular ustidagi amallar',
  NULL,
  NULL,
  ARRAY[7]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_efb13b3bdbaa5f8edc3612a4',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'kinematika'),
  'tekis-harakat',
  'mexanika/kinematika/tekis-harakat',
  2,
  'To''g''ri chiziqli tekis harakat va uning tezligi',
  NULL,
  NULL,
  ARRAY[7]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_20be3d59c4970cf03cae2bcd',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'kinematika'),
  'harakat-nisbiyligi',
  'mexanika/kinematika/harakat-nisbiyligi',
  2,
  'Harakatning nisbiyligi',
  NULL,
  NULL,
  ARRAY[7]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_769c5ebf4aecfd342d00535e',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'kinematika'),
  'tekis-ozgaruvchan-harakat',
  'mexanika/kinematika/tekis-ozgaruvchan-harakat',
  2,
  'To''g''ri chiziqli tekis o''zgaruvchan harakat',
  NULL,
  NULL,
  ARRAY[7]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_34582d316925949f12bb5df2',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'kinematika'),
  'tekis-ozgaruvchan-kochish',
  'mexanika/kinematika/tekis-ozgaruvchan-kochish',
  2,
  'To''g''ri chiziqli tekis o''zgaruvchan harakatda ko''chish',
  NULL,
  NULL,
  ARRAY[7]::integer[],
  5
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_04a55c18760fad6c4d788781',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'kinematika'),
  'notekis-ozgaruvchan-harakat',
  'mexanika/kinematika/notekis-ozgaruvchan-harakat',
  2,
  'To''g''ri chiziqli notekis o''zgaruvchan harakat',
  NULL,
  NULL,
  ARRAY[7,10]::integer[],
  6
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_8ea480352586f9d9c33c3ea6',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'kinematika'),
  'ortacha-tezlik',
  'mexanika/kinematika/ortacha-tezlik',
  2,
  'O''rtacha tezlik',
  NULL,
  NULL,
  ARRAY[7]::integer[],
  7
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_8daa42fc8e4ed31c9b31c298',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'kinematika'),
  'erkin-tushish',
  'mexanika/kinematika/erkin-tushish',
  2,
  'Jismlarning erkin tushishi',
  NULL,
  NULL,
  ARRAY[7]::integer[],
  8
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_9114deb4366976f5d610dc4f',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'kinematika'),
  'tik-otilgan-jism',
  'mexanika/kinematika/tik-otilgan-jism',
  2,
  'Yuqoriga tik otilgan jism harakati',
  NULL,
  NULL,
  ARRAY[7,10]::integer[],
  9
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_795c93ab0a237e0644f42465',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'kinematika'),
  'aylana-boylab-tekis-harakat',
  'mexanika/kinematika/aylana-boylab-tekis-harakat',
  2,
  'Egri chiziqli harakat. Aylana bo''ylab tekis harakat',
  NULL,
  NULL,
  ARRAY[7]::integer[],
  10
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_810f250866e03a035488ca23',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'kinematika'),
  'aylanma-harakat-uzatish',
  'mexanika/kinematika/aylanma-harakat-uzatish',
  2,
  'Aylanma harakatni uzatish',
  NULL,
  NULL,
  ARRAY[7]::integer[],
  11
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_e35fd51daf0f17b71f1d9b2c',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'kinematika'),
  'markazga-intilma-tezlanish',
  'mexanika/kinematika/markazga-intilma-tezlanish',
  2,
  'Markazga intilma tezlanish',
  NULL,
  NULL,
  ARRAY[7]::integer[],
  12
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_e4d3894e8c4847b402d943bd',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'kinematika'),
  'aylana-boylab-notekis-harakat',
  'mexanika/kinematika/aylana-boylab-notekis-harakat',
  2,
  'Aylana bo''ylab notekis harakat',
  NULL,
  NULL,
  ARRAY[7,10]::integer[],
  13
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_c2f985cb97dd4b0157869f90',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'kinematika'),
  'gorizontal-otilgan-jism',
  'mexanika/kinematika/gorizontal-otilgan-jism',
  2,
  'Gorizontal otilgan jism harakati',
  NULL,
  NULL,
  ARRAY[7,10]::integer[],
  14
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_330435b84a6d3b5c43844a87',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'kinematika'),
  'qiya-otilgan-jism',
  'mexanika/kinematika/qiya-otilgan-jism',
  2,
  'Gorizontga qiya otilgan jism harakati',
  NULL,
  NULL,
  ARRAY[7,10]::integer[],
  15
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_528d48d5275e249514e26f6d',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'mexanika'),
  'dinamika',
  'mexanika/dinamika',
  1,
  'Dinamika',
  NULL,
  NULL,
  ARRAY[7,10]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_28597979dc56c857f7bf5c71',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'dinamika'),
  'massa-va-zichlik',
  'mexanika/dinamika/massa-va-zichlik',
  2,
  'Massa va zichlik',
  NULL,
  NULL,
  ARRAY[7]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_5752ec6abd903d8da0988ec2',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'dinamika'),
  'nyuton-qonunlari',
  'mexanika/dinamika/nyuton-qonunlari',
  2,
  'Nyutonning I, II, III qonunlari',
  NULL,
  NULL,
  ARRAY[7,10]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_2d6dbd2cdbfaffefd3b67437',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'dinamika'),
  'markazga-intilma-kuch',
  'mexanika/dinamika/markazga-intilma-kuch',
  2,
  'Markazga intilma va markazdan qochma kuch',
  NULL,
  NULL,
  ARRAY[7,10]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_87eb586065ab13e557119f94',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'dinamika'),
  'butun-olam-tortishish',
  'mexanika/dinamika/butun-olam-tortishish',
  2,
  'Butun olam tortishish qonuni. Gravitatsiya kuchi',
  NULL,
  NULL,
  ARRAY[7,10]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_de73f0ffa6b5de7f47906826',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'dinamika'),
  'kosmik-tezliklar',
  'mexanika/dinamika/kosmik-tezliklar',
  2,
  'Kosmik tezliklar',
  NULL,
  NULL,
  ARRAY[7,10]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_b8165a13291a42d0c4a98ee8',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'dinamika'),
  'ogirlik-va-harakat',
  'mexanika/dinamika/ogirlik-va-harakat',
  2,
  'Jism og''irligining uning harakat turlariga bog''liqligi',
  NULL,
  NULL,
  ARRAY[7,10]::integer[],
  5
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_71b471566c34e49ac6c393b4',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'dinamika'),
  'elastiklik-kuchi',
  'mexanika/dinamika/elastiklik-kuchi',
  2,
  'Elastiklik kuchi',
  NULL,
  NULL,
  ARRAY[7,10]::integer[],
  6
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_c8abb15c7d44bbad5a93f041',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'mexanika'),
  'ishqalanish-va-impuls',
  'mexanika/ishqalanish-va-impuls',
  1,
  'Ishqalanish kuchi va impuls',
  NULL,
  NULL,
  ARRAY[7,10]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_47074fd76e4740f878d68a00',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ishqalanish-va-impuls'),
  'gorizontal-ishqalanish',
  'mexanika/ishqalanish-va-impuls/gorizontal-ishqalanish',
  2,
  'Gorizontal tekislikda sirpanish ishqalanish kuchi',
  NULL,
  NULL,
  ARRAY[7,10]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_62cb2aac8ae2cc0e18193a26',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ishqalanish-va-impuls'),
  'qiya-tekislik-ishqalanish',
  'mexanika/ishqalanish-va-impuls/qiya-tekislik-ishqalanish',
  2,
  'Qiya tekislikda sirpanish ishqalanish kuchi',
  NULL,
  NULL,
  ARRAY[7,10]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_d04cc62a72a0e0a658bf87cc',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ishqalanish-va-impuls'),
  'bir-nechta-kuch',
  'mexanika/ishqalanish-va-impuls/bir-nechta-kuch',
  2,
  'Bir nechta kuchlar ta''siri ostidagi harakat',
  NULL,
  NULL,
  ARRAY[7,10]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_3273eeb338ed4bf73113e1fd',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ishqalanish-va-impuls'),
  'bloklar',
  'mexanika/ishqalanish-va-impuls/bloklar',
  2,
  'Ko''chmas va ko''char bloklar',
  NULL,
  NULL,
  ARRAY[7,10]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_4ef4a1e18085203a5721d909',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ishqalanish-va-impuls'),
  'impuls',
  'mexanika/ishqalanish-va-impuls/impuls',
  2,
  'Jism va kuch impulsi',
  NULL,
  NULL,
  ARRAY[7,10]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_fadab2c101e01279fdab3a84',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ishqalanish-va-impuls'),
  'impuls-saqlanish',
  'mexanika/ishqalanish-va-impuls/impuls-saqlanish',
  2,
  'Impulsning saqlanish qonuni',
  NULL,
  NULL,
  ARRAY[7,10]::integer[],
  5
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_f5968b7bb92f7416cdb61b9c',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'mexanika'),
  'ish-va-energiya',
  'mexanika/ish-va-energiya',
  1,
  'Mexanik ish va mexanik energiya',
  NULL,
  NULL,
  ARRAY[7,10]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_0143b421b80ce3d8c77ef8f5',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ish-va-energiya'),
  'mexanik-ish',
  'mexanika/ish-va-energiya/mexanik-ish',
  2,
  'Mexanik ish',
  NULL,
  NULL,
  ARRAY[7,10]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_118817f4d7f1f11e08c21135',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ish-va-energiya'),
  'quvvat',
  'mexanika/ish-va-energiya/quvvat',
  2,
  'Quvvat',
  NULL,
  NULL,
  ARRAY[7,10]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_cd5336f1ae61284b218864c4',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ish-va-energiya'),
  'foydali-ish-koeffitsienti',
  'mexanika/ish-va-energiya/foydali-ish-koeffitsienti',
  2,
  'Foydali ish koeffitsienti',
  NULL,
  NULL,
  ARRAY[7,10]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_8d15c473a2b29b0e3c35aa07',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ish-va-energiya'),
  'mexanik-energiya',
  'mexanika/ish-va-energiya/mexanik-energiya',
  2,
  'Mexanik energiya',
  NULL,
  NULL,
  ARRAY[7,10]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_7044fe9021e395793db374e7',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ish-va-energiya'),
  'energiya-va-ish',
  'mexanika/ish-va-energiya/energiya-va-ish',
  2,
  'Mexanik energiya va ish orasidagi bog''lanish',
  NULL,
  NULL,
  ARRAY[7,10]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_277aa7b0aaa7a5c2b257a1bb',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'mexanika'),
  'statika',
  'mexanika/statika',
  1,
  'Statika',
  NULL,
  NULL,
  ARRAY[7,10]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_7238147973021c28bf75857a',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'statika'),
  'muvozanat-va-kuch-momenti',
  'mexanika/statika/muvozanat-va-kuch-momenti',
  2,
  'Jismlarning muvozanat sharti. Kuch momenti. Kuch yelkasi. Og''irlik markazi',
  NULL,
  NULL,
  ARRAY[7,10]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_b5f038fd90826041299d23ff',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'statika'),
  'inersiya-momenti',
  'mexanika/statika/inersiya-momenti',
  2,
  'Inersiya momenti',
  NULL,
  NULL,
  ARRAY[7,10]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_49132daf9bbf9e4d16ef1b7d',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'mexanika'),
  'suyuqlik-gaz-mexanikasi',
  'mexanika/suyuqlik-gaz-mexanikasi',
  1,
  'Suyuqliklar va gazlar mexanikasi',
  NULL,
  NULL,
  ARRAY[7,10]::integer[],
  5
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_538879c9ae670eceea1e6bf3',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'suyuqlik-gaz-mexanikasi'),
  'bosim',
  'mexanika/suyuqlik-gaz-mexanikasi/bosim',
  2,
  'Suyuqlik va gazlarda bosim. Gidrostatik va atmosfera bosimi',
  NULL,
  NULL,
  ARRAY[7,10]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_e3f08408c34397d76c145a8a',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'suyuqlik-gaz-mexanikasi'),
  'tutash-idishlar',
  'mexanika/suyuqlik-gaz-mexanikasi/tutash-idishlar',
  2,
  'Tutash idishlar. Gidravlik (press) mashina',
  NULL,
  NULL,
  ARRAY[7,10]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_1b4fbe0a5f7cbc2ecda38f83',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'suyuqlik-gaz-mexanikasi'),
  'arximed-kuchi',
  'mexanika/suyuqlik-gaz-mexanikasi/arximed-kuchi',
  2,
  'Arximed kuchi',
  NULL,
  NULL,
  ARRAY[7,10]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_f0818ba3a274cd1b1e13f2dd',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'suyuqlik-gaz-mexanikasi'),
  'bernulli-tenglamasi',
  'mexanika/suyuqlik-gaz-mexanikasi/bernulli-tenglamasi',
  2,
  'Suyuqlik oqimining uzluksizlik tenglamasi. Bernulli tenglamasi',
  NULL,
  NULL,
  ARRAY[7,10]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_38f7d6dde9e9d539bc4f6912',
  subj."id",
  NULL::text,
  'molekulyar-fizika-termodinamika',
  'molekulyar-fizika-termodinamika',
  0,
  'Molekulyar fizika va termodinamika',
  NULL,
  NULL,
  ARRAY[7,8,10]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_392df228e31496aec78da696',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'molekulyar-fizika-termodinamika'),
  'molekulyar-fizika',
  'molekulyar-fizika-termodinamika/molekulyar-fizika',
  1,
  'Molekulyar fizika',
  NULL,
  NULL,
  ARRAY[7,8,10]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_6ef8ea9b5d30b3d7df2d1942',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'molekulyar-fizika'),
  'mkn-asoslari',
  'molekulyar-fizika-termodinamika/molekulyar-fizika/mkn-asoslari',
  2,
  'Molekulyar-kinetik nazariya asoslari',
  NULL,
  NULL,
  ARRAY[7,10]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_a175ac2f971923fccfb9cb50',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'molekulyar-fizika'),
  'mkn-asosiy-tenglama',
  'molekulyar-fizika-termodinamika/molekulyar-fizika/mkn-asosiy-tenglama',
  2,
  'Gazlar molekulyar-kinetik nazariyasining asosiy tenglamasi',
  NULL,
  NULL,
  ARRAY[7,10]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_bb73f71e6911d7ded6446e5b',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'molekulyar-fizika'),
  'temperatura',
  'molekulyar-fizika-termodinamika/molekulyar-fizika/temperatura',
  2,
  'Temperatura',
  NULL,
  NULL,
  ARRAY[7,10]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_b9aab06da5318e3afad04cf1',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'molekulyar-fizika'),
  'ideal-gaz-holat-tenglamasi',
  'molekulyar-fizika-termodinamika/molekulyar-fizika/ideal-gaz-holat-tenglamasi',
  2,
  'Ideal gazning holat tenglamasi',
  NULL,
  NULL,
  ARRAY[7,10]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_dd56e0f3c3e89d30f56fa4da',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'molekulyar-fizika'),
  'gaz-qonunlari',
  'molekulyar-fizika-termodinamika/molekulyar-fizika/gaz-qonunlari',
  2,
  'Gaz qonunlari',
  NULL,
  NULL,
  ARRAY[7,10]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_8f94dfc689768ab7ed7b1956',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'molekulyar-fizika'),
  'izotermik-jarayon',
  'molekulyar-fizika-termodinamika/molekulyar-fizika/izotermik-jarayon',
  2,
  'Izotermik jarayon',
  NULL,
  NULL,
  ARRAY[7,10]::integer[],
  5
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_bc3449f2745614b113bb66b6',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'molekulyar-fizika'),
  'izobarik-jarayon',
  'molekulyar-fizika-termodinamika/molekulyar-fizika/izobarik-jarayon',
  2,
  'Izobarik jarayon',
  NULL,
  NULL,
  ARRAY[7,10]::integer[],
  6
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_1d269afcd64ebb87136a9fb8',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'molekulyar-fizika'),
  'izoxorik-jarayon',
  'molekulyar-fizika-termodinamika/molekulyar-fizika/izoxorik-jarayon',
  2,
  'Izoxorik jarayon',
  NULL,
  NULL,
  ARRAY[7,10]::integer[],
  7
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_4ba41ae5c0e4688f6a6d8453',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'molekulyar-fizika-termodinamika'),
  'termodinamika',
  'molekulyar-fizika-termodinamika/termodinamika',
  1,
  'Termodinamika',
  NULL,
  NULL,
  ARRAY[8,10]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_db50478ff0b93708dea1903c',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'termodinamika'),
  'ichki-energiya',
  'molekulyar-fizika-termodinamika/termodinamika/ichki-energiya',
  2,
  'Ichki energiya',
  NULL,
  NULL,
  ARRAY[8,10]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_9bdab0fba342626b39f7fbb8',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'termodinamika'),
  'issiqlik-miqdori',
  'molekulyar-fizika-termodinamika/termodinamika/issiqlik-miqdori',
  2,
  'Issiqlik miqdori',
  NULL,
  NULL,
  ARRAY[8,10]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_eb4462e021329c467982a2d8',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'termodinamika'),
  'termodinamikada-ish',
  'molekulyar-fizika-termodinamika/termodinamika/termodinamikada-ish',
  2,
  'Termodinamikada ish tushunchasi',
  NULL,
  NULL,
  ARRAY[8,10]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_f62b52df38ecebaafdfcac70',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'termodinamika'),
  'termodinamika-birinchi-qonuni',
  'molekulyar-fizika-termodinamika/termodinamika/termodinamika-birinchi-qonuni',
  2,
  'Termodinamikaning birinchi qonuni',
  NULL,
  NULL,
  ARRAY[8,10]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_b8caa628f51c1a019151f298',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'termodinamika'),
  'birinchi-qonun-izojarayonlar',
  'molekulyar-fizika-termodinamika/termodinamika/birinchi-qonun-izojarayonlar',
  2,
  'Termodinamikaning birinchi qonunining izojarayonlarga qo''llanilishi',
  NULL,
  NULL,
  ARRAY[8,10]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_32968c43341eab1a446eb669',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'termodinamika'),
  'issiqlik-dvigatellari',
  'molekulyar-fizika-termodinamika/termodinamika/issiqlik-dvigatellari',
  2,
  'Issiqlik dvigatellari va ularning foydali ish koeffitsienti',
  NULL,
  NULL,
  ARRAY[8,10]::integer[],
  5
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_1e339bb12a17f3abb95a79bb',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'molekulyar-fizika-termodinamika'),
  'suyuqlik-qattiq-jism-xossalari',
  'molekulyar-fizika-termodinamika/suyuqlik-qattiq-jism-xossalari',
  1,
  'Suyuqlik va qattiq jismlarning xossalari',
  NULL,
  NULL,
  ARRAY[8,10]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_a4b4595f47128e3286a64553',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'suyuqlik-qattiq-jism-xossalari'),
  'buglanish-kondensatsiya',
  'molekulyar-fizika-termodinamika/suyuqlik-qattiq-jism-xossalari/buglanish-kondensatsiya',
  2,
  'Bug''lanish jarayoni. Kondensatsiya',
  NULL,
  NULL,
  ARRAY[8,10]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_80e5f2430747b4bb5d6b382a',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'suyuqlik-qattiq-jism-xossalari'),
  'sirt-taranglik',
  'molekulyar-fizika-termodinamika/suyuqlik-qattiq-jism-xossalari/sirt-taranglik',
  2,
  'Suyuqliklarda sirt taranglik kuchi',
  NULL,
  NULL,
  ARRAY[8,10]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_686d98f1c02f2e592e5a9ba5',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'suyuqlik-qattiq-jism-xossalari'),
  'kapillar-hodisa',
  'molekulyar-fizika-termodinamika/suyuqlik-qattiq-jism-xossalari/kapillar-hodisa',
  2,
  'Kapillar hodisa',
  NULL,
  NULL,
  ARRAY[8,10]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_ea4f73052cb6e8c448d79faa',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'suyuqlik-qattiq-jism-xossalari'),
  'qattiq-jismlar',
  'molekulyar-fizika-termodinamika/suyuqlik-qattiq-jism-xossalari/qattiq-jismlar',
  2,
  'Qattiq jismlar',
  NULL,
  NULL,
  ARRAY[8,10]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_1dd1764a10c04541c7ffca89',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'suyuqlik-qattiq-jism-xossalari'),
  'erish-va-qotish',
  'molekulyar-fizika-termodinamika/suyuqlik-qattiq-jism-xossalari/erish-va-qotish',
  2,
  'Jismlarning erishi va qotishi',
  NULL,
  NULL,
  ARRAY[8,10]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_5101b2ad9e8e6b4a332963d0',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'suyuqlik-qattiq-jism-xossalari'),
  'issiqlikdan-kengayish',
  'molekulyar-fizika-termodinamika/suyuqlik-qattiq-jism-xossalari/issiqlikdan-kengayish',
  2,
  'Jismlarning issiqlikdan kengayishi',
  NULL,
  NULL,
  ARRAY[8,10]::integer[],
  5
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_01ae429e1bd32efcb53d1529',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'molekulyar-fizika-termodinamika'),
  'mexanik-tebranish-tolqin',
  'molekulyar-fizika-termodinamika/mexanik-tebranish-tolqin',
  1,
  'Mexanik tebranishlar va to''lqinlar',
  NULL,
  NULL,
  ARRAY[8,10]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_eb160026a5893c5f6237bed0',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'mexanik-tebranish-tolqin'),
  'matematik-mayatnik',
  'molekulyar-fizika-termodinamika/mexanik-tebranish-tolqin/matematik-mayatnik',
  2,
  'Mexanik tebranishlar. Matematik mayatnik',
  NULL,
  NULL,
  ARRAY[8,10]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_c1376eefa489990418fb3112',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'mexanik-tebranish-tolqin'),
  'prujinali-mayatnik',
  'molekulyar-fizika-termodinamika/mexanik-tebranish-tolqin/prujinali-mayatnik',
  2,
  'Prujinali mayatnik',
  NULL,
  NULL,
  ARRAY[8,10]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_279eef7ce74b76ef9579f7eb',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'mexanik-tebranish-tolqin'),
  'garmonik-tebranishlar',
  'molekulyar-fizika-termodinamika/mexanik-tebranish-tolqin/garmonik-tebranishlar',
  2,
  'Garmonik tebranishlar',
  NULL,
  NULL,
  ARRAY[8,10]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_d6dbfa16da0dabee42b6491d',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'mexanik-tebranish-tolqin'),
  'mexanik-tolqinlar',
  'molekulyar-fizika-termodinamika/mexanik-tebranish-tolqin/mexanik-tolqinlar',
  2,
  'Mexanik to''lqinlar',
  NULL,
  NULL,
  ARRAY[8,10]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_8afce5eaef69e6d622dcc0af',
  subj."id",
  NULL::text,
  'elektr-va-magnitizm',
  'elektr-va-magnitizm',
  0,
  'Elektr va magnitizm',
  NULL,
  NULL,
  ARRAY[8,10,11]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_cf7604d85ab13f9e0ee2d85a',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektr-va-magnitizm'),
  'elektrostatika',
  'elektr-va-magnitizm/elektrostatika',
  1,
  'Elektrostatika',
  NULL,
  NULL,
  ARRAY[8,10]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_3b839b9715a6134e4e06ace9',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektrostatika'),
  'elektr-zaryadi',
  'elektr-va-magnitizm/elektrostatika/elektr-zaryadi',
  2,
  'Elektr zaryadi va uning ikki turi. Elementar zaryad',
  NULL,
  NULL,
  ARRAY[8,10]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_cdd24eea308109574fab416e',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektrostatika'),
  'elektr-maydon-kuchlanganligi',
  'elektr-va-magnitizm/elektrostatika/elektr-maydon-kuchlanganligi',
  2,
  'Elektr maydoni va uning kuchlanganligi',
  NULL,
  NULL,
  ARRAY[8,10]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_aea81a643f38d57e97b6d278',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektrostatika'),
  'cheksiz-tekislik-maydoni',
  'elektr-va-magnitizm/elektrostatika/cheksiz-tekislik-maydoni',
  2,
  'Bir jinsli zaryadlangan cheksiz tekislikning elektr maydoni',
  NULL,
  NULL,
  ARRAY[8,10]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_44a9ede980a5fa8cd543add5',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektrostatika'),
  'maydonda-bajarilgan-ish',
  'elektr-va-magnitizm/elektrostatika/maydonda-bajarilgan-ish',
  2,
  'Elektr maydonida nuqtaviy zaryadni ko''chirishda bajarilgan ish',
  NULL,
  NULL,
  ARRAY[8,10]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_18396b3828c336d6f6bfce52',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektrostatika'),
  'potensial-va-kuchlanganlik',
  'elektr-va-magnitizm/elektrostatika/potensial-va-kuchlanganlik',
  2,
  'Potensiallar ayirmasi bilan kuchlanganlik orasidagi bog''lanish',
  NULL,
  NULL,
  ARRAY[8,10]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_5d136f39189749520b69e1bc',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektrostatika'),
  'otkazgichlar-maydonda',
  'elektr-va-magnitizm/elektrostatika/otkazgichlar-maydonda',
  2,
  'Elektr maydonda o''tkazgichlar. O''tkazgich ichidagi elektr maydoni',
  NULL,
  NULL,
  ARRAY[8,10]::integer[],
  5
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_b8161b99a544f7cf887f6b82',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektrostatika'),
  'elektr-sigimi',
  'elektr-va-magnitizm/elektrostatika/elektr-sigimi',
  2,
  'O''tkazgichning elektr sig''imi',
  NULL,
  NULL,
  ARRAY[8,10]::integer[],
  6
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_3c597dd541f14abee8895047',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektrostatika'),
  'kondensator-tasir-kuchi',
  'elektr-va-magnitizm/elektrostatika/kondensator-tasir-kuchi',
  2,
  'Kondensator qoplamalarining o''zaro elektrostatik ta''sir kuchi',
  NULL,
  NULL,
  ARRAY[8,10]::integer[],
  7
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_4a4ff6284fcbb248f4440b8c',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektrostatika'),
  'kondensator-ulash',
  'elektr-va-magnitizm/elektrostatika/kondensator-ulash',
  2,
  'Kondensatorlarni parallel va ketma-ket ulash',
  NULL,
  NULL,
  ARRAY[8,10]::integer[],
  8
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_9796958aeba6fc3b6bb15aa3',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektrostatika'),
  'kondensator-energiyasi',
  'elektr-va-magnitizm/elektrostatika/kondensator-energiyasi',
  2,
  'Zaryadlangan jismning va kondensatorning energiyasi',
  NULL,
  NULL,
  ARRAY[8,10]::integer[],
  9
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_a2621277350b15942b324d7d',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektr-va-magnitizm'),
  'ozgarmas-tok',
  'elektr-va-magnitizm/ozgarmas-tok',
  1,
  'O''zgarmas tok qonunlari',
  NULL,
  NULL,
  ARRAY[8,10,11]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_98120afbe0c111b8f7d5490a',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ozgarmas-tok'),
  'elektr-toki',
  'elektr-va-magnitizm/ozgarmas-tok/elektr-toki',
  2,
  'Elektr toki. Tokning mavjud bo''lish shartlari. Tok kuchi va tok zichligi',
  NULL,
  NULL,
  ARRAY[8,10]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_74ffdb11f97c431c0c3541b7',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ozgarmas-tok'),
  'otkazgich-qarshiligi',
  'elektr-va-magnitizm/ozgarmas-tok/otkazgich-qarshiligi',
  2,
  'O''tkazgich qarshiligi. Solishtirma qarshilik',
  NULL,
  NULL,
  ARRAY[8,10]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_aee58b275d0ce667233b67fd',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ozgarmas-tok'),
  'qarshilik-va-temperatura',
  'elektr-va-magnitizm/ozgarmas-tok/qarshilik-va-temperatura',
  2,
  'O''tkazgich qarshiligining temperaturaga bog''liqligi',
  NULL,
  NULL,
  ARRAY[8,10]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_b17eeb4cd5e2c15e39855015',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ozgarmas-tok'),
  'om-qonuni-bir-qism',
  'elektr-va-magnitizm/ozgarmas-tok/om-qonuni-bir-qism',
  2,
  'Zanjirning bir qismi uchun Om qonuni',
  NULL,
  NULL,
  ARRAY[8,10]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_99ae28431cc9070d4005c71b',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ozgarmas-tok'),
  'otkazgich-ulash',
  'elektr-va-magnitizm/ozgarmas-tok/otkazgich-ulash',
  2,
  'O''tkazgichlarni ketma-ket va parallel ulash',
  NULL,
  NULL,
  ARRAY[8,10]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_5e99a4975d32f1c3c10965a6',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ozgarmas-tok'),
  'shunt-ulash',
  'elektr-va-magnitizm/ozgarmas-tok/shunt-ulash',
  2,
  'Ampermetr va voltmetrga qo''shimcha qarshilik (shunt) ulash',
  NULL,
  NULL,
  ARRAY[8,10]::integer[],
  5
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_87ffe36b2b4f1dea8c5c17f7',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ozgarmas-tok'),
  'eyk-berk-zanjir',
  'elektr-va-magnitizm/ozgarmas-tok/eyk-berk-zanjir',
  2,
  'Elektr yurituvchi kuch. Berk zanjir uchun Om qonuni',
  NULL,
  NULL,
  ARRAY[8,10]::integer[],
  6
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_ad6dbce45e051e09c7e6a120',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ozgarmas-tok'),
  'kirxgof-qonunlari',
  'elektr-va-magnitizm/ozgarmas-tok/kirxgof-qonunlari',
  2,
  'Kirxgof qonunlari va ularning qo''llanilishi',
  NULL,
  NULL,
  ARRAY[10,11]::integer[],
  7
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_45a052ebe3da7de519c09fc2',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ozgarmas-tok'),
  'tok-ishi-quvvati',
  'elektr-va-magnitizm/ozgarmas-tok/tok-ishi-quvvati',
  2,
  'Elektr tokining ishi va quvvati. Joul-Lens qonuni',
  NULL,
  NULL,
  ARRAY[8,10]::integer[],
  8
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_ed70bcecd6f68e1a4b5a2366',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ozgarmas-tok'),
  'choglanma-lampalar',
  'elektr-va-magnitizm/ozgarmas-tok/choglanma-lampalar',
  2,
  'Cho''g''lanma elektr lampalari',
  NULL,
  NULL,
  ARRAY[8,10]::integer[],
  9
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_ecc8347b581a75c4094de8ae',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektr-va-magnitizm'),
  'turli-muhitda-tok',
  'elektr-va-magnitizm/turli-muhitda-tok',
  1,
  'Turli muhitlarda elektr toki',
  NULL,
  NULL,
  ARRAY[8,10]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_75c6ef642cd2da74237da8a2',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'turli-muhitda-tok'),
  'elektrolitlarda-tok',
  'elektr-va-magnitizm/turli-muhitda-tok/elektrolitlarda-tok',
  2,
  'Elektrolitlarda elektr toki. Elektroliz uchun Faradey qonunlari',
  NULL,
  NULL,
  ARRAY[8,10]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_e98c796f015d373ed0187d29',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'turli-muhitda-tok'),
  'vakuumda-tok',
  'elektr-va-magnitizm/turli-muhitda-tok/vakuumda-tok',
  2,
  'Vakuumda elektr toki. Chiqish ishi. Elektron emissiya',
  NULL,
  NULL,
  ARRAY[8,10]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_5d94c6ed1a431dea9eba9267',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'turli-muhitda-tok'),
  'gazlarda-tok',
  'elektr-va-magnitizm/turli-muhitda-tok/gazlarda-tok',
  2,
  'Gazlarda elektr toki',
  NULL,
  NULL,
  ARRAY[8,10]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_66f3d8538badd5ab76aec120',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'turli-muhitda-tok'),
  'yarim-otkazgichlarda-tok',
  'elektr-va-magnitizm/turli-muhitda-tok/yarim-otkazgichlarda-tok',
  2,
  'Yarim o''tkazgichlarda elektr toki',
  NULL,
  NULL,
  ARRAY[8,10]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_d7039db48fbe1fab4f89e611',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektr-va-magnitizm'),
  'magnitizm',
  'elektr-va-magnitizm/magnitizm',
  1,
  'Magnitizm',
  NULL,
  NULL,
  ARRAY[8,11]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_7f87878bc68676ac60c4c345',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'magnitizm'),
  'magnit-maydon',
  'elektr-va-magnitizm/magnitizm/magnit-maydon',
  2,
  'Magnit maydon. Tokning magnit maydoni va o''zaro ta''sirlashuvi',
  NULL,
  NULL,
  ARRAY[8,11]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_173fcd2d5e36deba4a6f858d',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'magnitizm'),
  'amper-kuchi',
  'elektr-va-magnitizm/magnitizm/amper-kuchi',
  2,
  'Magnit maydonda tokli o''tkazgichga ta''sir etuvchi kuch. Chap qo''l qoidasi',
  NULL,
  NULL,
  ARRAY[8,11]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_7cb71ed089120af315f7baa6',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'magnitizm'),
  'bio-savar-laplas',
  'elektr-va-magnitizm/magnitizm/bio-savar-laplas',
  2,
  'Bio-Savar-Laplas qonuni. Magnit maydon induksiyasi. Superpozitsiya prinsipi',
  NULL,
  NULL,
  ARRAY[8,11]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_d666458c922d88fefd104998',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'magnitizm'),
  'lorens-kuchi',
  'elektr-va-magnitizm/magnitizm/lorens-kuchi',
  2,
  'Magnit maydonda zaryadli zarrachaning harakati. Lorens kuchi',
  NULL,
  NULL,
  ARRAY[8,11]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_5ba31b23e3db7c2c491f1768',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'magnitizm'),
  'magnit-oqim',
  'elektr-va-magnitizm/magnitizm/magnit-oqim',
  2,
  'Magnit maydon induksiya oqimi. Magnit maydonda bajarilgan ish',
  NULL,
  NULL,
  ARRAY[8,11]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_05af89f5d9331659cdd8c56d',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'magnitizm'),
  'elektromagnit-induksiya',
  'elektr-va-magnitizm/magnitizm/elektromagnit-induksiya',
  2,
  'Elektromagnit induksiya qonuni. Induksion EYK',
  NULL,
  NULL,
  ARRAY[8,11]::integer[],
  5
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_856b5e2046fc5e03292bd876',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'magnitizm'),
  'induktivlik',
  'elektr-va-magnitizm/magnitizm/induktivlik',
  2,
  'Induktivlik',
  NULL,
  NULL,
  ARRAY[8,11]::integer[],
  6
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_bcf60d8476486d53844a3079',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'magnitizm'),
  'magnit-maydon-energiyasi',
  'elektr-va-magnitizm/magnitizm/magnit-maydon-energiyasi',
  2,
  'Magnit maydon energiyasi',
  NULL,
  NULL,
  ARRAY[8,11]::integer[],
  7
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_8df79ef2410c7be355895288',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'magnitizm'),
  'magnit-singdiruvchanlik',
  'elektr-va-magnitizm/magnitizm/magnit-singdiruvchanlik',
  2,
  'Muhitning magnit singdiruvchanligi. Dia-, para- va ferromagnitlar',
  NULL,
  NULL,
  ARRAY[8,11]::integer[],
  8
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_d1352edeae4d61d9587e0feb',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektr-va-magnitizm'),
  'elektromagnit-tebranish-tolqin',
  'elektr-va-magnitizm/elektromagnit-tebranish-tolqin',
  1,
  'Elektromagnit tebranishlar va to''lqinlar',
  NULL,
  NULL,
  ARRAY[11]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_0db86abc2541efc91777f8ef',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektromagnit-tebranish-tolqin'),
  'tebranish-konturi',
  'elektr-va-magnitizm/elektromagnit-tebranish-tolqin/tebranish-konturi',
  2,
  'Tebranish konturi',
  NULL,
  NULL,
  ARRAY[11]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_f0ae1daf389c1b5572f727ed',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektromagnit-tebranish-tolqin'),
  'ozgaruvchan-tok',
  'elektr-va-magnitizm/elektromagnit-tebranish-tolqin/ozgaruvchan-tok',
  2,
  'O''zgaruvchan tok',
  NULL,
  NULL,
  ARRAY[11]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_04d2bbdb703aa6048ea0fef1',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektromagnit-tebranish-tolqin'),
  'aktiv-qarshilik',
  'elektr-va-magnitizm/elektromagnit-tebranish-tolqin/aktiv-qarshilik',
  2,
  'O''zgaruvchan tok zanjirida aktiv qarshilik',
  NULL,
  NULL,
  ARRAY[11]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_e440131abc6d0a9169d04db6',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektromagnit-tebranish-tolqin'),
  'sigim-qarshilik',
  'elektr-va-magnitizm/elektromagnit-tebranish-tolqin/sigim-qarshilik',
  2,
  'O''zgaruvchan tok zanjirida sig''im qarshilik',
  NULL,
  NULL,
  ARRAY[11]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_d7c949b3437ec3ceb89e891b',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektromagnit-tebranish-tolqin'),
  'induktiv-qarshilik',
  'elektr-va-magnitizm/elektromagnit-tebranish-tolqin/induktiv-qarshilik',
  2,
  'O''zgaruvchan tok zanjirida induktiv qarshilik',
  NULL,
  NULL,
  ARRAY[11]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_808459e323eb288c24a070b7',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektromagnit-tebranish-tolqin'),
  'om-qonuni-ozgaruvchan-tok',
  'elektr-va-magnitizm/elektromagnit-tebranish-tolqin/om-qonuni-ozgaruvchan-tok',
  2,
  'O''zgaruvchan tok zanjiri uchun Om qonuni. Rezonans',
  NULL,
  NULL,
  ARRAY[11]::integer[],
  5
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_704e5f72966b2c1f0a2b7b48',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektromagnit-tebranish-tolqin'),
  'tok-generatori',
  'elektr-va-magnitizm/elektromagnit-tebranish-tolqin/tok-generatori',
  2,
  'O''zgaruvchan tokning ishi va quvvati. Tok generatori',
  NULL,
  NULL,
  ARRAY[11]::integer[],
  6
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_58f1a817f80c56285934c167',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektromagnit-tebranish-tolqin'),
  'transformator',
  'elektr-va-magnitizm/elektromagnit-tebranish-tolqin/transformator',
  2,
  'Transformator',
  NULL,
  NULL,
  ARRAY[11]::integer[],
  7
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_42bdfe40b2edf67159ab8df1',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektromagnit-tebranish-tolqin'),
  'elektromagnit-tolqin',
  'elektr-va-magnitizm/elektromagnit-tebranish-tolqin/elektromagnit-tolqin',
  2,
  'Elektromagnit to''lqin',
  NULL,
  NULL,
  ARRAY[11]::integer[],
  8
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_786305fcb511f6d52ec3ab4c',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektromagnit-tebranish-tolqin'),
  'radiolokatsiya',
  'elektr-va-magnitizm/elektromagnit-tebranish-tolqin/radiolokatsiya',
  2,
  'Radiolokatsiya. Modulatsiya, detektorlash',
  NULL,
  NULL,
  ARRAY[8,11]::integer[],
  9
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_8501fe39b1ec420d480f0f5f',
  subj."id",
  NULL::text,
  'optika',
  'optika',
  0,
  'Optika',
  NULL,
  NULL,
  ARRAY[9,11]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_300d21989fde647c961077dc',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'optika'),
  'geometrik-optika',
  'optika/geometrik-optika',
  1,
  'Geometrik optika',
  NULL,
  NULL,
  ARRAY[9,11]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_d60e48968f71235c0775b6b4',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'geometrik-optika'),
  'yoruglik-tarqalishi',
  'optika/geometrik-optika/yoruglik-tarqalishi',
  2,
  'Yorug''likning to''g''ri chiziq bo''ylab tarqalishi. Yorug''lik tezligi',
  NULL,
  NULL,
  ARRAY[9,11]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_c698e68a30eb9a5e25aa175e',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'geometrik-optika'),
  'fotometriya',
  'optika/geometrik-optika/fotometriya',
  2,
  'Fotometriya',
  NULL,
  NULL,
  ARRAY[11]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_7b25f4254bf68a13b1360e11',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'geometrik-optika'),
  'qaytish-qonuni',
  'optika/geometrik-optika/qaytish-qonuni',
  2,
  'Yorug''likning qaytish qonuni',
  NULL,
  NULL,
  ARRAY[9,11]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_14aaf5c004fe731d6310611c',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'geometrik-optika'),
  'yassi-kozgu',
  'optika/geometrik-optika/yassi-kozgu',
  2,
  'Yassi ko''zgudagi tasvir',
  NULL,
  NULL,
  ARRAY[9,11]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_3c89ece934ad71ebab1c1301',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'geometrik-optika'),
  'sinish-qonuni',
  'optika/geometrik-optika/sinish-qonuni',
  2,
  'Yorug''likning sinish qonuni',
  NULL,
  NULL,
  ARRAY[9,11]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_8a8a66c3a32d5d1b622be00f',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'geometrik-optika'),
  'tola-ichki-qaytish',
  'optika/geometrik-optika/tola-ichki-qaytish',
  2,
  'Yorug''likning to''la ichki qaytishi',
  NULL,
  NULL,
  ARRAY[9,11]::integer[],
  5
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_f8d6dbf4ba4a17736d43fd2f',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'geometrik-optika'),
  'parallel-plastina',
  'optika/geometrik-optika/parallel-plastina',
  2,
  'Parallel plastinada nurning yo''li',
  NULL,
  NULL,
  ARRAY[9,11]::integer[],
  6
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_7c3fab512c8b440e0d0a0da7',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'geometrik-optika'),
  'prizma',
  'optika/geometrik-optika/prizma',
  2,
  'Nurlarning uchburchakli prizmadagi yo''li',
  NULL,
  NULL,
  ARRAY[9,11]::integer[],
  7
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_42145b9c04bc5608517f4813',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'geometrik-optika'),
  'linza-optik-kuch',
  'optika/geometrik-optika/linza-optik-kuch',
  2,
  'Linza. Linzaning optik kuchi',
  NULL,
  NULL,
  ARRAY[9,11]::integer[],
  8
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_fa1c3be3447d4dc79526c913',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'geometrik-optika'),
  'linza-formulasi',
  'optika/geometrik-optika/linza-formulasi',
  2,
  'Linzada tasvir yasash. Linza formulasi',
  NULL,
  NULL,
  ARRAY[9,11]::integer[],
  9
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_06c9ba872aab77793c314924',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'geometrik-optika'),
  'sferik-kozgular',
  'optika/geometrik-optika/sferik-kozgular',
  2,
  'Sferik ko''zgular',
  NULL,
  NULL,
  ARRAY[9,11]::integer[],
  10
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_90dbd14168c51cd485c85e2d',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'geometrik-optika'),
  'optik-asboblar',
  'optika/geometrik-optika/optik-asboblar',
  2,
  'Optik asboblar',
  NULL,
  NULL,
  ARRAY[9,11]::integer[],
  11
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_6d599ce8323b6f2bb5e6d440',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'optika'),
  'tolqin-optikasi',
  'optika/tolqin-optikasi',
  1,
  'To''lqin optikasi',
  NULL,
  NULL,
  ARRAY[9,11]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_93e7ee68f571a7c84c8b47d8',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'tolqin-optikasi'),
  'yoruglik-tolqin-tabiati',
  'optika/tolqin-optikasi/yoruglik-tolqin-tabiati',
  2,
  'Yorug''likning to''lqin tabiati',
  NULL,
  NULL,
  ARRAY[9,11]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_d22bff8ea849a80eae944c5e',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'tolqin-optikasi'),
  'interferensiya',
  'optika/tolqin-optikasi/interferensiya',
  2,
  'Yorug''lik interferensiyasi',
  NULL,
  NULL,
  ARRAY[9,11]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_a9c5f03649bec2cd4535a429',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'tolqin-optikasi'),
  'dispersiya',
  'optika/tolqin-optikasi/dispersiya',
  2,
  'Yorug''lik dispersiyasi',
  NULL,
  NULL,
  ARRAY[9,11]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_ce59bcdb05868666242dc4b8',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'tolqin-optikasi'),
  'difraksiya',
  'optika/tolqin-optikasi/difraksiya',
  2,
  'Yorug''lik difraksiyasi',
  NULL,
  NULL,
  ARRAY[9,11]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_08ffb8589a51e4ee38e546ca',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'tolqin-optikasi'),
  'qutblanish',
  'optika/tolqin-optikasi/qutblanish',
  2,
  'Yorug''likning qutblanishi',
  NULL,
  NULL,
  ARRAY[9,11]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_d1239f71edc64d496533a5a6',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'tolqin-optikasi'),
  'infraqizil-ultrabinafsha',
  'optika/tolqin-optikasi/infraqizil-ultrabinafsha',
  2,
  'Infraqizil va ultrabinafsha nurlar',
  NULL,
  NULL,
  ARRAY[9,11]::integer[],
  5
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_59a0cbd7e231be151ea14543',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'tolqin-optikasi'),
  'spektral-analiz',
  'optika/tolqin-optikasi/spektral-analiz',
  2,
  'Nurlanish va yutilish spektrlari. Spektral analiz',
  NULL,
  NULL,
  ARRAY[9,11]::integer[],
  6
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_3da26a2d6d6648973c662ccc',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'tolqin-optikasi'),
  'rentgen-nurlari',
  'optika/tolqin-optikasi/rentgen-nurlari',
  2,
  'Rentgen nurlari',
  NULL,
  NULL,
  ARRAY[9,11]::integer[],
  7
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_eb091ea3d917b5b5e54aaeb3',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'optika'),
  'nisbiylik-nazariyasi',
  'optika/nisbiylik-nazariyasi',
  1,
  'Maxsus nisbiylik nazariyasi asoslari',
  NULL,
  NULL,
  ARRAY[9,11]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_d29fea723440a5a19c40e86b',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'nisbiylik-nazariyasi'),
  'eynshteyn-postulatlari',
  'optika/nisbiylik-nazariyasi/eynshteyn-postulatlari',
  2,
  'Eynshteyn postulatlari',
  NULL,
  NULL,
  ARRAY[9,11]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_71f8b580318ff36d39dbee2e',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'nisbiylik-nazariyasi'),
  'relyativistik-massa-energiya',
  'optika/nisbiylik-nazariyasi/relyativistik-massa-energiya',
  2,
  'Relyativistik massa va impuls. Massa va energiya orasidagi bog''lanish',
  NULL,
  NULL,
  ARRAY[9,11]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_4448ee2f68cab393306dc4ff',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'optika'),
  'kvant-fizikasi',
  'optika/kvant-fizikasi',
  1,
  'Kvant fizikasi',
  NULL,
  NULL,
  ARRAY[9,11]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_c8c73fa2ee3f0734074d9f8d',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'kvant-fizikasi'),
  'kvant-xossalar-fotonlar',
  'optika/kvant-fizikasi/kvant-xossalar-fotonlar',
  2,
  'Yorug''likning kvant xossalari. Kvant mexanikasi. Fotonlar',
  NULL,
  NULL,
  ARRAY[9,11]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_1c5f9f3c8ae7966d60778257',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'kvant-fizikasi'),
  'fotoeffekt',
  'optika/kvant-fizikasi/fotoeffekt',
  2,
  'Fotoeffekt',
  NULL,
  NULL,
  ARRAY[9,11]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_d1fc8e59a2b0a9af991c0380',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'kvant-fizikasi'),
  'yoruglik-bosimi',
  'optika/kvant-fizikasi/yoruglik-bosimi',
  2,
  'Yorug''lik bosimi',
  NULL,
  NULL,
  ARRAY[9,11]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_a7575b520876cc6dd69d8bed',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'kvant-fizikasi'),
  'yoruglik-kimyoviy-tasiri',
  'optika/kvant-fizikasi/yoruglik-kimyoviy-tasiri',
  2,
  'Yorug''likning kimyoviy ta''siri',
  NULL,
  NULL,
  ARRAY[11]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_f9548e9aebc24379c7a914a3',
  subj."id",
  NULL::text,
  'atom-yadro-fizikasi',
  'atom-yadro-fizikasi',
  0,
  'Atom va yadro fizikasi',
  NULL,
  NULL,
  ARRAY[9,11]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_7590e3074293a25f9bea0575',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'atom-yadro-fizikasi'),
  'atom-yadro',
  'atom-yadro-fizikasi/atom-yadro',
  1,
  'Atom va yadro fizikasi',
  NULL,
  NULL,
  ARRAY[9,11]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_1ccaedb82ff61c03bf123bc9',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'atom-yadro'),
  'atom-planetar-model',
  'atom-yadro-fizikasi/atom-yadro/atom-planetar-model',
  2,
  'Atomning planetar modeli. Bor postulatlari',
  NULL,
  NULL,
  ARRAY[9,11]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_6752396e055a52062e5fa2c1',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'atom-yadro'),
  'yadro-tuzilishi',
  'atom-yadro-fizikasi/atom-yadro/yadro-tuzilishi',
  2,
  'Atom yadrosining tuzilishi. Yadro kuchlari',
  NULL,
  NULL,
  ARRAY[9,11]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_44277ca73e8aef0156e37a5d',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'atom-yadro'),
  'radioaktivlik-kashfi',
  'atom-yadro-fizikasi/atom-yadro/radioaktivlik-kashfi',
  2,
  'Elementar zarralarni kuzatish. Radioaktivlikning kashf etilishi',
  NULL,
  NULL,
  ARRAY[9,11]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_5da46d7700a85df648436665',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'atom-yadro'),
  'radioaktiv-aylanishlar',
  'atom-yadro-fizikasi/atom-yadro/radioaktiv-aylanishlar',
  2,
  'Radioaktiv aylanishlar',
  NULL,
  NULL,
  ARRAY[9,11]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_476d238be13b3045c699f615',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'atom-yadro'),
  'radioaktiv-yemirilish',
  'atom-yadro-fizikasi/atom-yadro/radioaktiv-yemirilish',
  2,
  'Radioaktiv yemirilish qonuni',
  NULL,
  NULL,
  ARRAY[9,11]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_9a95b2e9e8c5845431de725b',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'atom-yadro'),
  'izotoplar',
  'atom-yadro-fizikasi/atom-yadro/izotoplar',
  2,
  'Izotoplar',
  NULL,
  NULL,
  ARRAY[9,11]::integer[],
  5
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_92312574be7600f66dfbe7c8',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'atom-yadro'),
  'yadro-boglanish-energiyasi',
  'atom-yadro-fizikasi/atom-yadro/yadro-boglanish-energiyasi',
  2,
  'Atom yadrosining bog''lanish energiyasi',
  NULL,
  NULL,
  ARRAY[9,11]::integer[],
  6
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_99eb7ce26675874bdf417b60',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'atom-yadro'),
  'yadro-reaksiyalari',
  'atom-yadro-fizikasi/atom-yadro/yadro-reaksiyalari',
  2,
  'Yadro reaksiyalari',
  NULL,
  NULL,
  ARRAY[9,11]::integer[],
  7
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_5e3f28346b8bfdd279f11d1e',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'atom-yadro'),
  'elementar-zarralar',
  'atom-yadro-fizikasi/atom-yadro/elementar-zarralar',
  2,
  'Elementar zarralar',
  NULL,
  NULL,
  ARRAY[9,11]::integer[],
  8
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
  'tn_f571f15f40c5ae8ca5c9417e',
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'atom-yadro'),
  'nurlanish-biologik-tasiri',
  'atom-yadro-fizikasi/atom-yadro/nurlanish-biologik-tasiri',
  2,
  'Radioaktiv nurlanishning biologik ta''siri',
  NULL,
  NULL,
  ARRAY[9,11]::integer[],
  9
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('fizika')
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
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('Matematika')
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
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('Matematika')
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
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('Matematika')
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
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('Matematika')
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
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('Matematika')
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
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('Matematika')
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
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('Matematika')
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
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('Matematika')
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
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('Matematika')
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
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('Matematika')
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
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('Matematika')
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
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('Matematika')
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
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('Matematika')
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
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('Matematika')
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
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('Matematika')
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
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('Matematika')
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
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('Matematika')
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
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('Matematika')
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
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('Matematika')
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
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('Matematika')
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
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('Matematika')
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
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('Matematika')
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
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('Matematika')
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
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('Matematika')
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
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('Matematika')
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
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('Matematika')
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
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('Matematika')
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
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('Matematika')
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
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('Matematika')
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
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('Matematika')
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
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('Matematika')
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
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('Matematika')
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
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('Matematika')
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
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('Matematika')
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
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('Matematika')
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
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('Matematika')
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
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('Matematika')
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
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('Matematika')
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
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('Matematika')
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
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('Matematika')
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
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('Matematika')
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
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('Matematika')
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
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('Matematika')
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
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('Matematika')
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
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('Matematika')
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
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('Matematika')
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
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('Matematika')
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
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('Matematika')
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
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('Matematika')
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
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('Matematika')
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
WHERE cat."type" = 'DTM' AND LOWER(subj."nameUz") = LOWER('Matematika')
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
