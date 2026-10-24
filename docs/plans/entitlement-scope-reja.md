# O5a — funksiyalarni obuna doirasiga bog'lash

2026-10-24: loyiha egasi tasdiqlagan qamrov. Branch: `feat/entitlement-scope`.
Asos: [obuna modeli](obuna-modeli-reja.md). O1–O4 merge qilingan.

O5 ikkita ketma-ket PR: O5a — kirish/kvota; O5b — UI/status/cron/admin.
O5b faqat O5a merge bo'lgach alohida rejalashtiriladi.

## Audit: hozirgi qoida → yangi qoida

| Joy | O5a'dan oldin | O5a qarori |
|---|---|---|
| `quota.ts` | Premium/Ustoz/ADMIN umumiy cheklovsiz | Kontent ma'lum bo'lsa o'z doirasida; importda `hasAnyScope` |
| `/build` → `sessions.ts` → TestSession | Eski tarif asosida 3/kun yoki cheklovsiz | Tanlangan haqiqiy Item'larning barcha disciplineKey'lari qamralsa cheklovsiz; aks holda bitta bepul kvota |
| `results/[id]`, `resolveSolutionTiers` | Yozma Premium/Ustoz/ADMIN; video Premium/ADMIN | Yangi doirada yozma va video ochiq; eski tier matritsasi saqlanadi |
| `unlock-solution` | Umumiy foydalanuvchi kvotasi | Testda aniq categoryId/subjectId, mustaqil Item'da disciplineKey |
| `ai-explain` | Eski obunalar bo'yicha qulf va kvota | Xuddi shu kontent doirasi; kesh va mualliflik yechimi qoidalari saqlanadi |
| `practice-answer-check` | Eski tarif yoki avval ochilgan yechim | Item doirasi ham yozmani ochadi; video qaytarilmaydi, kvota sarflanmaydi |
| `student/mastery-map` | Eski tarif cheklovsiz; boshqa foydalanuvchi 30 kunda bir marta | So'ralgan fan disciplineKey'i doirada bo'lsa cheklovsiz; qolgan holatda mavjud 30 kunlik tartib |
| `dtm-online/start` | Premium **va Ustoz**/ADMIN cheklovsiz; qolganlarga 30 kunda bir marta | Yangi huquqda DTM kategoriyasidagi imtihon fanlari to'liq qamralishi kerak; ikkala eski tarif saqlanadi |
| `checkCourseAccess` | Eski accessType matritsasi, paid uchun xarid | Yangi doiradagi premium/teacher/premium_teacher/subscription ochiq; paid faqat xarid/BUNDLE/ADMIN; eski matritsa saqlanadi |
| `subscription/status` | Yangi obuna ham FREE deb chiqishi mumkin | O5b: mahsulot, fanlar, sana; O5a o'zgartirmaydi |
| `Sidebar` | Faqat eski plan nomlari | O5b: yangi obuna tafsilotlari |
| `SubscriptionExpiryBanner` | Eski nom va umumlashtirilgan muddat | O5b: aynan tugayotgan mahsulot/fan/sana, uz/ru/en |
| `PremiumBanner` | Statusning eski plan maydoniga qaraydi | O5b: yangi faol obunani ham tanish |
| `cron/subscription-alerts` | Yangi tarifni Ustoz deb ataydi, matn uz | O5b: mahsulot/fan/sana, uz/ru/en, Toshkent kuni |
| Admin users, subscriptions/payments/bosh sahifa ko'rsatkichlari | Ayrim yangi tariflar eski nom bilan ko'rinadi | O5b: noto'g'ri ko'rsatkichlarni moslash |
| Admin notifications | Eski all/free/premium/teacher auditoriyasi | Filtrlar ma'nosi o'zgarmaydi; mahsulot/fan auditoriyasi keyingi alohida ish |
| `referral/check-reward`, referral holati | Eski PREMIUM mukofoti | O'zgartirilmaydi; variantlar pastda |
| Admin seed, Prisma seed, paramgen/topic seed | Eski plan/nom asosidagi kontent yaratish | O'zgartirilmaydi va ishga tushirilmaydi |
| Bot/to'lovlardagi eski plan tekshiruvlari | Eski PENDING va alohida xarid mosligi | Saqlanadi, ushbu PR'da o'zgarmaydi |

## Yagona sof doira moduli

`entitlements.ts`: `inScope`, `hasAnyScope`, `inDisciplineScope` va ko'p
kontent doirasini birga tekshiruvchi yordamchilar. DB o'qish `access.ts`da.

- ADMIN/BUNDLE: barcha doira.
- CATEGORY NONE: butun kategoriya; ONE/DTM_BLOCK: categoryId va saqlangan subjectIds.
- UserPermission: faol, muddati o'tmagan kategoriya + ixtiyoriy subjectId.
- Eski PREMIUM/TEACHER_PLAN: mavjud umumiy funksiya huquqi saqlanadi.
- Eski video: faqat PREMIUM/ADMIN; yangi doira esa videoni ham ochadi.
- Test paywall'i O1 accessType qoidalarini saqlaydi; eski umumiy funksiya huquqi testlar kirishiga yoyilmaydi.
- Yangi obuna hali startDate'iga yetmagan bo'lsa doira bermaydi; endDate chegarasi inclusive.
- Eski tarif yonidagi yangi obuna ham o'z doirasida video huquqini beradi.

## Subject auditi va migratsiya

