-- ============================================================================
-- S19 — eski AI tushuntirish kunlik kvotasi (SystemSetting, key shakli
-- "ai_explain_quota_<userId>_<YYYY-MM-DD>") endi ishlatilmaydi. Kvota
-- DailyUsage.tutorMessages ustuniga ko'chirildi (lib/quota.ts —
-- consumeTutorMessage). Bu yozuvlar shunchaki keraksiz qoldiq — o'chirish
-- xavfsiz, hech qanday hisoblagichga ta'sir qilmaydi (yangi kvota boshqa
-- jadvalda, nolldan boshlanadi).
--
-- BIR MARTALIK — CLAUDE.md talabiga ko'ra loyiha egasi Neon SQL Editor
-- orqali qo'llaydi, avtomatik ishga tushmaydi.
-- ============================================================================

DELETE FROM "SystemSetting"
WHERE "key" LIKE 'ai_explain_quota_%';
