-- FAQAT NAMUNA. Avtomatik bajarilmaydi; loyiha egasi Neon SQL Editor'da tekshiradi.
-- Avval disciplineKey ustuni migratsiyasi qo'llangan bo'lishi kerak.
-- Qatorlar nom bilan birlashtirilmaydi: UPDATE faqat tekshirilgan aniq id'larda.

SELECT s."id", s."nameUz", s."categoryId", c."type", s."disciplineKey",
  (SELECT count(*) FROM "Item" i WHERE i."subjectId" = s."id") AS item_count,
  (SELECT count(*) FROM "TopicNode" t WHERE t."subjectId" = s."id") AS topic_count,
  (SELECT count(*) FROM "Test" t WHERE t."subjectId" = s."id") AS test_count,
  (SELECT count(*) FROM "Subscription" sub
    WHERE s."id" = ANY(sub."subjectIds") AND sub."isActive" AND sub."endDate" >= now()) AS subscription_count
FROM "Subject" s JOIN "TestCategory" c ON c."id" = s."categoryId"
ORDER BY c."type", s."order", s."id";

-- Yuqoridagi SELECT natijasidan fizika qatorlari id'larini tekshirib qo'ying.
-- Attestatsiyadagi obuna fani ham, Item havzasi bog'langan fan ham kiritiladi.
-- Har xil fizika qatoriga bir xil 'fizika' kaliti berilishi ataylab qilingan.
-- Placeholder id'lar almashtirilmaguncha quyidagi namuna hech bir qatorga tegmaydi.
WITH mapping("id", "disciplineKey") AS (
  VALUES
    ('REPLACE_WITH_ATTESTATION_PHYSICS_SUBJECT_ID', 'fizika'),
    ('REPLACE_WITH_ITEM_POOL_PHYSICS_SUBJECT_ID', 'fizika')
)
UPDATE "Subject" s
SET "disciplineKey" = mapping."disciplineKey"
FROM mapping
WHERE s."id" = mapping."id" AND s."disciplineKey" IS NULL
RETURNING s."id", s."categoryId", s."nameUz", s."disciplineKey";

-- Yakuniy tekshiruv: bir kalit turli kategoriyalarda bo'lishi mumkin;
-- test kirishi baribir aniq categoryId + subjectId bilan cheklanadi.
SELECT "disciplineKey", array_agg("id" ORDER BY "id") AS subject_ids
FROM "Subject" WHERE "disciplineKey" IS NOT NULL
GROUP BY "disciplineKey" ORDER BY "disciplineKey";
