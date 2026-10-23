-- Nashr etilmagan testlar va ularning kurslarga bog'lanishi.
--
-- NIMA UCHUN: GET /api/tests/[id] va POST submit endi qoralama testni faqat
-- egasi (ustoz yoki Test.userId), ADMIN va nashr etilgan kursning QUIZ
-- darsi/blokiga ulangan bo'lsa ochadi (lib/test-visibility.ts). Bu so'rov
-- o'zgarish kimga ta'sir qilishini ko'rsatadi:
--   - linked_to_published_course = true  → talabalar uchun avvalgidek ochiq;
--   - false va results_by_others > 0     → begona foydalanuvchilarning eski
--     natijasidagi "Qayta yechish" endi 404 beradi (natijaning o'zi ochiq qoladi).
--
-- KIM BAJARADI: loyiha egasi, Neon SQL Editor'da. Faqat o'qiydi.

-- 1) HAR QORALAMA TEST BO'YICHA
SELECT
  t."id",
  t."titleUz",
  t."teacherId",
  t."userId"                               AS generated_for_user,
  t."createdAt",
  EXISTS (
    SELECT 1 FROM "CourseLesson" l
    JOIN "CourseSection" s ON s."id" = l."sectionId"
    JOIN "Course" c        ON c."id" = s."courseId"
    WHERE l."testId" = t."id" AND c."isPublished"
  ) OR EXISTS (
    SELECT 1 FROM "LessonBlock" b
    JOIN "CourseLesson" l  ON l."id" = b."lessonId"
    JOIN "CourseSection" s ON s."id" = l."sectionId"
    JOIN "Course" c        ON c."id" = s."courseId"
    WHERE b."testId" = t."id" AND c."isPublished"
  )                                        AS linked_to_published_course,
  (SELECT count(*) FROM "TestResult" r WHERE r."testId" = t."id")                AS results_total,
  (SELECT count(*) FROM "TestResult" r
     LEFT JOIN "Teacher" te ON te."id" = t."teacherId"
     WHERE r."testId" = t."id"
       AND r."userId" IS DISTINCT FROM te."userId"
       AND r."userId" IS DISTINCT FROM t."userId")                               AS results_by_others
FROM "Test" t
WHERE t."isPublished" = false
ORDER BY results_by_others DESC, t."createdAt" DESC;

-- 2) QISQA XULOSA
SELECT
  count(*)                                   AS draft_tests,
  count(*) FILTER (WHERE "userId" IS NOT NULL) AS generated_drafts
FROM "Test"
WHERE "isPublished" = false;
