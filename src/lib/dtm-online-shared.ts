/**
 * `DTM_TITLE_PREFIX` `lib/dtm-online.ts`dan AJRATIB shu alohida faylga
 * chiqarilgan — `lib/dtm-online.ts` `db` (Prisma Client, faqat serverda
 * ishlaydi) import qiladi, shuning uchun klient komponentlar (masalan
 * `/session/[id]/page.tsx`, natijalar sahifasi — DTM sessiyasidan chiqish/
 * "ortga" havolasini `/dashboard/dtm-online`ga yo'naltirish uchun) uni
 * to'g'ridan-to'g'ri import qilsa, Next.js Prisma'ni brauzer to'plamiga
 * qo'shishga urinib buziladi. Bu fayl HECH qanday server-only bog'liqlikka
 * ega emas — klient va server ikkalasida ham xavfsiz import qilinadi.
 * `lib/dtm-online.ts` ham shu qiymatni shu yerdan qayta eksport qiladi.
 */
export const DTM_TITLE_PREFIX = 'DTM Online — ';
