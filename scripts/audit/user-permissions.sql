-- UserPermission qatorlari prod bazada bormi.
--
-- NIMA UCHUN: /admin/permissions sahifasi (menyuda tugmasi yo'q, faqat manzil
-- orqali) kategoriya bo'yicha UserPermission yozadi, lekin checkTestAccess,
-- resolveTestAccess, loadTestAccessContext va checkCourseAccess (lib/access.ts)
-- uni O'QIMAYDI — berilgan ruxsat hech narsani ochmaydi. Qaror (funksiyani
-- ishlatish yoki sahifani yopish) shu so'rov natijasiga bog'liq: qatorlar
-- bo'lsa, kimdir admin'dan ruxsat oldim deb o'ylab yurgan bo'lishi mumkin.
--
-- KIM BAJARADI: loyiha egasi, Neon SQL Editor'da. Faqat o'qiydi.

-- 1) UMUMIY HOLAT
SELECT
  count(*)                                                               AS total,
  count(*) FILTER (WHERE "isActive")                                     AS active,
  count(*) FILTER (WHERE "isActive" AND ("expiresAt" IS NULL OR "expiresAt" > now())) AS active_not_expired,
  count(DISTINCT "userId")                                               AS users,
  min("createdAt")                                                       AS first_granted,
  max("createdAt")                                                       AS last_granted
FROM "UserPermission";

-- 2) KATEGORIYA BO'YICHA (faqat faol va muddati tugamaganlar)
SELECT
  c."type",
  c."nameUz",
  count(*) AS active_permissions
FROM "UserPermission" p
JOIN "TestCategory" c ON c."id" = p."categoryId"
WHERE p."isActive" AND (p."expiresAt" IS NULL OR p."expiresAt" > now())
GROUP BY c."type", c."nameUz"
ORDER BY active_permissions DESC;

-- 3) FAOL RUXSATI BOR, LEKIN SHU KATEGORIYADAGI PULLIK TESTGA BOSHQA YO'L
--    BILAN (obuna/xarid) KIRA OLMAYDIGAN FOYDALANUVCHILAR SONI — ya'ni
--    1-variant (checkTestAccess UserPermission'ni o'qisin) kimga ta'sir
--    qiladi. Faol obunasi bo'lganlar chiqarib tashlangan.
SELECT count(DISTINCT p."userId") AS users_affected_by_option_1
FROM "UserPermission" p
WHERE p."isActive" AND (p."expiresAt" IS NULL OR p."expiresAt" > now())
  AND NOT EXISTS (
    SELECT 1 FROM "Subscription" s
    WHERE s."userId" = p."userId" AND s."isActive" AND s."endDate" >= now()
  );
