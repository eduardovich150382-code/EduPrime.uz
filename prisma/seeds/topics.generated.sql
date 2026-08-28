-- Avtomatik hosil qilingan — QO'LDA TAHRIRLAMANG.
-- Manba: prisma/seeds/topics/*.json (npm run seed:topics orqali qayta hosil qilinadi)
-- Idempotent: ON CONFLICT ("subjectId", "slug") DO UPDATE — qayta qo'yilsa dublikat yozilmaydi.
-- Har fan "applyToCategories" dagi HAR BIR kategoriyaga mos Subject qatoriga
-- alohida yoziladi. Agar mos Subject topilmasa, mos INSERT jimgina 0 qator
-- yozadi — oxiridagi tekshiruv so'rovi shuni ko'rsatadi.
BEGIN;
INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_ed0faf409b88207a17cd695a'), 1, 24),
  subj."id",
  NULL::text,
  'mexanika',
  'mexanika',
  0,
  'Mexanika',
  NULL,
  NULL,
  ARRAY['Klassik mexanika']::text[],
  ARRAY[7,10]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_1720facbede6c3d9a19120e7'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'mexanika'),
  'kinematika',
  'mexanika/kinematika',
  1,
  'Kinematika',
  NULL,
  NULL,
  ARRAY['Kinematika']::text[],
  ARRAY[7,10]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_a43557216cb306b4609a049d'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'kinematika'),
  'mexanik-harakat',
  'mexanika/kinematika/mexanik-harakat',
  2,
  'Mexanik harakat. Moddiy nuqta, trayektoriya, ko''chish, yo''l tushunchalari',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_bc4750b2b732c21187b5913d'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'kinematika'),
  'sanoq-sistemasi-vektorlar',
  'mexanika/kinematika/sanoq-sistemasi-vektorlar',
  2,
  'Sanoq sistemasi. Vektor kattaliklar va ular ustidagi amallar',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_1a49036ae49911d8080db473'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'kinematika'),
  'tekis-harakat',
  'mexanika/kinematika/tekis-harakat',
  2,
  'To''g''ri chiziqli tekis harakat va uning tezligi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_053a0bf738c048309f535df7'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'kinematika'),
  'harakat-nisbiyligi',
  'mexanika/kinematika/harakat-nisbiyligi',
  2,
  'Harakatning nisbiyligi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,10]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_af9cee57135f269b3029c0ee'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'kinematika'),
  'tekis-ozgaruvchan-harakat',
  'mexanika/kinematika/tekis-ozgaruvchan-harakat',
  2,
  'To''g''ri chiziqli tekis o''zgaruvchan harakat',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,10]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_8c2baf12b91186687a4a2e63'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'kinematika'),
  'tekis-ozgaruvchan-kochish',
  'mexanika/kinematika/tekis-ozgaruvchan-kochish',
  2,
  'To''g''ri chiziqli tekis o''zgaruvchan harakatda ko''chish',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,10]::integer[],
  5
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_85d9b477c436a1686f54d3ec'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'kinematika'),
  'notekis-ozgaruvchan-harakat',
  'mexanika/kinematika/notekis-ozgaruvchan-harakat',
  2,
  'To''g''ri chiziqli notekis o''zgaruvchan harakat',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,10]::integer[],
  6
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_0116b66b893f6e1b1c402518'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'kinematika'),
  'ortacha-tezlik',
  'mexanika/kinematika/ortacha-tezlik',
  2,
  'O''rtacha tezlik',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,10]::integer[],
  7
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_967961662af326bf34733d66'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'kinematika'),
  'erkin-tushish',
  'mexanika/kinematika/erkin-tushish',
  2,
  'Jismlarning erkin tushishi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,10]::integer[],
  8
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_abc5cc1042dcb6ce00b74395'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'kinematika'),
  'tik-otilgan-jism',
  'mexanika/kinematika/tik-otilgan-jism',
  2,
  'Yuqoriga tik otilgan jism harakati',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,10]::integer[],
  9
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_478717cc50f4107104f4d999'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'kinematika'),
  'aylana-boylab-tekis-harakat',
  'mexanika/kinematika/aylana-boylab-tekis-harakat',
  2,
  'Egri chiziqli harakat. Aylana bo''ylab tekis harakat',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,10]::integer[],
  10
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_930061c1ec7f6f04abf3ad66'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'kinematika'),
  'aylanma-harakat-uzatish',
  'mexanika/kinematika/aylanma-harakat-uzatish',
  2,
  'Aylanma harakatni uzatish',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,10]::integer[],
  11
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_ee82227c36d46fc2182d78f8'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'kinematika'),
  'markazga-intilma-tezlanish',
  'mexanika/kinematika/markazga-intilma-tezlanish',
  2,
  'Markazga intilma tezlanish',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,10]::integer[],
  12
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_3dde63826e18e5154bf09422'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'kinematika'),
  'aylana-boylab-notekis-harakat',
  'mexanika/kinematika/aylana-boylab-notekis-harakat',
  2,
  'Aylana bo''ylab notekis harakat',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,10]::integer[],
  13
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_aa6fb5ede076b3c1509930c1'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'kinematika'),
  'gorizontal-otilgan-jism',
  'mexanika/kinematika/gorizontal-otilgan-jism',
  2,
  'Gorizontal otilgan jism harakati',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,10]::integer[],
  14
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_8a3b5c54c4efffe7f16e9a19'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'kinematika'),
  'qiya-otilgan-jism',
  'mexanika/kinematika/qiya-otilgan-jism',
  2,
  'Gorizontga qiya otilgan jism harakati',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,10]::integer[],
  15
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_669a3060c955c2a32a9e064e'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'mexanika'),
  'dinamika',
  'mexanika/dinamika',
  1,
  'Dinamika',
  NULL,
  NULL,
  ARRAY['Dinamika']::text[],
  ARRAY[7,10]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_d96a991961d4d8c023d35f18'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'dinamika'),
  'massa-va-zichlik',
  'mexanika/dinamika/massa-va-zichlik',
  2,
  'Massa va zichlik',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_1ddcb3b7460936fa17ef8633'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'dinamika'),
  'nyuton-qonunlari',
  'mexanika/dinamika/nyuton-qonunlari',
  2,
  'Nyutonning I, II, III qonunlari',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,10]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_b1a8755bf7ba06e8aeff0ddd'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'dinamika'),
  'markazga-intilma-kuch',
  'mexanika/dinamika/markazga-intilma-kuch',
  2,
  'Markazga intilma va markazdan qochma kuch',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,10]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_3b462659a399b3b6feacec53'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'dinamika'),
  'butun-olam-tortishish',
  'mexanika/dinamika/butun-olam-tortishish',
  2,
  'Butun olam tortishish qonuni. Gravitatsiya kuchi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,10]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_5b3e39e69b09d6811304d1e0'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'dinamika'),
  'kosmik-tezliklar',
  'mexanika/dinamika/kosmik-tezliklar',
  2,
  'Kosmik tezliklar',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,10]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_63eb2f0aa1dc747187b2a559'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'dinamika'),
  'ogirlik-va-harakat',
  'mexanika/dinamika/ogirlik-va-harakat',
  2,
  'Jism og''irligining uning harakat turlariga bog''liqligi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,10]::integer[],
  5
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_ad5f547c24bb419a243e47a0'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'dinamika'),
  'elastiklik-kuchi',
  'mexanika/dinamika/elastiklik-kuchi',
  2,
  'Elastiklik kuchi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,10]::integer[],
  6
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_0733f186ff1bfc5d57ea2c92'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'mexanika'),
  'ishqalanish-va-impuls',
  'mexanika/ishqalanish-va-impuls',
  1,
  'Ishqalanish kuchi va impuls',
  NULL,
  NULL,
  ARRAY['Impuls','Saqlanish qonunlari']::text[],
  ARRAY[7,10]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_251bd81208f5a957547786d0'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ishqalanish-va-impuls'),
  'gorizontal-ishqalanish',
  'mexanika/ishqalanish-va-impuls/gorizontal-ishqalanish',
  2,
  'Gorizontal tekislikda sirpanish ishqalanish kuchi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,10]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_cd8150a940de0208494da3f6'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ishqalanish-va-impuls'),
  'qiya-tekislik-ishqalanish',
  'mexanika/ishqalanish-va-impuls/qiya-tekislik-ishqalanish',
  2,
  'Qiya tekislikda sirpanish ishqalanish kuchi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,10]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_58229f8ddbe1f558db2bf2b9'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ishqalanish-va-impuls'),
  'bir-nechta-kuch',
  'mexanika/ishqalanish-va-impuls/bir-nechta-kuch',
  2,
  'Bir nechta kuchlar ta''siri ostidagi harakat',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,10]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_adebc6a4a079f019fc21ae28'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ishqalanish-va-impuls'),
  'bloklar',
  'mexanika/ishqalanish-va-impuls/bloklar',
  2,
  'Ko''chmas va ko''char bloklar',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,10]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_06f7c432844ac2037a021f7a'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ishqalanish-va-impuls'),
  'impuls',
  'mexanika/ishqalanish-va-impuls/impuls',
  2,
  'Jism va kuch impulsi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,10]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_52b7080c54564ff18839ae4f'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ishqalanish-va-impuls'),
  'impuls-saqlanish',
  'mexanika/ishqalanish-va-impuls/impuls-saqlanish',
  2,
  'Impulsning saqlanish qonuni',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,10]::integer[],
  5
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_b1c07f382fc57fe8fa2bd2cb'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'mexanika'),
  'ish-va-energiya',
  'mexanika/ish-va-energiya',
  1,
  'Mexanik ish va mexanik energiya',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,10]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_8c2f10604c21c808699f228f'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ish-va-energiya'),
  'mexanik-ish',
  'mexanika/ish-va-energiya/mexanik-ish',
  2,
  'Mexanik ish',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,10]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_d7fe28ad604b6530152b1f17'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ish-va-energiya'),
  'quvvat',
  'mexanika/ish-va-energiya/quvvat',
  2,
  'Quvvat',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,10]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_877a9871b196706e75f917c4'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ish-va-energiya'),
  'foydali-ish-koeffitsienti',
  'mexanika/ish-va-energiya/foydali-ish-koeffitsienti',
  2,
  'Foydali ish koeffitsienti',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,10]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_fe8edc9a45680eba7cff47b5'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ish-va-energiya'),
  'mexanik-energiya',
  'mexanika/ish-va-energiya/mexanik-energiya',
  2,
  'Mexanik energiya',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,10]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_7f69a9d0ea15e8abe7a9a678'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ish-va-energiya'),
  'energiya-va-ish',
  'mexanika/ish-va-energiya/energiya-va-ish',
  2,
  'Mexanik energiya va ish orasidagi bog''lanish',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,10]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_7b649cfbc352f260c254eb66'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'mexanika'),
  'statika',
  'mexanika/statika',
  1,
  'Statika',
  NULL,
  NULL,
  ARRAY['Statika']::text[],
  ARRAY[7,10]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_15098000cdc18d993e95e069'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'statika'),
  'muvozanat-va-kuch-momenti',
  'mexanika/statika/muvozanat-va-kuch-momenti',
  2,
  'Jismlarning muvozanat sharti. Kuch momenti. Kuch yelkasi. Og''irlik markazi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,10]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_b9e214bca82384e9c4c73101'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'statika'),
  'inersiya-momenti',
  'mexanika/statika/inersiya-momenti',
  2,
  'Inersiya momenti',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,10]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_015471686a4c7ab400034373'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'mexanika'),
  'suyuqlik-gaz-mexanikasi',
  'mexanika/suyuqlik-gaz-mexanikasi',
  1,
  'Suyuqliklar va gazlar mexanikasi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,10]::integer[],
  5
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_1a92adfe580420d80448c072'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'suyuqlik-gaz-mexanikasi'),
  'bosim',
  'mexanika/suyuqlik-gaz-mexanikasi/bosim',
  2,
  'Suyuqlik va gazlarda bosim. Gidrostatik va atmosfera bosimi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,10]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_d622d15749fc04347550115c'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'suyuqlik-gaz-mexanikasi'),
  'tutash-idishlar',
  'mexanika/suyuqlik-gaz-mexanikasi/tutash-idishlar',
  2,
  'Tutash idishlar. Gidravlik (press) mashina',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,10]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_b40402b4c42322c00ef07cef'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'suyuqlik-gaz-mexanikasi'),
  'arximed-kuchi',
  'mexanika/suyuqlik-gaz-mexanikasi/arximed-kuchi',
  2,
  'Arximed kuchi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,10]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_684783551f686feaacae9346'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'suyuqlik-gaz-mexanikasi'),
  'bernulli-tenglamasi',
  'mexanika/suyuqlik-gaz-mexanikasi/bernulli-tenglamasi',
  2,
  'Suyuqlik oqimining uzluksizlik tenglamasi. Bernulli tenglamasi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,10]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_04251b25cfd4ec396ad05b8f'), 1, 24),
  subj."id",
  NULL::text,
  'molekulyar-fizika-termodinamika',
  'molekulyar-fizika-termodinamika',
  0,
  'Molekulyar fizika va termodinamika',
  NULL,
  NULL,
  ARRAY['Molekulyar fizika va termodinamika']::text[],
  ARRAY[7,8,10]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_25a6d44482d0b508cfb49b9b'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'molekulyar-fizika-termodinamika'),
  'molekulyar-fizika',
  'molekulyar-fizika-termodinamika/molekulyar-fizika',
  1,
  'Molekulyar fizika',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,8,10]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_583f07bbb33119cd54cc2efe'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'molekulyar-fizika'),
  'mkn-asoslari',
  'molekulyar-fizika-termodinamika/molekulyar-fizika/mkn-asoslari',
  2,
  'Molekulyar-kinetik nazariya asoslari',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,10]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_4b1897ee18ce5558310091f1'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'molekulyar-fizika'),
  'mkn-asosiy-tenglama',
  'molekulyar-fizika-termodinamika/molekulyar-fizika/mkn-asosiy-tenglama',
  2,
  'Gazlar molekulyar-kinetik nazariyasining asosiy tenglamasi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,10]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_d87803af554f44a9b550e47b'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'molekulyar-fizika'),
  'temperatura',
  'molekulyar-fizika-termodinamika/molekulyar-fizika/temperatura',
  2,
  'Temperatura',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,10]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_2c728321b6cddebca0de52e0'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'molekulyar-fizika'),
  'ideal-gaz-holat-tenglamasi',
  'molekulyar-fizika-termodinamika/molekulyar-fizika/ideal-gaz-holat-tenglamasi',
  2,
  'Ideal gazning holat tenglamasi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,10]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_d12ea640dd5f6df8955ba259'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'molekulyar-fizika'),
  'gaz-qonunlari',
  'molekulyar-fizika-termodinamika/molekulyar-fizika/gaz-qonunlari',
  2,
  'Gaz qonunlari',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,10]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_8a4ccea75039e4234631ea4d'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'molekulyar-fizika'),
  'izotermik-jarayon',
  'molekulyar-fizika-termodinamika/molekulyar-fizika/izotermik-jarayon',
  2,
  'Izotermik jarayon',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,10]::integer[],
  5
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_e16a4e5877299478813bdb44'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'molekulyar-fizika'),
  'izobarik-jarayon',
  'molekulyar-fizika-termodinamika/molekulyar-fizika/izobarik-jarayon',
  2,
  'Izobarik jarayon',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,10]::integer[],
  6
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_6fb415c529af216a4f4289d4'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'molekulyar-fizika'),
  'izoxorik-jarayon',
  'molekulyar-fizika-termodinamika/molekulyar-fizika/izoxorik-jarayon',
  2,
  'Izoxorik jarayon',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,10]::integer[],
  7
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_24748fc615e8b23d795e6084'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'molekulyar-fizika-termodinamika'),
  'termodinamika',
  'molekulyar-fizika-termodinamika/termodinamika',
  1,
  'Termodinamika',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,10]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_0b18a18d0a6f080f14fd6677'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'termodinamika'),
  'ichki-energiya',
  'molekulyar-fizika-termodinamika/termodinamika/ichki-energiya',
  2,
  'Ichki energiya',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,10]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_c09ffea1c8910c8452034246'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'termodinamika'),
  'issiqlik-miqdori',
  'molekulyar-fizika-termodinamika/termodinamika/issiqlik-miqdori',
  2,
  'Issiqlik miqdori',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,10]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_df6c53f25c0b41c8c0728a9a'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'termodinamika'),
  'termodinamikada-ish',
  'molekulyar-fizika-termodinamika/termodinamika/termodinamikada-ish',
  2,
  'Termodinamikada ish tushunchasi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,10]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_bc18af24b31e723cc990024b'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'termodinamika'),
  'termodinamika-birinchi-qonuni',
  'molekulyar-fizika-termodinamika/termodinamika/termodinamika-birinchi-qonuni',
  2,
  'Termodinamikaning birinchi qonuni',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,10]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_4fce97191398a16b76dd54ae'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'termodinamika'),
  'birinchi-qonun-izojarayonlar',
  'molekulyar-fizika-termodinamika/termodinamika/birinchi-qonun-izojarayonlar',
  2,
  'Termodinamikaning birinchi qonunining izojarayonlarga qo''llanilishi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,10]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_045951299dec2548f5db7b1e'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'termodinamika'),
  'issiqlik-dvigatellari',
  'molekulyar-fizika-termodinamika/termodinamika/issiqlik-dvigatellari',
  2,
  'Issiqlik dvigatellari va ularning foydali ish koeffitsienti',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,10]::integer[],
  5
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_f178786fec3b3b0d36549c94'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'molekulyar-fizika-termodinamika'),
  'suyuqlik-qattiq-jism-xossalari',
  'molekulyar-fizika-termodinamika/suyuqlik-qattiq-jism-xossalari',
  1,
  'Suyuqlik va qattiq jismlarning xossalari',
  NULL,
  NULL,
  ARRAY['Suyuqliklar, qattiq jismlar va ularning xossalari']::text[],
  ARRAY[8,10]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_429df185e5dca8e17165f46b'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'suyuqlik-qattiq-jism-xossalari'),
  'buglanish-kondensatsiya',
  'molekulyar-fizika-termodinamika/suyuqlik-qattiq-jism-xossalari/buglanish-kondensatsiya',
  2,
  'Bug''lanish jarayoni. Kondensatsiya',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,10]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_7454fb171ef5a6ebff831a9c'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'suyuqlik-qattiq-jism-xossalari'),
  'sirt-taranglik',
  'molekulyar-fizika-termodinamika/suyuqlik-qattiq-jism-xossalari/sirt-taranglik',
  2,
  'Suyuqliklarda sirt taranglik kuchi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,10]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_aa57373c921b729705150102'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'suyuqlik-qattiq-jism-xossalari'),
  'kapillar-hodisa',
  'molekulyar-fizika-termodinamika/suyuqlik-qattiq-jism-xossalari/kapillar-hodisa',
  2,
  'Kapillar hodisa',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,10]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_3627acbbec014476b71627f3'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'suyuqlik-qattiq-jism-xossalari'),
  'qattiq-jismlar',
  'molekulyar-fizika-termodinamika/suyuqlik-qattiq-jism-xossalari/qattiq-jismlar',
  2,
  'Qattiq jismlar',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,10]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_acf997eb84b4c09784df7afe'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'suyuqlik-qattiq-jism-xossalari'),
  'erish-va-qotish',
  'molekulyar-fizika-termodinamika/suyuqlik-qattiq-jism-xossalari/erish-va-qotish',
  2,
  'Jismlarning erishi va qotishi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,10]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_3e35af8925a8756b8c7dc40e'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'suyuqlik-qattiq-jism-xossalari'),
  'issiqlikdan-kengayish',
  'molekulyar-fizika-termodinamika/suyuqlik-qattiq-jism-xossalari/issiqlikdan-kengayish',
  2,
  'Jismlarning issiqlikdan kengayishi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,10]::integer[],
  5
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_3924c8fbd862d81113eca4ee'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'molekulyar-fizika-termodinamika'),
  'mexanik-tebranish-tolqin',
  'molekulyar-fizika-termodinamika/mexanik-tebranish-tolqin',
  1,
  'Mexanik tebranishlar va to''lqinlar',
  NULL,
  NULL,
  ARRAY['Mexanik tebranishlar va to''lqinlar']::text[],
  ARRAY[8,10]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_eb2c7646663ca55541a96fc1'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'mexanik-tebranish-tolqin'),
  'matematik-mayatnik',
  'molekulyar-fizika-termodinamika/mexanik-tebranish-tolqin/matematik-mayatnik',
  2,
  'Mexanik tebranishlar. Matematik mayatnik',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,10]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_02a1af51f1623edbd0a55793'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'mexanik-tebranish-tolqin'),
  'prujinali-mayatnik',
  'molekulyar-fizika-termodinamika/mexanik-tebranish-tolqin/prujinali-mayatnik',
  2,
  'Prujinali mayatnik',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,10]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_27223514f5d370b3635178af'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'mexanik-tebranish-tolqin'),
  'garmonik-tebranishlar',
  'molekulyar-fizika-termodinamika/mexanik-tebranish-tolqin/garmonik-tebranishlar',
  2,
  'Garmonik tebranishlar',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,10]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_a69c190ae2c9ee1fabd5f901'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'mexanik-tebranish-tolqin'),
  'mexanik-tolqinlar',
  'molekulyar-fizika-termodinamika/mexanik-tebranish-tolqin/mexanik-tolqinlar',
  2,
  'Mexanik to''lqinlar',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,10]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_3a9a27c575806f7474e36304'), 1, 24),
  subj."id",
  NULL::text,
  'elektr-va-magnitizm',
  'elektr-va-magnitizm',
  0,
  'Elektr va magnitizm',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,10,11]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_dceddc4b56e51560c6a0ee65'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektr-va-magnitizm'),
  'elektrostatika',
  'elektr-va-magnitizm/elektrostatika',
  1,
  'Elektrostatika',
  NULL,
  NULL,
  ARRAY['Elektrostatika']::text[],
  ARRAY[8,10]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_68f449b1f358421a53878651'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektrostatika'),
  'elektr-zaryadi',
  'elektr-va-magnitizm/elektrostatika/elektr-zaryadi',
  2,
  'Elektr zaryadi va uning ikki turi. Elementar zaryad',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,10]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_6cc3c6024f8cd3528259eb5d'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektrostatika'),
  'elektr-maydon-kuchlanganligi',
  'elektr-va-magnitizm/elektrostatika/elektr-maydon-kuchlanganligi',
  2,
  'Elektr maydoni va uning kuchlanganligi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,10]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_4e8fb2c9ad007e7098c10924'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektrostatika'),
  'cheksiz-tekislik-maydoni',
  'elektr-va-magnitizm/elektrostatika/cheksiz-tekislik-maydoni',
  2,
  'Bir jinsli zaryadlangan cheksiz tekislikning elektr maydoni',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,10]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_c86436915a45f4c414226ba8'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektrostatika'),
  'maydonda-bajarilgan-ish',
  'elektr-va-magnitizm/elektrostatika/maydonda-bajarilgan-ish',
  2,
  'Elektr maydonida nuqtaviy zaryadni ko''chirishda bajarilgan ish',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,10]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_c36cb8c660ef1a30f16e3485'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektrostatika'),
  'potensial-va-kuchlanganlik',
  'elektr-va-magnitizm/elektrostatika/potensial-va-kuchlanganlik',
  2,
  'Potensiallar ayirmasi bilan kuchlanganlik orasidagi bog''lanish',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,10]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_67aa2b3c00c8724409b7f3b1'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektrostatika'),
  'otkazgichlar-maydonda',
  'elektr-va-magnitizm/elektrostatika/otkazgichlar-maydonda',
  2,
  'Elektr maydonda o''tkazgichlar. O''tkazgich ichidagi elektr maydoni',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,10]::integer[],
  5
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_1969e8349cb8b82453dab9b5'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektrostatika'),
  'elektr-sigimi',
  'elektr-va-magnitizm/elektrostatika/elektr-sigimi',
  2,
  'O''tkazgichning elektr sig''imi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,10]::integer[],
  6
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_767ef7d9bdbd01d57e85441a'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektrostatika'),
  'kondensator-tasir-kuchi',
  'elektr-va-magnitizm/elektrostatika/kondensator-tasir-kuchi',
  2,
  'Kondensator qoplamalarining o''zaro elektrostatik ta''sir kuchi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,10]::integer[],
  7
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_be72dc1d86909ae3d7a9ee65'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektrostatika'),
  'kondensator-ulash',
  'elektr-va-magnitizm/elektrostatika/kondensator-ulash',
  2,
  'Kondensatorlarni parallel va ketma-ket ulash',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,10]::integer[],
  8
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_0bcfe36a0b6a446f3f03a30f'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektrostatika'),
  'kondensator-energiyasi',
  'elektr-va-magnitizm/elektrostatika/kondensator-energiyasi',
  2,
  'Zaryadlangan jismning va kondensatorning energiyasi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,10]::integer[],
  9
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_7be1f2ee433624a8011c267a'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektr-va-magnitizm'),
  'ozgarmas-tok',
  'elektr-va-magnitizm/ozgarmas-tok',
  1,
  'O''zgarmas tok qonunlari',
  NULL,
  NULL,
  ARRAY['Elektr toki','O''zgarmas elektr toki']::text[],
  ARRAY[8,10,11]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_33f53e10002f880e9f7caf7b'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ozgarmas-tok'),
  'elektr-toki',
  'elektr-va-magnitizm/ozgarmas-tok/elektr-toki',
  2,
  'Elektr toki. Tokning mavjud bo''lish shartlari. Tok kuchi va tok zichligi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,10]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_9c111330301a3224bb8cd1c9'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ozgarmas-tok'),
  'otkazgich-qarshiligi',
  'elektr-va-magnitizm/ozgarmas-tok/otkazgich-qarshiligi',
  2,
  'O''tkazgich qarshiligi. Solishtirma qarshilik',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,10]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_8c5d154ea662233b02619c7f'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ozgarmas-tok'),
  'qarshilik-va-temperatura',
  'elektr-va-magnitizm/ozgarmas-tok/qarshilik-va-temperatura',
  2,
  'O''tkazgich qarshiligining temperaturaga bog''liqligi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,10]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_eb0fc010164ae94e5466fd40'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ozgarmas-tok'),
  'om-qonuni-bir-qism',
  'elektr-va-magnitizm/ozgarmas-tok/om-qonuni-bir-qism',
  2,
  'Zanjirning bir qismi uchun Om qonuni',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,10]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_6f0ef9a1913989912e9e7a50'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ozgarmas-tok'),
  'otkazgich-ulash',
  'elektr-va-magnitizm/ozgarmas-tok/otkazgich-ulash',
  2,
  'O''tkazgichlarni ketma-ket va parallel ulash',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,10]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_ebac916ac00443b27b36fcb8'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ozgarmas-tok'),
  'shunt-ulash',
  'elektr-va-magnitizm/ozgarmas-tok/shunt-ulash',
  2,
  'Ampermetr va voltmetrga qo''shimcha qarshilik (shunt) ulash',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,10]::integer[],
  5
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_a9bc2638328a1dbde4c26fba'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ozgarmas-tok'),
  'eyk-berk-zanjir',
  'elektr-va-magnitizm/ozgarmas-tok/eyk-berk-zanjir',
  2,
  'Elektr yurituvchi kuch. Berk zanjir uchun Om qonuni',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,10]::integer[],
  6
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_54c03d1b69d975e87d6d14e3'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ozgarmas-tok'),
  'kirxgof-qonunlari',
  'elektr-va-magnitizm/ozgarmas-tok/kirxgof-qonunlari',
  2,
  'Kirxgof qonunlari va ularning qo''llanilishi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[10,11]::integer[],
  7
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_3d62f9b509e72219b0142406'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ozgarmas-tok'),
  'tok-ishi-quvvati',
  'elektr-va-magnitizm/ozgarmas-tok/tok-ishi-quvvati',
  2,
  'Elektr tokining ishi va quvvati. Joul-Lens qonuni',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,10]::integer[],
  8
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_219288005b07e37fbbf302a3'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ozgarmas-tok'),
  'choglanma-lampalar',
  'elektr-va-magnitizm/ozgarmas-tok/choglanma-lampalar',
  2,
  'Cho''g''lanma elektr lampalari',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,10]::integer[],
  9
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_57ca9bcb01a0d0d803faeedd'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektr-va-magnitizm'),
  'turli-muhitda-tok',
  'elektr-va-magnitizm/turli-muhitda-tok',
  1,
  'Turli muhitlarda elektr toki',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,10]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_cd9b65c783919e880caee5fc'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'turli-muhitda-tok'),
  'elektrolitlarda-tok',
  'elektr-va-magnitizm/turli-muhitda-tok/elektrolitlarda-tok',
  2,
  'Elektrolitlarda elektr toki. Elektroliz uchun Faradey qonunlari',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,10]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_6a7d0e5e5e86c6a1f3e077c8'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'turli-muhitda-tok'),
  'vakuumda-tok',
  'elektr-va-magnitizm/turli-muhitda-tok/vakuumda-tok',
  2,
  'Vakuumda elektr toki. Chiqish ishi. Elektron emissiya',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,10]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_67c14e8feb1046ee4e08242a'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'turli-muhitda-tok'),
  'gazlarda-tok',
  'elektr-va-magnitizm/turli-muhitda-tok/gazlarda-tok',
  2,
  'Gazlarda elektr toki',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,10]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_fc2359d8af902fea1f7f750e'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'turli-muhitda-tok'),
  'yarim-otkazgichlarda-tok',
  'elektr-va-magnitizm/turli-muhitda-tok/yarim-otkazgichlarda-tok',
  2,
  'Yarim o''tkazgichlarda elektr toki',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,10]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_2848a82ba2b3d7739021728c'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektr-va-magnitizm'),
  'magnitizm',
  'elektr-va-magnitizm/magnitizm',
  1,
  'Magnitizm',
  NULL,
  NULL,
  ARRAY['Elektromagnit induksiya va magnit maydoni','Magnit maydon','Magnetizm']::text[],
  ARRAY[8,11]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_bbf162e0266b8ebcc34eff9f'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'magnitizm'),
  'magnit-maydon',
  'elektr-va-magnitizm/magnitizm/magnit-maydon',
  2,
  'Magnit maydon. Tokning magnit maydoni va o''zaro ta''sirlashuvi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,11]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_c18c03b3ff0d8e2e89247412'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'magnitizm'),
  'amper-kuchi',
  'elektr-va-magnitizm/magnitizm/amper-kuchi',
  2,
  'Magnit maydonda tokli o''tkazgichga ta''sir etuvchi kuch. Chap qo''l qoidasi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,11]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_4d5da116356f242d7a1245fb'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'magnitizm'),
  'bio-savar-laplas',
  'elektr-va-magnitizm/magnitizm/bio-savar-laplas',
  2,
  'Bio-Savar-Laplas qonuni. Magnit maydon induksiyasi. Superpozitsiya prinsipi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,11]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_b08db00932ff0c63a6fdbb2a'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'magnitizm'),
  'lorens-kuchi',
  'elektr-va-magnitizm/magnitizm/lorens-kuchi',
  2,
  'Magnit maydonda zaryadli zarrachaning harakati. Lorens kuchi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,11]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_f8bb47fcb2764dbe456755e8'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'magnitizm'),
  'magnit-oqim',
  'elektr-va-magnitizm/magnitizm/magnit-oqim',
  2,
  'Magnit maydon induksiya oqimi. Magnit maydonda bajarilgan ish',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,11]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_ccf1af227a87aacc739d8126'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'magnitizm'),
  'elektromagnit-induksiya',
  'elektr-va-magnitizm/magnitizm/elektromagnit-induksiya',
  2,
  'Elektromagnit induksiya qonuni. Induksion EYK',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,11]::integer[],
  5
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_4a35c9d152cd9255c9d7e9db'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'magnitizm'),
  'induktivlik',
  'elektr-va-magnitizm/magnitizm/induktivlik',
  2,
  'Induktivlik',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,11]::integer[],
  6
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_971a8f41bda78495aef5024d'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'magnitizm'),
  'magnit-maydon-energiyasi',
  'elektr-va-magnitizm/magnitizm/magnit-maydon-energiyasi',
  2,
  'Magnit maydon energiyasi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,11]::integer[],
  7
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_40fac6b47c3af33196aa4eea'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'magnitizm'),
  'magnit-singdiruvchanlik',
  'elektr-va-magnitizm/magnitizm/magnit-singdiruvchanlik',
  2,
  'Muhitning magnit singdiruvchanligi. Dia-, para- va ferromagnitlar',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,11]::integer[],
  8
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_2efff47111e8504f919c5b9a'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektr-va-magnitizm'),
  'elektromagnit-tebranish-tolqin',
  'elektr-va-magnitizm/elektromagnit-tebranish-tolqin',
  1,
  'Elektromagnit tebranishlar va to''lqinlar',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[11]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_17f6090d6538d86676128e3c'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektromagnit-tebranish-tolqin'),
  'tebranish-konturi',
  'elektr-va-magnitizm/elektromagnit-tebranish-tolqin/tebranish-konturi',
  2,
  'Tebranish konturi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[11]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_03dbabb41494b27bd2cc0d50'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektromagnit-tebranish-tolqin'),
  'ozgaruvchan-tok',
  'elektr-va-magnitizm/elektromagnit-tebranish-tolqin/ozgaruvchan-tok',
  2,
  'O''zgaruvchan tok',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[11]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_61490d098ab16d919d0c991e'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektromagnit-tebranish-tolqin'),
  'aktiv-qarshilik',
  'elektr-va-magnitizm/elektromagnit-tebranish-tolqin/aktiv-qarshilik',
  2,
  'O''zgaruvchan tok zanjirida aktiv qarshilik',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[11]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_af246068ef63f465f80c3d0c'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektromagnit-tebranish-tolqin'),
  'sigim-qarshilik',
  'elektr-va-magnitizm/elektromagnit-tebranish-tolqin/sigim-qarshilik',
  2,
  'O''zgaruvchan tok zanjirida sig''im qarshilik',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[11]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_79b593ba08d5dcf0f2532f36'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektromagnit-tebranish-tolqin'),
  'induktiv-qarshilik',
  'elektr-va-magnitizm/elektromagnit-tebranish-tolqin/induktiv-qarshilik',
  2,
  'O''zgaruvchan tok zanjirida induktiv qarshilik',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[11]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_9c01865ed2f5c3270f9ac7b9'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektromagnit-tebranish-tolqin'),
  'om-qonuni-ozgaruvchan-tok',
  'elektr-va-magnitizm/elektromagnit-tebranish-tolqin/om-qonuni-ozgaruvchan-tok',
  2,
  'O''zgaruvchan tok zanjiri uchun Om qonuni. Rezonans',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[11]::integer[],
  5
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_2c86fdc455147a6537d00d0c'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektromagnit-tebranish-tolqin'),
  'tok-generatori',
  'elektr-va-magnitizm/elektromagnit-tebranish-tolqin/tok-generatori',
  2,
  'O''zgaruvchan tokning ishi va quvvati. Tok generatori',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[11]::integer[],
  6
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_0acd16b6aa133179ce0d4589'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektromagnit-tebranish-tolqin'),
  'transformator',
  'elektr-va-magnitizm/elektromagnit-tebranish-tolqin/transformator',
  2,
  'Transformator',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[11]::integer[],
  7
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_e2198f8142ea2fd90b651718'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektromagnit-tebranish-tolqin'),
  'elektromagnit-tolqin',
  'elektr-va-magnitizm/elektromagnit-tebranish-tolqin/elektromagnit-tolqin',
  2,
  'Elektromagnit to''lqin',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[11]::integer[],
  8
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_270e2c1b946e6bc46a3ee105'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'elektromagnit-tebranish-tolqin'),
  'radiolokatsiya',
  'elektr-va-magnitizm/elektromagnit-tebranish-tolqin/radiolokatsiya',
  2,
  'Radiolokatsiya. Modulatsiya, detektorlash',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,11]::integer[],
  9
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_db460b087bfeaa0cb5fc63b4'), 1, 24),
  subj."id",
  NULL::text,
  'optika',
  'optika',
  0,
  'Optika',
  NULL,
  NULL,
  ARRAY['Geometrik va to''lqin optikasi']::text[],
  ARRAY[9,11]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_5ed6a5279e5927f924b7826f'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'optika'),
  'geometrik-optika',
  'optika/geometrik-optika',
  1,
  'Geometrik optika',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,11]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_c19bf2708951ba235c54d1b4'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'geometrik-optika'),
  'yoruglik-tarqalishi',
  'optika/geometrik-optika/yoruglik-tarqalishi',
  2,
  'Yorug''likning to''g''ri chiziq bo''ylab tarqalishi. Yorug''lik tezligi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,11]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_775e6767d87340480506bd20'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'geometrik-optika'),
  'fotometriya',
  'optika/geometrik-optika/fotometriya',
  2,
  'Fotometriya',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[11]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_0008c308a344fb5739025c99'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'geometrik-optika'),
  'qaytish-qonuni',
  'optika/geometrik-optika/qaytish-qonuni',
  2,
  'Yorug''likning qaytish qonuni',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,11]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_e48522d2d4cd93f3bdc03750'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'geometrik-optika'),
  'yassi-kozgu',
  'optika/geometrik-optika/yassi-kozgu',
  2,
  'Yassi ko''zgudagi tasvir',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,11]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_566f63844a9199d10d6664dd'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'geometrik-optika'),
  'sinish-qonuni',
  'optika/geometrik-optika/sinish-qonuni',
  2,
  'Yorug''likning sinish qonuni',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,11]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_42dc7c9e2480f152afae35de'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'geometrik-optika'),
  'tola-ichki-qaytish',
  'optika/geometrik-optika/tola-ichki-qaytish',
  2,
  'Yorug''likning to''la ichki qaytishi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,11]::integer[],
  5
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_728e7485f48ec6ee923c97c4'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'geometrik-optika'),
  'parallel-plastina',
  'optika/geometrik-optika/parallel-plastina',
  2,
  'Parallel plastinada nurning yo''li',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,11]::integer[],
  6
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_3e4dd0c3469a50db99761b9d'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'geometrik-optika'),
  'prizma',
  'optika/geometrik-optika/prizma',
  2,
  'Nurlarning uchburchakli prizmadagi yo''li',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,11]::integer[],
  7
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_2dee446e92b8324a37f14fd5'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'geometrik-optika'),
  'linza-optik-kuch',
  'optika/geometrik-optika/linza-optik-kuch',
  2,
  'Linza. Linzaning optik kuchi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,11]::integer[],
  8
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_f33900b664609b418030d256'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'geometrik-optika'),
  'linza-formulasi',
  'optika/geometrik-optika/linza-formulasi',
  2,
  'Linzada tasvir yasash. Linza formulasi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,11]::integer[],
  9
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_836eb89ebde5b21942a04812'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'geometrik-optika'),
  'sferik-kozgular',
  'optika/geometrik-optika/sferik-kozgular',
  2,
  'Sferik ko''zgular',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,11]::integer[],
  10
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_794d49847167dd6a4e63356c'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'geometrik-optika'),
  'optik-asboblar',
  'optika/geometrik-optika/optik-asboblar',
  2,
  'Optik asboblar',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,11]::integer[],
  11
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_910e2a54e76a69533c601c6c'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'optika'),
  'tolqin-optikasi',
  'optika/tolqin-optikasi',
  1,
  'To''lqin optikasi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,11]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_234a10ba59308017f248eec1'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'tolqin-optikasi'),
  'yoruglik-tolqin-tabiati',
  'optika/tolqin-optikasi/yoruglik-tolqin-tabiati',
  2,
  'Yorug''likning to''lqin tabiati',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,11]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_ace739aa51e31337af1cd715'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'tolqin-optikasi'),
  'interferensiya',
  'optika/tolqin-optikasi/interferensiya',
  2,
  'Yorug''lik interferensiyasi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,11]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_626442ef5fd960aefb613711'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'tolqin-optikasi'),
  'dispersiya',
  'optika/tolqin-optikasi/dispersiya',
  2,
  'Yorug''lik dispersiyasi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,11]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_0b458f3059709497fdd9a854'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'tolqin-optikasi'),
  'difraksiya',
  'optika/tolqin-optikasi/difraksiya',
  2,
  'Yorug''lik difraksiyasi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,11]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_65ed9470b967bacbb42f5a90'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'tolqin-optikasi'),
  'qutblanish',
  'optika/tolqin-optikasi/qutblanish',
  2,
  'Yorug''likning qutblanishi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,11]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_5cbc92d9f4d356ad17ec2f10'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'tolqin-optikasi'),
  'infraqizil-ultrabinafsha',
  'optika/tolqin-optikasi/infraqizil-ultrabinafsha',
  2,
  'Infraqizil va ultrabinafsha nurlar',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,11]::integer[],
  5
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_0d4cada0ae1a61b5aff63ec7'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'tolqin-optikasi'),
  'spektral-analiz',
  'optika/tolqin-optikasi/spektral-analiz',
  2,
  'Nurlanish va yutilish spektrlari. Spektral analiz',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,11]::integer[],
  6
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_cc9b54b4f43784a352ac599c'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'tolqin-optikasi'),
  'rentgen-nurlari',
  'optika/tolqin-optikasi/rentgen-nurlari',
  2,
  'Rentgen nurlari',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,11]::integer[],
  7
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_0a6b05f4a6ea7e67195f10d9'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'optika'),
  'nisbiylik-nazariyasi',
  'optika/nisbiylik-nazariyasi',
  1,
  'Maxsus nisbiylik nazariyasi asoslari',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,11]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_69a9cb30d71386aaa783288c'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'nisbiylik-nazariyasi'),
  'eynshteyn-postulatlari',
  'optika/nisbiylik-nazariyasi/eynshteyn-postulatlari',
  2,
  'Eynshteyn postulatlari',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,11]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_9661a9263b6549278dcd1b41'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'nisbiylik-nazariyasi'),
  'relyativistik-massa-energiya',
  'optika/nisbiylik-nazariyasi/relyativistik-massa-energiya',
  2,
  'Relyativistik massa va impuls. Massa va energiya orasidagi bog''lanish',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,11]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_c44803acb3fddef44b9bc67a'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'optika'),
  'kvant-fizikasi',
  'optika/kvant-fizikasi',
  1,
  'Kvant fizikasi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,11]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_f885721fe7776a95e8994f9f'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'kvant-fizikasi'),
  'kvant-xossalar-fotonlar',
  'optika/kvant-fizikasi/kvant-xossalar-fotonlar',
  2,
  'Yorug''likning kvant xossalari. Kvant mexanikasi. Fotonlar',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,11]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_baec7c2e623f2719a4d8293d'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'kvant-fizikasi'),
  'fotoeffekt',
  'optika/kvant-fizikasi/fotoeffekt',
  2,
  'Fotoeffekt',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,11]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_e77965dbdc198c8aad07544c'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'kvant-fizikasi'),
  'yoruglik-bosimi',
  'optika/kvant-fizikasi/yoruglik-bosimi',
  2,
  'Yorug''lik bosimi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,11]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_59634ddef8b5af8d1cbaf410'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'kvant-fizikasi'),
  'yoruglik-kimyoviy-tasiri',
  'optika/kvant-fizikasi/yoruglik-kimyoviy-tasiri',
  2,
  'Yorug''likning kimyoviy ta''siri',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[11]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_367a0cffcdecd9a56ea3faa0'), 1, 24),
  subj."id",
  NULL::text,
  'atom-yadro-fizikasi',
  'atom-yadro-fizikasi',
  0,
  'Atom va yadro fizikasi',
  NULL,
  NULL,
  ARRAY['Atom va yadro fizikasi']::text[],
  ARRAY[9,11]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_d7398b7ccf81de0c9ba358a6'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'atom-yadro-fizikasi'),
  'atom-yadro',
  'atom-yadro-fizikasi/atom-yadro',
  1,
  'Atom va yadro fizikasi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,11]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_b7a7717aade0373e62cfe91b'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'atom-yadro'),
  'atom-planetar-model',
  'atom-yadro-fizikasi/atom-yadro/atom-planetar-model',
  2,
  'Atomning planetar modeli. Bor postulatlari',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,11]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_a482d917012cbb365a1d9a79'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'atom-yadro'),
  'yadro-tuzilishi',
  'atom-yadro-fizikasi/atom-yadro/yadro-tuzilishi',
  2,
  'Atom yadrosining tuzilishi. Yadro kuchlari',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,11]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_081ceb996aaf65e40531da91'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'atom-yadro'),
  'radioaktivlik-kashfi',
  'atom-yadro-fizikasi/atom-yadro/radioaktivlik-kashfi',
  2,
  'Elementar zarralarni kuzatish. Radioaktivlikning kashf etilishi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,11]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_ac2125f89118464350987d9a'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'atom-yadro'),
  'radioaktiv-aylanishlar',
  'atom-yadro-fizikasi/atom-yadro/radioaktiv-aylanishlar',
  2,
  'Radioaktiv aylanishlar',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,11]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_23a289ae1bd94a88f1c4d47d'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'atom-yadro'),
  'radioaktiv-yemirilish',
  'atom-yadro-fizikasi/atom-yadro/radioaktiv-yemirilish',
  2,
  'Radioaktiv yemirilish qonuni',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,11]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_9054354ce9a821e9ab93ffd5'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'atom-yadro'),
  'izotoplar',
  'atom-yadro-fizikasi/atom-yadro/izotoplar',
  2,
  'Izotoplar',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,11]::integer[],
  5
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_16825c9ddf8834b1acf16fd1'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'atom-yadro'),
  'yadro-boglanish-energiyasi',
  'atom-yadro-fizikasi/atom-yadro/yadro-boglanish-energiyasi',
  2,
  'Atom yadrosining bog''lanish energiyasi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,11]::integer[],
  6
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_0b424a09032800687806d3a7'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'atom-yadro'),
  'yadro-reaksiyalari',
  'atom-yadro-fizikasi/atom-yadro/yadro-reaksiyalari',
  2,
  'Yadro reaksiyalari',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,11]::integer[],
  7
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_30ce0350c4ce1690c1a117b3'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'atom-yadro'),
  'elementar-zarralar',
  'atom-yadro-fizikasi/atom-yadro/elementar-zarralar',
  2,
  'Elementar zarralar',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,11]::integer[],
  8
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_54c0073197cd4f6c43fe5fb0'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'atom-yadro'),
  'nurlanish-biologik-tasiri',
  'atom-yadro-fizikasi/atom-yadro/nurlanish-biologik-tasiri',
  2,
  'Radioaktiv nurlanishning biologik ta''siri',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,11]::integer[],
  9
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Fizika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_1165b7cff9a290348cd22b2b'), 1, 24),
  subj."id",
  NULL::text,
  'algebra',
  'algebra',
  0,
  'Algebra',
  NULL,
  NULL,
  ARRAY['Algebraik ifodalar','Tenglamalar']::text[],
  ARRAY[7,8,9,10,11]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_f5b55839c94723b7dd9c6634'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'algebra'),
  'sonlar-va-amallar',
  'algebra/sonlar-va-amallar',
  1,
  'Sonlar va amallar',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,8]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_8c63f71b4c7b56307b2d9b2b'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'algebra'),
  'ifodalarni-soddalashtirish',
  'algebra/ifodalarni-soddalashtirish',
  1,
  'Algebraik ifodalarni soddalashtirish',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,8,9]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_eca33f5407b0ab794497c1d6'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'algebra'),
  'chiziqli-tenglamalar',
  'algebra/chiziqli-tenglamalar',
  1,
  'Chiziqli tenglama va tengsizliklar',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,8,9]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_bdffecaa3fde75c0149c3c0e'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'algebra'),
  'kvadrat-tenglamalar',
  'algebra/kvadrat-tenglamalar',
  1,
  'Kvadrat tenglama va tengsizliklar',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,9]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_5fa8bfa16939bf7d949ec2a1'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'algebra'),
  'tenglamalar-sistemasi',
  'algebra/tenglamalar-sistemasi',
  1,
  'Tenglamalar sistemasi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,9]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_5ea46580b2243660127db0a0'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'algebra'),
  'daraja-va-ildiz',
  'algebra/daraja-va-ildiz',
  1,
  'Daraja va ildiz',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,9,10]::integer[],
  5
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_9971c820cc5298e5244e8c03'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'algebra'),
  'logarifm',
  'algebra/logarifm',
  1,
  'Logarifm',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[10,11]::integer[],
  6
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_e7ad8d3fdb9f1da9a5d98570'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'algebra'),
  'progressiyalar',
  'algebra/progressiyalar',
  1,
  'Progressiyalar',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,10]::integer[],
  7
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_11bd9656f0f9b18adbe5c71e'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'algebra'),
  'modul',
  'algebra/modul',
  1,
  'Modulli ifodalar va tenglamalar',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,9,10]::integer[],
  8
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_04e7095eec816c2ebce52b90'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'algebra'),
  'ratsional-irratsional-tenglamalar',
  'algebra/ratsional-irratsional-tenglamalar',
  1,
  'Ratsional va irratsional tenglamalar',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,10]::integer[],
  9
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_f7eb2c3052d861260f3c719f'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'algebra'),
  'korsatkichli-tenglamalar',
  'algebra/korsatkichli-tenglamalar',
  1,
  'Ko''rsatkichli tenglama va tengsizliklar',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[10,11]::integer[],
  10
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_b46a0342b6d0194fb241fea5'), 1, 24),
  subj."id",
  NULL::text,
  'funksiyalar',
  'funksiyalar',
  0,
  'Funksiyalar',
  NULL,
  NULL,
  ARRAY['Funksiya']::text[],
  ARRAY[9,10,11]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_1cd8a3b0e5b83c5600b03c88'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'funksiyalar'),
  'funksiya-tushunchasi',
  'funksiyalar/funksiya-tushunchasi',
  1,
  'Funksiya tushunchasi va grafigi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,10]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_37bfc4d87181dde8f020729b'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'funksiyalar'),
  'chiziqli-kvadratik-funksiya',
  'funksiyalar/chiziqli-kvadratik-funksiya',
  1,
  'Chiziqli va kvadratik funksiya',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,9]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_face768689664d0e34967407'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'funksiyalar'),
  'funksiya-xossalari',
  'funksiyalar/funksiya-xossalari',
  1,
  'Funksiya xossalari',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[10,11]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_88f1a944eabee3657a7c6890'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'funksiyalar'),
  'teskari-funksiya',
  'funksiyalar/teskari-funksiya',
  1,
  'Teskari funksiya',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[10,11]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_68d7d3e3c733e31a3404cfa3'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'funksiyalar'),
  'korsatkichli-logarifmik-funksiya',
  'funksiyalar/korsatkichli-logarifmik-funksiya',
  1,
  'Ko''rsatkichli va logarifmik funksiya',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[10,11]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_2b3d2ea3cd39d54c37d78f0e'), 1, 24),
  subj."id",
  NULL::text,
  'hosila-va-integral',
  'hosila-va-integral',
  0,
  'Hosila va integral',
  NULL,
  NULL,
  ARRAY['Hosila','Integral','Matematik analiz']::text[],
  ARRAY[10,11]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_5b556bc2540c272f58198574'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'hosila-va-integral'),
  'limit-uzluksizlik',
  'hosila-va-integral/limit-uzluksizlik',
  1,
  'Limit va uzluksizlik',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[10,11]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_f37dd8873b7759d8cbd40353'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'hosila-va-integral'),
  'hosila-hisoblash',
  'hosila-va-integral/hosila-hisoblash',
  1,
  'Hosila ta''rifi va hisoblash qoidalari',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[10,11]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_6e5e7382ce8ea31d05ae9e7a'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'hosila-va-integral'),
  'hosila-manosi',
  'hosila-va-integral/hosila-manosi',
  1,
  'Hosilaning geometrik va fizik ma''nosi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[10,11]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_2ba63c8f6ed33dc7ad7577ca'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'hosila-va-integral'),
  'funksiyani-tekshirish',
  'hosila-va-integral/funksiyani-tekshirish',
  1,
  'Funksiyani hosila yordamida tekshirish',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[10,11]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_5c339ccae3d25f540b6c42e2'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'hosila-va-integral'),
  'ekstremum-masalalari',
  'hosila-va-integral/ekstremum-masalalari',
  1,
  'Eng katta va eng kichik qiymat masalalari',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[10,11]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_d7c448bcabc7397d0ce8a847'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'hosila-va-integral'),
  'aniqmas-integral',
  'hosila-va-integral/aniqmas-integral',
  1,
  'Boshlang''ich funksiya va aniqmas integral',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[11]::integer[],
  5
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_07d6a90cc8296309c9e76625'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'hosila-va-integral'),
  'aniq-integral',
  'hosila-va-integral/aniq-integral',
  1,
  'Aniq integral va uning tatbiqlari',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[11]::integer[],
  6
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_8b91e6f6431548bd29cd84e4'), 1, 24),
  subj."id",
  NULL::text,
  'trigonometriya',
  'trigonometriya',
  0,
  'Trigonometriya',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,10,11]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_00791106795a144fa0b2d806'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'trigonometriya'),
  'trigonometrik-funksiyalar',
  'trigonometriya/trigonometrik-funksiyalar',
  1,
  'Trigonometrik funksiyalar va ularning qiymatlari',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,10]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_5f1c06751892bec36ec76dfd'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'trigonometriya'),
  'trigonometrik-ayniyatlar',
  'trigonometriya/trigonometrik-ayniyatlar',
  1,
  'Trigonometrik ayniyatlar',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[10]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_5fbb74a6e9d45972f9757958'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'trigonometriya'),
  'qoshish-formulalari',
  'trigonometriya/qoshish-formulalari',
  1,
  'Qo''shish formulalari va keltirish',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[10]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_35cfffad794d5166a6e33803'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'trigonometriya'),
  'trigonometrik-tenglamalar',
  'trigonometriya/trigonometrik-tenglamalar',
  1,
  'Trigonometrik tenglama va tengsizliklar',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[10,11]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_c710b1dbcb2f85c990fc4cd6'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'trigonometriya'),
  'uchburchakni-yechish',
  'trigonometriya/uchburchakni-yechish',
  1,
  'Uchburchakni yechish. Sinuslar va kosinuslar teoremasi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,10]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_a852a5c03507455afb181921'), 1, 24),
  subj."id",
  NULL::text,
  'planimetriya',
  'planimetriya',
  0,
  'Planimetriya',
  NULL,
  NULL,
  ARRAY['Geometriya (tekislikda)']::text[],
  ARRAY[7,8,9]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_53b6f8b3bdc83ca5aa77ab13'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'planimetriya'),
  'burchaklar-parallel',
  'planimetriya/burchaklar-parallel',
  1,
  'Burchaklar va parallel to''g''ri chiziqlar',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_e680f41fef00acc44f7f1261'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'planimetriya'),
  'uchburchaklar',
  'planimetriya/uchburchaklar',
  1,
  'Uchburchaklar va ularning tengligi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,8]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_d5a8f535cefd684b1c2e494e'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'planimetriya'),
  'pifagor-teoremasi',
  'planimetriya/pifagor-teoremasi',
  1,
  'To''g''ri burchakli uchburchak. Pifagor teoremasi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_a446a8b7ba6582c37068a28a'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'planimetriya'),
  'tortburchaklar',
  'planimetriya/tortburchaklar',
  1,
  'To''rtburchaklar',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_d5a18a8a82742a1d3f8cb775'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'planimetriya'),
  'oxshashlik',
  'planimetriya/oxshashlik',
  1,
  'O''xshashlik',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,9]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_44bb68b3a9329cf85ad3d42a'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'planimetriya'),
  'aylana-va-doira',
  'planimetriya/aylana-va-doira',
  1,
  'Aylana va doira',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,9]::integer[],
  5
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_96e54e074a5a2b6ec628559f'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'planimetriya'),
  'yuzalar',
  'planimetriya/yuzalar',
  1,
  'Yuzalar',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,9]::integer[],
  6
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_4dd5179d2f04ce1654bf6f7f'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'planimetriya'),
  'vektorlar-tekislikda',
  'planimetriya/vektorlar-tekislikda',
  1,
  'Vektorlar va koordinatalar tekislikda',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9]::integer[],
  7
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_ef429f9148c535553ef3761b'), 1, 24),
  subj."id",
  NULL::text,
  'stereometriya',
  'stereometriya',
  0,
  'Stereometriya',
  NULL,
  NULL,
  ARRAY['Fazoviy geometriya']::text[],
  ARRAY[10,11]::integer[],
  5
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_a863d1dc57001a8bd85a3420'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'stereometriya'),
  'fazoda-togri-chiziq-tekislik',
  'stereometriya/fazoda-togri-chiziq-tekislik',
  1,
  'Fazoda to''g''ri chiziq va tekisliklar',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[10]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_b5c20fbe08086c6b0e254709'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'stereometriya'),
  'prizma-parallelepiped',
  'stereometriya/prizma-parallelepiped',
  1,
  'Ko''pyoqlar. Prizma va parallelepiped',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[10,11]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_4bf19959ee72dff0c8111ae5'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'stereometriya'),
  'piramida',
  'stereometriya/piramida',
  1,
  'Piramida',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[10,11]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_2cb3bcdcbf63dd16d64c87a4'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'stereometriya'),
  'aylanma-jismlar',
  'stereometriya/aylanma-jismlar',
  1,
  'Aylanma jismlar. Silindr, konus, shar',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[11]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_546acd1de97b54eb1f4c252c'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'stereometriya'),
  'hajm-va-sirt',
  'stereometriya/hajm-va-sirt',
  1,
  'Hajmlar va sirt yuzalari',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[11]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_a04e136e9cbc1add79af9338'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'stereometriya'),
  'vektorlar-fazoda',
  'stereometriya/vektorlar-fazoda',
  1,
  'Fazoviy vektorlar va koordinatalar',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[11]::integer[],
  5
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_7b62bb40f29d8e626265ea5a'), 1, 24),
  subj."id",
  NULL::text,
  'kombinatorika-ehtimollik',
  'kombinatorika-ehtimollik',
  0,
  'Kombinatorika va ehtimollik',
  NULL,
  NULL,
  ARRAY['Kombinatorika','Ehtimollik nazariyasi','Statistika']::text[],
  ARRAY[9,10,11]::integer[],
  6
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_4e27c86ed28082b90011f000'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'kombinatorika-ehtimollik'),
  'kombinatorika-asoslari',
  'kombinatorika-ehtimollik/kombinatorika-asoslari',
  1,
  'Kombinatorika asoslari. O''rin almashtirish va guruhlash',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,10]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_50a6bc99c2fb98f03b0ec8d4'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'kombinatorika-ehtimollik'),
  'nyuton-binomi',
  'kombinatorika-ehtimollik/nyuton-binomi',
  1,
  'Nyuton binomi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[10,11]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_faeb4d143a3cbf5b8ad25ce9'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'kombinatorika-ehtimollik'),
  'klassik-ehtimollik',
  'kombinatorika-ehtimollik/klassik-ehtimollik',
  1,
  'Klassik ehtimollik',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,10,11]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_e5b9ec7dac6f41947c22bec0'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'kombinatorika-ehtimollik'),
  'ehtimollik-amallari',
  'kombinatorika-ehtimollik/ehtimollik-amallari',
  1,
  'Ehtimolliklarni qo''shish va ko''paytirish',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[10,11]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_82e1aaaccd50aa9fac47821e'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'kombinatorika-ehtimollik'),
  'statistika-elementlari',
  'kombinatorika-ehtimollik/statistika-elementlari',
  1,
  'Statistika elementlari',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,10]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_d112772131d805ab9b5921a0'), 1, 24),
  subj."id",
  NULL::text,
  'sonlar-nazariyasi',
  'sonlar-nazariyasi',
  0,
  'Sonlar nazariyasi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,8,9]::integer[],
  7
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_80c886d2ab3853e7da3d1004'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'sonlar-nazariyasi'),
  'bolinish-tub-sonlar',
  'sonlar-nazariyasi/bolinish-tub-sonlar',
  1,
  'Bo''linish belgilari va tub sonlar',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,8]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_066f033ef504678289ba3476'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'sonlar-nazariyasi'),
  'ekub-ekuk',
  'sonlar-nazariyasi/ekub-ekuk',
  1,
  'EKUB va EKUK',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,8]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_c3d6448deb2b435ba8e6e630'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'sonlar-nazariyasi'),
  'qoldiqli-bolish',
  'sonlar-nazariyasi/qoldiqli-bolish',
  1,
  'Qoldiqli bo''lish va modul arifmetikasi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,9]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_1663e040bcdc7328bf1b98f1'), 1, 24),
  subj."id",
  NULL::text,
  'amaliy-masalalar',
  'amaliy-masalalar',
  0,
  'Amaliy masalalar',
  NULL,
  NULL,
  ARRAY['Matnli masalalar','Foizlar']::text[],
  ARRAY[7,8,9]::integer[],
  8
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_c39f56461572c4c85006f473'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'amaliy-masalalar'),
  'foizlar',
  'amaliy-masalalar/foizlar',
  1,
  'Foizlar',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,8]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_178e8a01de48587e0d194f97'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'amaliy-masalalar'),
  'nisbat-proporsiya',
  'amaliy-masalalar/nisbat-proporsiya',
  1,
  'Nisbat va proporsiya',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,8]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_002fc5daa9c246cc6f29c5eb'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'amaliy-masalalar'),
  'harakat-masalalari',
  'amaliy-masalalar/harakat-masalalari',
  1,
  'Harakatga oid masalalar',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,9]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_13a8737eded6465e513dba02'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'amaliy-masalalar'),
  'ish-masalalari',
  'amaliy-masalalar/ish-masalalari',
  1,
  'Ish va unumdorlikka oid masalalar',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,9]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_c4c89d6ae64cbc338ec2ac84'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'amaliy-masalalar'),
  'aralashma-masalalari',
  'amaliy-masalalar/aralashma-masalalari',
  1,
  'Aralashma va qotishmaga oid masalalar',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,9]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE','PRESIDENT_SCHOOL']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Matematika')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_42b371b1f8565aa3bdaa5555'), 1, 24),
  subj."id",
  NULL::text,
  'ona-tili',
  'ona-tili',
  0,
  'Ona tili',
  NULL,
  NULL,
  ARRAY['Til bilimi']::text[],
  ARRAY[5,6,7,8,9,10,11]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Ona tili va adabiyot')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_9975fd0b824316615c9fa82e'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ona-tili'),
  'fonetika-orfoepiya',
  'ona-tili/fonetika-orfoepiya',
  1,
  'Fonetika va orfoepiya',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[5,6]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Ona tili va adabiyot')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_03231d59c9abdd9bc698ec66'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ona-tili'),
  'grafika-orfografiya',
  'ona-tili/grafika-orfografiya',
  1,
  'Grafika va orfografiya',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[5,6]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Ona tili va adabiyot')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_0da2218c965150c69c89b2fa'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ona-tili'),
  'leksikologiya',
  'ona-tili/leksikologiya',
  1,
  'Leksikologiya',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[6,7]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Ona tili va adabiyot')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_7bd8858a1aa7a08d9bf7dd71'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ona-tili'),
  'frazeologiya',
  'ona-tili/frazeologiya',
  1,
  'Frazeologiya',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[6,7]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Ona tili va adabiyot')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_439ea556856234e8048cf601'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ona-tili'),
  'morfemika',
  'ona-tili/morfemika',
  1,
  'Morfemika',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[6,7]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Ona tili va adabiyot')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_c7c28f190a635cfb8f4cb588'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ona-tili'),
  'soz-yasalishi',
  'ona-tili/soz-yasalishi',
  1,
  'So''z yasalishi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[6,7]::integer[],
  5
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Ona tili va adabiyot')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_cc939386333daa3367d3f4d5'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ona-tili'),
  'ot-turkumi',
  'ona-tili/ot-turkumi',
  1,
  'Ot turkumi',
  NULL,
  NULL,
  ARRAY['Ot']::text[],
  ARRAY[6,7]::integer[],
  6
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Ona tili va adabiyot')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_a5c057079ebd466e4ddc6929'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ona-tili'),
  'sifat',
  'ona-tili/sifat',
  1,
  'Sifat',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[6,7]::integer[],
  7
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Ona tili va adabiyot')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_1b4ba518a52764b3bcf4ec27'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ona-tili'),
  'son',
  'ona-tili/son',
  1,
  'Son',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[6,7]::integer[],
  8
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Ona tili va adabiyot')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_dc93cf6816929352e9059635'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ona-tili'),
  'olmosh',
  'ona-tili/olmosh',
  1,
  'Olmosh',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[6,7]::integer[],
  9
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Ona tili va adabiyot')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_43c29d669b5707df53390136'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ona-tili'),
  'fel',
  'ona-tili/fel',
  1,
  'Fe''l',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,8]::integer[],
  10
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Ona tili va adabiyot')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_ebf1786a08d7d8f4389760a8'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ona-tili'),
  'ravish',
  'ona-tili/ravish',
  1,
  'Ravish',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,8]::integer[],
  11
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Ona tili va adabiyot')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_bc52befd0036b05b846e3cf7'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ona-tili'),
  'yordamchi-soz-turkumlari',
  'ona-tili/yordamchi-soz-turkumlari',
  1,
  'Yordamchi so''z turkumlari',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,8]::integer[],
  12
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Ona tili va adabiyot')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_96319f5c3f0bdd397fa327fc'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ona-tili'),
  'undov-taqlid-modal',
  'ona-tili/undov-taqlid-modal',
  1,
  'Undov, taqlid va modal so''zlar',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,8]::integer[],
  13
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Ona tili va adabiyot')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_376737def3148f739c49ee4e'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ona-tili'),
  'soz-birikmasi',
  'ona-tili/soz-birikmasi',
  1,
  'So''z birikmasi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8]::integer[],
  14
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Ona tili va adabiyot')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_6e021aae361fd430478f97d4'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ona-tili'),
  'gap-bolaklari',
  'ona-tili/gap-bolaklari',
  1,
  'Gap bo''laklari',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8]::integer[],
  15
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Ona tili va adabiyot')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_34df629839d2a63f2fae7179'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ona-tili'),
  'sodda-gap-turlari',
  'ona-tili/sodda-gap-turlari',
  1,
  'Sodda gap turlari',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8]::integer[],
  16
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Ona tili va adabiyot')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_0f96eda4818f8e2c0a4bc0a0'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ona-tili'),
  'uyushiq-undalma-kirish',
  'ona-tili/uyushiq-undalma-kirish',
  1,
  'Uyushiq bo''laklar, undalma va kirish so''zlar',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8]::integer[],
  17
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Ona tili va adabiyot')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_cc3e5010697432ff226f8032'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ona-tili'),
  'qoshma-gap',
  'ona-tili/qoshma-gap',
  1,
  'Qo''shma gap',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9]::integer[],
  18
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Ona tili va adabiyot')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_b2e6a99fd977481b5d0e0d85'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ona-tili'),
  'kochirma-ozlashtirma-gap',
  'ona-tili/kochirma-ozlashtirma-gap',
  1,
  'Ko''chirma va o''zlashtirma gaplar',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9]::integer[],
  19
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Ona tili va adabiyot')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_c459ac225c44b32a972ef8c0'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ona-tili'),
  'nutq-uslublari-matn',
  'ona-tili/nutq-uslublari-matn',
  1,
  'Nutq uslublari va matn',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,10,11]::integer[],
  20
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Ona tili va adabiyot')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_03a7154c5bbeb805f1e2c1e8'), 1, 24),
  subj."id",
  NULL::text,
  'adabiyot',
  'adabiyot',
  0,
  'Adabiyot',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[5,6,7,8,9,10,11]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Ona tili va adabiyot')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_cbabb57d17b6a7bdfae4a172'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'adabiyot'),
  'xalq-ogzaki-ijodi',
  'adabiyot/xalq-ogzaki-ijodi',
  1,
  'Xalq og''zaki ijodi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[5,6]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Ona tili va adabiyot')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_4e033b961b400b72542be3ed'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'adabiyot'),
  'qadimgi-orta-asr-adabiyoti',
  'adabiyot/qadimgi-orta-asr-adabiyoti',
  1,
  'Qadimgi va o''rta asrlar adabiyoti',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,9]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Ona tili va adabiyot')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_28b62e98d4abd29647e16df1'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'adabiyot'),
  'alisher-navoiy',
  'adabiyot/alisher-navoiy',
  1,
  'Alisher Navoiy ijodi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,10]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Ona tili va adabiyot')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_4d68f8bda7618dd4aaa4d483'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'adabiyot'),
  'xv-xix-asr-adabiyoti',
  'adabiyot/xv-xix-asr-adabiyoti',
  1,
  'XV-XIX asr adabiyoti',
  NULL,
  NULL,
  ARRAY['XV–XIX asr adabiyoti']::text[],
  ARRAY[9,10]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Ona tili va adabiyot')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_15c6b88bf6392f26062a7896'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'adabiyot'),
  'jadid-adabiyoti',
  'adabiyot/jadid-adabiyoti',
  1,
  'Jadid adabiyoti',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[10]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Ona tili va adabiyot')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_b128d40b692b2a1435c10985'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'adabiyot'),
  'xx-asr-ozbek-adabiyoti',
  'adabiyot/xx-asr-ozbek-adabiyoti',
  1,
  'XX asr o''zbek adabiyoti',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[10,11]::integer[],
  5
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Ona tili va adabiyot')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_996b0aad6358331fb7c7cc10'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'adabiyot'),
  'mustaqillik-adabiyoti',
  'adabiyot/mustaqillik-adabiyoti',
  1,
  'Mustaqillik davri adabiyoti',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[11]::integer[],
  6
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Ona tili va adabiyot')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_1579696b5724672be127dc18'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'adabiyot'),
  'jahon-adabiyoti',
  'adabiyot/jahon-adabiyoti',
  1,
  'Jahon adabiyoti',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,10,11]::integer[],
  7
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Ona tili va adabiyot')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_fb0cee1c397b47959b3104da'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'adabiyot'),
  'adabiy-turlar-janrlar',
  'adabiyot/adabiy-turlar-janrlar',
  1,
  'Adabiy turlar va janrlar',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,9,10]::integer[],
  8
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Ona tili va adabiyot')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_a5d8d9dd630c8de9e764264c'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'adabiyot'),
  'adabiyot-nazariyasi',
  'adabiyot/adabiyot-nazariyasi',
  1,
  'Adabiyot nazariyasi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,10,11]::integer[],
  9
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Ona tili va adabiyot')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_79b779172586a3df1bfcf820'), 1, 24),
  subj."id",
  NULL::text,
  'sat-algebra',
  'sat-algebra',
  0,
  'Algebra',
  NULL,
  'Algebra',
  ARRAY['Algebraik atamalar','Algebraik ifodalar']::text[],
  ARRAY[10,11]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['SAT']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('SAT Math')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_f7628d52d1884283fe8c8c76'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'sat-algebra'),
  'sat-linear-equations-one-var',
  'sat-algebra/sat-linear-equations-one-var',
  1,
  'Linear equations in one variable',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[10,11]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['SAT']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('SAT Math')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_d6321625fe42cd6f25fdf236'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'sat-algebra'),
  'sat-linear-functions',
  'sat-algebra/sat-linear-functions',
  1,
  'Linear functions',
  NULL,
  NULL,
  ARRAY['To''g''ri chiziq tenglamasi']::text[],
  ARRAY[10,11]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['SAT']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('SAT Math')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_6fcf65bbfd282571aa552629'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'sat-algebra'),
  'sat-linear-systems',
  'sat-algebra/sat-linear-systems',
  1,
  'Systems of linear equations',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[10,11]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['SAT']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('SAT Math')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_18985ea03c17308d71c5edd0'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'sat-algebra'),
  'sat-linear-inequalities',
  'sat-algebra/sat-linear-inequalities',
  1,
  'Linear inequalities',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[10,11]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['SAT']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('SAT Math')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_d0b3efba3b1b89f4ce526295'), 1, 24),
  subj."id",
  NULL::text,
  'sat-advanced-math',
  'sat-advanced-math',
  0,
  'Advanced Math',
  NULL,
  'Advanced Math',
  ARRAY['Funksiyalar va grafiklar','Funksiya xossalari','Funksiya turlari','Funksiya nollari','Funksiya uzluksizligi','Funksiya almashtirishlari','Ko''rsatkichli funksiya']::text[],
  ARRAY[11]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['SAT']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('SAT Math')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_4598b9b28e06da9982164958'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'sat-advanced-math'),
  'sat-equivalent-expressions',
  'sat-advanced-math/sat-equivalent-expressions',
  1,
  'Equivalent expressions',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[11]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['SAT']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('SAT Math')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_b7f354593d5925140fc8cbcf'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'sat-advanced-math'),
  'sat-nonlinear-equations',
  'sat-advanced-math/sat-nonlinear-equations',
  1,
  'Nonlinear equations and systems',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[11]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['SAT']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('SAT Math')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_4d5151140c222f0cd85f2f0a'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'sat-advanced-math'),
  'sat-quadratic-functions',
  'sat-advanced-math/sat-quadratic-functions',
  1,
  'Quadratic functions',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[11]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['SAT']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('SAT Math')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_56dd48c88adcf26de94ee143'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'sat-advanced-math'),
  'sat-exponential-functions',
  'sat-advanced-math/sat-exponential-functions',
  1,
  'Exponential functions and growth',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[11]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['SAT']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('SAT Math')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_246367935ffe44c00c1b903e'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'sat-advanced-math'),
  'sat-function-notation',
  'sat-advanced-math/sat-function-notation',
  1,
  'Function notation, domain and range',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[11]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['SAT']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('SAT Math')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_cf3925ffa2466d4eb0611a89'), 1, 24),
  subj."id",
  NULL::text,
  'sat-data-analysis',
  'sat-data-analysis',
  0,
  'Problem-Solving and Data Analysis',
  NULL,
  'Problem-Solving and Data Analysis',
  ARRAY['Statistika','Ehtimollar nazariyasi']::text[],
  ARRAY[10,11]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['SAT']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('SAT Math')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_2dd3e9df5751bc5d8dda06e5'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'sat-data-analysis'),
  'sat-ratios-rates',
  'sat-data-analysis/sat-ratios-rates',
  1,
  'Ratios, rates and proportions',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[10,11]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['SAT']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('SAT Math')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_39b6d8c4832fccc7f3b10c98'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'sat-data-analysis'),
  'sat-percentages',
  'sat-data-analysis/sat-percentages',
  1,
  'Percentages',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[10,11]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['SAT']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('SAT Math')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_975d4f12bf5b2c5131994a4a'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'sat-data-analysis'),
  'sat-data-interpretation',
  'sat-data-analysis/sat-data-interpretation',
  1,
  'Data interpretation: tables and graphs',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[10,11]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['SAT']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('SAT Math')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_44037e05dae93c8de71871bd'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'sat-data-analysis'),
  'sat-center-spread',
  'sat-data-analysis/sat-center-spread',
  1,
  'Measures of center and spread',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[10,11]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['SAT']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('SAT Math')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_1265b9b120d91fc0a72afae8'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'sat-data-analysis'),
  'sat-probability',
  'sat-data-analysis/sat-probability',
  1,
  'Probability and conditional probability',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[10,11]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['SAT']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('SAT Math')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_4812fd9adf3940424bb1a11c'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'sat-data-analysis'),
  'sat-inference',
  'sat-data-analysis/sat-inference',
  1,
  'Inference and margin of error',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[11]::integer[],
  5
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['SAT']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('SAT Math')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_4cf5db88589f16fb46991714'), 1, 24),
  subj."id",
  NULL::text,
  'sat-geometry-trig',
  'sat-geometry-trig',
  0,
  'Geometry and Trigonometry',
  NULL,
  'Geometry and Trigonometry',
  ARRAY['Geometrik atamalar','Geometrik kattaliklar','Geometrik shakllar','Burchaklar']::text[],
  ARRAY[10,11]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['SAT']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('SAT Math')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_09292f2307e548db37ce9902'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'sat-geometry-trig'),
  'sat-lines-angles-triangles',
  'sat-geometry-trig/sat-lines-angles-triangles',
  1,
  'Lines, angles and triangles',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[10,11]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['SAT']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('SAT Math')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_f5706dafb70d5bddc20ac962'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'sat-geometry-trig'),
  'sat-right-triangles',
  'sat-geometry-trig/sat-right-triangles',
  1,
  'Right triangles and the Pythagorean theorem',
  NULL,
  NULL,
  ARRAY['To''g''ri burchakli uchburchak','Pifagor teoremasi']::text[],
  ARRAY[10,11]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['SAT']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('SAT Math')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_c339ccca02449f8592c0edb4'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'sat-geometry-trig'),
  'sat-circles',
  'sat-geometry-trig/sat-circles',
  1,
  'Circles',
  NULL,
  NULL,
  ARRAY['Aylana va doira']::text[],
  ARRAY[10,11]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['SAT']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('SAT Math')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_6e90e1f9ace27841c4dfba8c'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'sat-geometry-trig'),
  'sat-area-volume',
  'sat-geometry-trig/sat-area-volume',
  1,
  'Area and volume',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[10,11]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['SAT']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('SAT Math')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_1c89e6ad6da7717550e8c118'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'sat-geometry-trig'),
  'sat-trigonometry',
  'sat-geometry-trig/sat-trigonometry',
  1,
  'Trigonometric ratios',
  NULL,
  NULL,
  ARRAY['Trigonometriya']::text[],
  ARRAY[11]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['SAT']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('SAT Math')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_490e608d90d4023c7f199823'), 1, 24),
  subj."id",
  NULL::text,
  'sat-math-vocabulary',
  'sat-math-vocabulary',
  0,
  'Math Vocabulary',
  NULL,
  'Math Vocabulary',
  ARRAY['Matematik terminologiya','Matematika terminologiyasi','Matematik atamalar']::text[],
  ARRAY[9,10,11]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['SAT']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('SAT Math')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_ba1f4e6ec8de1ea05cc0e6f7'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'sat-math-vocabulary'),
  'sat-core-terms',
  'sat-math-vocabulary/sat-core-terms',
  1,
  'Core mathematical terms',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,10,11]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['SAT']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('SAT Math')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_a823ee53f605d7ed121eeff0'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'sat-math-vocabulary'),
  'sat-terms-algebra',
  'sat-math-vocabulary/sat-terms-algebra',
  1,
  'Terms in algebra',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,10,11]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['SAT']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('SAT Math')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_abb7687126ee17640d13ef5e'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'sat-math-vocabulary'),
  'sat-terms-geometry',
  'sat-math-vocabulary/sat-terms-geometry',
  1,
  'Terms in geometry',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,10,11]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['SAT']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('SAT Math')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_1890cf5ec67d8642bb7272f6'), 1, 24),
  subj."id",
  NULL::text,
  'ozbekiston-tarixi',
  'ozbekiston-tarixi',
  0,
  'O''zbekiston tarixi',
  NULL,
  NULL,
  ARRAY['O''zbekiston tarixi']::text[],
  ARRAY[6,7,8,9,10,11]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Tarix')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_ac595ec5661df5a7e5589cff'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ozbekiston-tarixi'),
  'ibtidoiy-jamiyat',
  'ozbekiston-tarixi/ibtidoiy-jamiyat',
  1,
  'Ibtidoiy jamiyat',
  NULL,
  NULL,
  ARRAY['Ibtidoiy davr yodgorliklari']::text[],
  ARRAY[6]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Tarix')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_1397e3ebf6bbae155699e29a'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ozbekiston-tarixi'),
  'ilk-davlatchilik',
  'ozbekiston-tarixi/ilk-davlatchilik',
  1,
  'Ilk davlatchilik',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[6,7]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Tarix')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_20ba1ef13a059e05f80ebfae'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ozbekiston-tarixi'),
  'ahamoniylar',
  'ozbekiston-tarixi/ahamoniylar',
  1,
  'Ahamoniylar davri',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[6,7]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Tarix')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_aacbe27096ad913741fe35b9'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ozbekiston-tarixi'),
  'aleksandr-istilosi',
  'ozbekiston-tarixi/aleksandr-istilosi',
  1,
  'Makedoniyalik Aleksandr istilosi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[6,7]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Tarix')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_d6b05c2b99e949bd65351c0c'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ozbekiston-tarixi'),
  'yunon-baqtriya',
  'ozbekiston-tarixi/yunon-baqtriya',
  1,
  'Yunon-Baqtriya podsholigi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[6,7]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Tarix')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_54824a2567dcef1c49129882'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ozbekiston-tarixi'),
  'kushonlar',
  'ozbekiston-tarixi/kushonlar',
  1,
  'Kushonlar davlati',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[6,7]::integer[],
  5
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Tarix')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_99a2c1b97bdd3833e033fb27'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ozbekiston-tarixi'),
  'eftaliylar',
  'ozbekiston-tarixi/eftaliylar',
  1,
  'Eftaliylar davlati',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7]::integer[],
  6
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Tarix')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_ac5635eaedf5f037741c0c84'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ozbekiston-tarixi'),
  'turk-xoqonligi',
  'ozbekiston-tarixi/turk-xoqonligi',
  1,
  'Turk xoqonligi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7]::integer[],
  7
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Tarix')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_c067e3b9655c52ab63747bba'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ozbekiston-tarixi'),
  'arab-istilosi',
  'ozbekiston-tarixi/arab-istilosi',
  1,
  'Arab istilosi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7]::integer[],
  8
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Tarix')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_89686c6c3cd45f9f0d922e42'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ozbekiston-tarixi'),
  'somoniylar',
  'ozbekiston-tarixi/somoniylar',
  1,
  'Somoniylar davlati',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7]::integer[],
  9
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Tarix')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_9457188a62bdb5e2c4c2fe88'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ozbekiston-tarixi'),
  'buyuk-ipak-yoli',
  'ozbekiston-tarixi/buyuk-ipak-yoli',
  1,
  'Buyuk Ipak yo''li',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[6,7]::integer[],
  10
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Tarix')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_65b0afd87c64e844eff858b8'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ozbekiston-tarixi'),
  'mogullar-istilosi',
  'ozbekiston-tarixi/mogullar-istilosi',
  1,
  'Mo''g''ullar istilosi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,8]::integer[],
  11
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Tarix')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_7fa19dfefedf07a749340d17'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ozbekiston-tarixi'),
  'amir-temur',
  'ozbekiston-tarixi/amir-temur',
  1,
  'Amir Temur davri',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,8]::integer[],
  12
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Tarix')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_62d790f756e573350985bc0d'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ozbekiston-tarixi'),
  'temuriylar',
  'ozbekiston-tarixi/temuriylar',
  1,
  'Temuriylar davri',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,8]::integer[],
  13
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Tarix')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_ba6f35e4ccc81cc20798efff'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ozbekiston-tarixi'),
  'shayboniylar',
  'ozbekiston-tarixi/shayboniylar',
  1,
  'Shayboniylar davlati',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8]::integer[],
  14
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Tarix')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_57e5356d600839eb845fa9e8'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ozbekiston-tarixi'),
  'buxoro-amirligi',
  'ozbekiston-tarixi/buxoro-amirligi',
  1,
  'Buxoro amirligi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,9]::integer[],
  15
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Tarix')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_3dd875236d2ecaf9a7bbc3e6'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ozbekiston-tarixi'),
  'qoqon-xonligi',
  'ozbekiston-tarixi/qoqon-xonligi',
  1,
  'Qo''qon xonligi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,9]::integer[],
  16
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Tarix')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_3e460898b00ae484810c179c'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ozbekiston-tarixi'),
  'xiva-xonligi',
  'ozbekiston-tarixi/xiva-xonligi',
  1,
  'Xiva xonligi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,9]::integer[],
  17
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Tarix')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_3bf6eab6d99b3fe934559ec2'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ozbekiston-tarixi'),
  'rossiya-istilosi',
  'ozbekiston-tarixi/rossiya-istilosi',
  1,
  'Rossiya istilosi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9]::integer[],
  18
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Tarix')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_1a59b5602c4af8e8cc312ef3'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ozbekiston-tarixi'),
  'rossiya-mustamlakachiligi',
  'ozbekiston-tarixi/rossiya-mustamlakachiligi',
  1,
  'Rossiya mustamlakachiligi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9]::integer[],
  19
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Tarix')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_3ea3ddd3b84f3cd627fd88c9'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ozbekiston-tarixi'),
  'jadidchilik',
  'ozbekiston-tarixi/jadidchilik',
  1,
  'Jadidchilik harakati',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9,10]::integer[],
  20
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Tarix')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_40448f58216258a6a23637a1'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ozbekiston-tarixi'),
  'sovet-davri',
  'ozbekiston-tarixi/sovet-davri',
  1,
  'Sovet davri O''zbekiston',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[10,11]::integer[],
  21
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Tarix')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_f135aa227bc02226e706b37b'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'ozbekiston-tarixi'),
  'mustaqil-ozbekiston',
  'ozbekiston-tarixi/mustaqil-ozbekiston',
  1,
  'Mustaqil O''zbekiston',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[11]::integer[],
  22
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Tarix')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_455b11d372b413c184cc2887'), 1, 24),
  subj."id",
  NULL::text,
  'jahon-tarixi',
  'jahon-tarixi',
  0,
  'Jahon tarixi',
  NULL,
  NULL,
  ARRAY['Umumiy tarix']::text[],
  ARRAY[6,7,8,9,10,11]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Tarix')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_bf2962fa837e6d1998ae302e'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'jahon-tarixi'),
  'qadimgi-sharq',
  'jahon-tarixi/qadimgi-sharq',
  1,
  'Qadimgi Sharq',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[6]::integer[],
  0
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Tarix')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_79e4424487affd6cdfc42787'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'jahon-tarixi'),
  'qadimgi-yunoniston',
  'jahon-tarixi/qadimgi-yunoniston',
  1,
  'Qadimgi Yunoniston',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[6]::integer[],
  1
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Tarix')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_16a65692d29d339469f6dba4'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'jahon-tarixi'),
  'qadimgi-rim',
  'jahon-tarixi/qadimgi-rim',
  1,
  'Qadimgi Rim',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[6]::integer[],
  2
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Tarix')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_478532c84e344e1948953e48'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'jahon-tarixi'),
  'garbiy-rim',
  'jahon-tarixi/garbiy-rim',
  1,
  'G''arbiy Rim imperiyasi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[6,7]::integer[],
  3
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Tarix')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_53e52fa5af5e61b0ed4562d1'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'jahon-tarixi'),
  'orta-asr-davlatlari',
  'jahon-tarixi/orta-asr-davlatlari',
  1,
  'O''rta asr davlatlari',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7]::integer[],
  4
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Tarix')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_5e7387f1f11da6da1c0ba543'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'jahon-tarixi'),
  'orta-asr-yevropa',
  'jahon-tarixi/orta-asr-yevropa',
  1,
  'O''rta asrlar Yevropa',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7]::integer[],
  5
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Tarix')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_c5426ab5bfe3956427b16dc1'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'jahon-tarixi'),
  'orta-asr-madaniyati',
  'jahon-tarixi/orta-asr-madaniyati',
  1,
  'O''rta asrlar madaniyati',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[7,8]::integer[],
  6
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Tarix')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_a692a2ec2447bd453446a38a'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'jahon-tarixi'),
  'uygonish-davri',
  'jahon-tarixi/uygonish-davri',
  1,
  'Uyg''onish davri',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8]::integer[],
  7
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Tarix')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_8364668bdbf92a7d58742236'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'jahon-tarixi'),
  'reformatsiya',
  'jahon-tarixi/reformatsiya',
  1,
  'Reformatsiya davri',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8]::integer[],
  8
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Tarix')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_72a375ce97cbb1fd894d4009'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'jahon-tarixi'),
  'geografik-kashfiyotlar',
  'jahon-tarixi/geografik-kashfiyotlar',
  1,
  'Buyuk geografik kashfiyotlar',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8]::integer[],
  9
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Tarix')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_411be006cecbf9d4b7b900b0'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'jahon-tarixi'),
  'xvii-xviii-inqiloblar',
  'jahon-tarixi/xvii-xviii-inqiloblar',
  1,
  'XVII-XVIII asr inqiloblari',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[8,9]::integer[],
  10
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Tarix')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_a5706f9f7ecfc731ea9a72a8'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'jahon-tarixi'),
  'sanoat-tontarishi',
  'jahon-tarixi/sanoat-tontarishi',
  1,
  'Sanoat to''ntarishi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9]::integer[],
  11
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Tarix')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_72ef071ea945754dbdf7f91b'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'jahon-tarixi'),
  'xix-asr-dunyosi',
  'jahon-tarixi/xix-asr-dunyosi',
  1,
  'XIX asr dunyosi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[9]::integer[],
  12
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Tarix')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_41c63bee489f386218aa6fa0'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'jahon-tarixi'),
  'birinchi-jahon-urushi',
  'jahon-tarixi/birinchi-jahon-urushi',
  1,
  'Birinchi jahon urushi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[10]::integer[],
  13
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Tarix')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_78c3fbd47e628954d7623e74'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'jahon-tarixi'),
  'ikkinchi-jahon-urushi',
  'jahon-tarixi/ikkinchi-jahon-urushi',
  1,
  'Ikkinchi jahon urushi',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[10,11]::integer[],
  14
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Tarix')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";

INSERT INTO "TopicNode" ("id", "subjectId", "parentId", "slug", "path", "level", "nameUz", "nameRu", "nameEn", "aliases", "grade", "order")
SELECT
  'tn_' || substr(md5(subj."id" || '|' || 'tn_86c8bb9bd17a5c9b2c4d1618'), 1, 24),
  subj."id",
  (SELECT "id" FROM "TopicNode" WHERE "subjectId" = subj."id" AND "slug" = 'jahon-tarixi'),
  'sovuq-urush',
  'jahon-tarixi/sovuq-urush',
  1,
  'Sovuq urush',
  NULL,
  NULL,
  '{}'::text[],
  ARRAY[11]::integer[],
  15
FROM "Subject" subj
JOIN "TestCategory" cat ON cat."id" = subj."categoryId"
WHERE cat."type" = ANY(ARRAY['DTM','SCHOOL','ATTESTATION','CERTIFICATE']::"TestType"[]) AND LOWER(subj."nameUz") = LOWER('Tarix')
ON CONFLICT ("subjectId", "slug") DO UPDATE SET
  "parentId" = EXCLUDED."parentId",
  "path" = EXCLUDED."path",
  "level" = EXCLUDED."level",
  "nameUz" = EXCLUDED."nameUz",
  "nameRu" = EXCLUDED."nameRu",
  "nameEn" = EXCLUDED."nameEn",
  "aliases" = EXCLUDED."aliases",
  "grade" = EXCLUDED."grade",
  "order" = EXCLUDED."order";
COMMIT;

-- Tekshiruv: har fan uchun qancha mavzu yozilganini ko'rsatadi (bir fan bir
-- nechta kategoriyada bo'lsa, shu qatorlar yig'indisi ko'rinadi).
SELECT s."nameUz" AS subject, count(*) AS topic_count
FROM "TopicNode" tn JOIN "Subject" s ON s."id" = tn."subjectId"
GROUP BY s."nameUz" ORDER BY s."nameUz";