| Manba | Jismoniy Subject tanlovi |
|---|---|
| Paramgen `resolveSubject` | Kategoriya cheklovisiz nameUz bo'yicha birinchi qator; topilmasa Parametrik kategoriyasi |
| Question → Item backfill | Question.subjectId, bo'sh bo'lsa Test.subjectId |
| BankQuestion → Item | BankQuestion.subjectId |
| Fizika TopicNode seed | DTM/SCHOOL/ATTESTATION/CERTIFICATE kategoriyalarining har birida alohida Subject |
| Bilim xaritasi | Question → Test.subjectId; topic-bridge ham shu id ichida qidiradi |

Prod'dagi aniq id va kontent sonlari lokal koddan aniqlanmaydi.
[SELECT/UPDATE namunasi](entitlement-scope-backfill.sql) ularni ko'rish va
faqat egasi tekshirgan id'larga kalit berish uchun. SQL bajarilmagan.

`Subject.disciplineKey String?` — additive nullable ustun. Nomdan entitlement
hisoblanmaydi. Test/kurs — aniq categoryId/subjectId; mustaqil Item, /build va
Bilim xaritasi — disciplineKey. Kategoriya ruxsatining kalitlari faqat shu
kategoriyadagi Subject'lardan olinadi. Kalit yo'q bo'lsa mustaqil kontentda
faqat eski tarif/BUNDLE/ADMIN cheklovsiz.

Migratsiya: `20261024090000_add_subject_discipline_key`. Ulanishsiz
`prisma migrate diff` orqali yaratiladi, SQL o'qib tekshiriladi,
`npm run db:manual -- 20261024090000_add_subject_discipline_key` bilan
Neon SQL Editor fayli tayyorlanadi. Prod'ga faqat loyiha egasi qo'llaydi.
Backfill alohida namuna, migratsiya ichida UPDATE yo'q.

## QuotaField konteksti

| QuotaField | Doira | Bepul tartib |
|---|---|---|
| builtTests | Haqiqiy tanlangan Item'larning disciplineKey'lari; aralash bo'lsa hammasi qamralishi shart | 3/kun |
| solutionsUnlocked | Test savolida test categoryId/subjectId; mustaqil Item'da disciplineKey | 10/kun |
| tutorMessages | Tushuntirilayotgan savolning xuddi shu doirasi | 3 yangi generatsiya/kun; kesh sarflamaydi |
| imports | Kontekstsiz `hasAnyScope` | Mavjud import limiti; ImportJob asosidagi hisob saqlanadi |
| dtmOnline | DailyUsage maydoni hozir ishlatilmaydi; route barcha imtihon fanlarini tekshiradi | Mavjud 30 kunlik tartib, yangi kunlik kvota qo'shilmaydi |

Kontekst tushib qolishi yangi obunaga umumiy huquq bermaydi. Faqat import
ataylab kontekstsiz hisoblanadi. Kvota belgisini mijoz yubormaydi:
`TestSession.spec.builtQuotaCharged`ni server haqiqiy sarfga qarab yozadi.
Sarflamagan sessiya boshqa sessiyaning kvotasini refund qilmaydi.
Eski belgisiz sessiyalar oldingi refund tartibida qoladi.

DTM generatori bilan kirish tekshiruvi bir xil majburiy fan qatorlarini
oladi; doira aniq id'larda tekshiriladi. Generatorning mavjud majburiy fan
tanlash va ball/shuffle qoidalari o'zgartirilmaydi.

Bilim xaritasi `?subjectId=...` bo'yicha shu fan statistikasini oladi.
Fan ko'rsatilmasa butun qaytadigan xarita tekshiriladi: barcha fanlar doirada
bo'lsa cheklovsiz, aks holda mavjud bepul tartib. Qisman yopiq sahifa yo'q.
Statistikaning Question asosidagi o'qishi o'zgarmaydi; Item o'qishi qo'shilmaydi.

## Tekshirish

- Sof doira: ONE/NONE/DTM_BLOCK/BUNDLE/ADMIN, ruxsatlar, muddatlar, birlashgan doiralar va bo'sh kalit.
- Eski PREMIUM/TEACHER_PLAN: kvota, DTM, kurs va yozma/video matritsasi.
- Attestatsiya-fizika: aniq test ochiq; boshqa Subject fizika konstruktori/xaritasi kalit bilan ochiq; DTM bepul.
- Aralash sessiya: kvota bitta, yechim savolma-savol; server spec belgisi va refund.
- AI: doira, kvota, kesh, mualliflik yechimi va natijaga tegishlilik himoyasi.
- Obuna/savol soni oshganda entitlement va unlock SELECT sonlari o'smasligi.
- `npx tsc --noEmit`, `npm run lint`, `npm test`, `npx prisma generate` va `npx next build`.
- Git fayllari faqat nomma-nom stage; bitta branch/PR; merge loyiha egasida.

## Keyingi ishlar

- O5b: O4 `subscription-details.ts`dan foydalanib status/UI/cron/admin ko'rsatkichlari.
- Bilim xaritasi statistikasiga Item asosidagi natijalarni qo'shish — alohida vazifa.
- Admin notifications mahsulot/fan auditoriyasi — O5a/O5b qamrovidan tashqari.
- Referral tanlovi: faol obunani N kunga uzaytirish; tanlangan mahsulot/fanga
  muddatli ruxsat; yoki hozirgi eski PREMIUM mukofotini vaqtincha saqlash.
  Qaysi biri bo'lishini loyiha egasi tanlaydi, ushbu PR hech birini amalga oshirmaydi.
- Seed'lar ushbu ikki PR'da o'zgartirilmaydi.
