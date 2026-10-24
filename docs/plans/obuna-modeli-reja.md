# Obuna modeli: kategoriya va fan bo'yicha obunalar — reja va Claude Code sessiyalari

Holat: 2026-10-23 da kelishilgan. 2026-10-24 yangilanishi: O1–O4 merge qilingan; O5a kirish/kvota va O5b UI qismlariga ajratildi. Prod migratsiyalarini loyiha egasi qo'llaydi.
Ishga tushirish sharti: **ikkinchi fanning attestatsiya kontenti chiqishidan oldin**. Kuzgi attestatsiya mavsumi (26-oktabr – 11-noyabr, fizika) hozirgi tarif bilan o'tadi: hozirgi ustoz tarifi amalda "Attestatsiya — Fizika", chunki attestatsiyada faqat fizika bor.

Tartib: **O1 → O2 → O3 → O4 → O5**. Har sessiya = bitta branch = bitta PR (CLAUDE.md). Har promptni yangi Claude Code sessiyasiga to'liq nusxalang.

| # | Sessiya | Migratsiya | Hajm | Holat |
|---|---|---|---|---|
| O1 | Ma'lumot modeli + kirish mantig'i (`access.ts`) | ha (additive) | katta | merge |
| O2 | Admin: mahsulotlar, narx va muddatlar, ruxsatlar, majburiy fanlar | ha (UserPermission unique indeksi) | o'rta | merge |
| O3 | Telegram bot to'lov oqimi + admin tasdiqlash | ha (Payment ustunlari) | katta | merge |
| O4 | `/pricing` sahifasi | yo'q | o'rta | merge |
| O5a | Funksiyalarni obuna doirasiga bog'lash (kvota, DTM Online, Bilim xaritasi, AI, yechimlar, kurslar) | ha (Subject.disciplineKey) | katta | ushbu sessiya |
| O5b | Status, Sidebar/banner, cron va admin ko'rsatkichlari | rejalashtiriladi | o'rta | O5a merge'dan keyin |

---

## Kelishilgan qarorlar

**Mahsulotlar (har kategoriya alohida obuna):**

| Mahsulot | Fan qoidasi | Muddat variantlari (admin o'zgartiradi) |
|---|---|---|
| Hammasi (paket) | yo'q — barcha kategoriya va fanlar | admin belgilaydi |
| Attestatsiya | bitta fan | "1 oy", "Mavsum davomida" |
| Milliy sertifikat | bitta fan | admin belgilaydi (o'ziga xos) |
| DTM | blok: 2 ta asosiy fan + 3 ta majburiy fan (avtomatik) | "3 oy", "Imtihongacha" |
| Maktab | butun kategoriya | admin belgilaydi |
| Prezident maktabi | butun kategoriya | admin belgilaydi |
| SAT | butun kategoriya | admin belgilaydi |
| GRE | butun kategoriya | admin belgilaydi |

- Har mahsulotda **2 tadan muddat varianti**. Variant nomi, muddati (N oy/kun yoki aniq sanagacha) va narxi admin paneldan belgilanadi, kodda qattiq yozilmaydi.
- Fan **to'lovda tanlanadi**, obuna davomida o'zgarmaydi (o'zgartirishni faqat admin qila oladi).
- **Bitta obuna = bitta fan** (DTM'da — bitta blok). Qo'shimcha fan uchun yangi obuna olinadi, foydalanuvchida bir nechta obuna bo'ladi.
- **Ikkinchi fan uchun chegirma:** shu kategoriyada faol obunasi bo'lsa, keyingi fan chegirma bilan (foizni admin belgilaydi).
- **"Hammasi" paketi qoladi** (langar narx).
- **O'quvchi Premium'i attestatsiyani ochmaydi.** Attestatsiya faqat attestatsiya obunasi, "Hammasi" paketi, admin ruxsati yoki bitta mock xaridi orqali ochiladi.
- **Admin ruxsati (UserPermission):** kategoriya + ixtiyoriy fan (fan bo'sh bo'lsa butun kategoriya), muddatli. Maktab/tuman kelishuvlari, promo va sinov uchun.
- **Funksiyalar** (test tuzish, DTM Online, Bilim xaritasi, AI tushuntirish, kunlik limitlar, yozma/video yechimlar): har qanday faol obuna ularni **o'z kategoriyasi va fanlari doirasida** ochadi.
- **Kontenti yetarli bo'lmagan kategoriya sotilmaydi.** Mahsulotda "sotuvda" belgisi bo'ladi, kontent tayyor bo'lmaguncha o'chiq turadi.

**Eski obunalar:** faol `PREMIUM` va `TEACHER_PLAN` obunalari muddati tugaguncha hozirgi qoidalar bilan ishlaydi (to'lagan mijozning huquqi kamaymaydi). O3 ishga tushgach, eski tariflar sotilmaydi.

- **Obuna doirasidagi barcha testlar ochiladi, `accessType = 'paid'` (alohida sotiladigan mock) ham.** Attestatsiya-fizika obunachisi fizika attestatsiyasining barcha mocklarini yechadi (2026-10-23 qarori). Bitta mock xaridi obunasi yo'q foydalanuvchilar uchun qoladi. Pullik kurslar bunga kirmaydi — ular alohida mahsulot.
- Narxlar — admin paneldan kiritiladi.

---

## Kodda hozir bor narsalar (2026-10-23, main 285848c)

- `Subject` bitta kategoriyaga tegishli (`Subject.categoryId`): attestatsiyadagi "Fizika" va DTM'dagi "Fizika" — ikki xil qator. Fan bo'yicha ruxsat = shu kategoriyadagi `subjectId`.
- `Test`: `categoryId`, `subjectId`, `accessType` (free, premium, teacher, premium_teacher, paid), `isFree`. Test modelida category relation yo'q.
- `Subscription`: `plan` (enum `PREMIUM | TEACHER_PLAN`), `duration` (enum `ONE_MONTH | THREE_MONTHS | SIX_MONTHS | ONE_YEAR`), `endDate`, `isActive`. Fan maydoni yo'q.
- `Payment.selectedSubjects String[]` — dastlab "TEACHER_PLAN uchun tanlangan fanlar" uchun qo'shilgan, keyin bitta test va kurs xaridlarining id'lari ham yozilgan. **Unga fan tanlovi uchun tayanmang.**
- `UserPermission`: `userId`, `categoryId`, `expiresAt`, `isActive`, `@@unique([userId, categoryId])`. Kirish tekshiruvlari uni o'qimaydi (PR #223 auditi). Prod'da 4 ta faol qator bor, hammasi admin sinovi (users_affected = 0).
- `access.ts`: `checkTestAccess`, `resolveTestAccess` + `loadTestAccessContext` (ro'yxat uchun, N+1 siz), `checkCourseAccess`, `hasActiveSubscription` → `{ premium, teacher }`.
- `hasActiveSubscription` foydalanuvchilari: `quota.ts`, `results/[id]` + `ai-explain`, `practice-answer-check`, `student/mastery-map`, `dtm-online/start`, `subscription/status`, `cron/subscription-alerts`, `referral/check-reward`, `Sidebar`, `SubscriptionExpiryBanner`, admin (subscriptions, payments, users, notifications, seed).
- Narxlar: `SystemSetting` (`premium_price_1_month` … `teacher_price_*`), `/pricing` → `PricingClient.tsx` (zaxira narxlar kodda).
- To'lov: Telegram bot (`api/telegram/payments`, `api/telegram/webhook`), chek rasmi, admin tasdiqlaydi (`api/admin/payments`), `durationMap` oylarga aylantiradi.

---

## O1 — Ma'lumot modeli va kirish mantig'i

```
Vazifa: kategoriya va fan bo'yicha obuna modelining poydevori — ma'lumot modeli va kirish mantig'i. Admin UI, bot va /pricing keyingi sessiyalarda. Avval loyiha hujjatidagi "Kelishilgan qarorlar" bo'limiga tayaning (quyida qisqa).

Branch: feat/category-subscriptions-model

Qarorlar: har kategoriya alohida mahsulot; fan qoidasi — NONE (butun kategoriya), ONE (bitta fan: Attestatsiya, Milliy sertifikat), DTM_BLOCK (2 asosiy + 3 majburiy fan); "Hammasi" paketi (BUNDLE) hammasini ochadi; har mahsulotda admin belgilaydigan muddat variantlari (N oy yoki aniq sanagacha) va narx; ikkinchi fan uchun chegirma foizi; o'quvchi PREMIUM'i attestatsiyani OCHMAYDI; eski PREMIUM/TEACHER_PLAN obunalari muddati tugaguncha hozirgi qoidalar bilan ishlaydi.

1) Prisma (faqat additive, CLAUDE.md tartibida migrate diff ulanishsiz, npm run db:manual bilan Neon SQL; o'zingiz qo'llamang):
- Product: id, kind (enum ProductKind: BUNDLE | CATEGORY), categoryId (nullable, BUNDLE da null; TestCategory relation), subjectRule (enum SubjectRule: NONE | ONE | DTM_BLOCK), nameUz/Ru/En, isOnSale Boolean default false, secondSubjectDiscountPct Int default 0, order Int, createdAt/updatedAt.
- ProductOffer: id, productId, labelUz/Ru/En, durationMonths Int? , untilDate DateTime? (ikkalasidan aynan bittasi — kodda tekshiring), price Int, isActive Boolean default true, order Int.
- Subscription ga: productId String?, offerId String?, categoryId String?, subjectIds String[] @default([]). Mavjud plan/duration majburiy ustunlari uchun: enum SubscriptionPlan ga CATEGORY va BUNDLE, SubscriptionDuration ga CUSTOM qiymatlari qo'shilsin (ALTER TYPE ADD VALUE). Eski qatorlar o'zgarmaydi.
- UserPermission ga: subjectId String? (null = butun kategoriya). O1 da mavjud @@unique([userId, categoryId]) saqlanadi; bir kategoriyada bir nechta fan ruxsati uchun indeksni va admin API ni moslash O2 ga qoldirilgan (2026-10-23 tasdig'i).
- Subject ga: isMandatory Boolean @default(false) (DTM majburiy fanlari).
Migratsiya SQL'ida DROP yoki ma'lumot o'zgartirish chiqsa — to'xtang va yozing.

2) Kirish mantig'i (src/lib/access.ts) — bitta sof yadro, uchala yo'l shundan foydalanadi:
- Sof funksiya canAccessByEntitlements(test: { id, categoryId, subjectId, accessType, isFree }, ent): boolean. Tartib: bepul → true; ADMIN → true; BUNDLE obunasi → true (paid testlar ham); CATEGORY obunasi: categoryId mos va (subjectRule NONE yoki test.subjectId ∈ subjectIds) → true (accessType'dan qat'i nazar, paid mocklar ham); UserPermission: faol, muddati tugamagan, categoryId mos va (subjectId null yoki = test.subjectId) → true; eski PREMIUM/TEACHER_PLAN — hozirgi accessType qoidalari aynan saqlanadi; paid → Purchase/legacy. Aks holda false.
- Yangi accessType qiymati 'subscription' ("Obuna bilan"): faqat obuna doirasida (yoki BUNDLE / UserPermission) ochiladi. Eski obunachilar uchun: eski TEACHER_PLAN 'subscription' testlarini ATTESTATION kategoriyasida ochadi (ular attestatsiya uchun to'lagan); eski PREMIUM 'subscription' testlarini ATTESTATION'dan tashqari kategoriyalarda ochadi. Eski qiymatlar (premium, teacher, premium_teacher) bazada qoladi va avvalgidek ishlaydi — bu sessiyada ko'chirilmaydi. TestCategory/accessType ro'yxati bo'lgan barcha joylarni (Zod sxemalar, TestCard qulf belgisi, hasAccess) 'subscription' ga moslang.
- checkTestAccess, loadTestAccessContext + resolveTestAccess shu yadroga o'tkaziladi. Kontekst yuklash ko'pi bilan avvalgidek bir nechta so'rov (N+1 yo'q); UserPermission va yangi obunalar bitta-bitta so'rov bilan.
- DTM_BLOCK obunasida subjectIds sotib olish paytida to'liq yoziladi (2 asosiy + majburiy fanlar) — kirish tekshiruvi blok qoidasini qayta hisoblamaydi.
- hasActiveSubscription chaqiruvchilari (kvota va funksiyalar) BU sessiyada o'zgarmaydi — O5 da. Lekin yangi entitlement yuklovchi funksiya (masalan loadUserEntitlements(userId)) va "foydalanuvchida biror faol obuna bormi" yordamchisi shu yerda qo'shilsin.
- checkCourseAccess ga tegmang (O5).

3) Testlar (majburiy): (a) eski PREMIUM/TEACHER_PLAN uchun yangi yadro eski checkTestAccess bilan bir xil natija beradi — barcha accessType × obuna kombinatsiyalari; (b) CATEGORY ONE: o'z fani ochiq, boshqa fan va boshqa kategoriya yopiq; (c) DTM_BLOCK: subjectIds dagi 5 fan ochiq, qolgani yopiq; (d) NONE: butun kategoriya; (e) BUNDLE: hammasi, paid ham; (f) CATEGORY obunasi o'z doirasidagi paid testni (mockni) ochadi, doiradan tashqaridagi paid testni ochmaydi; (g) UserPermission: fanli, fansiz, muddati tugagan, isActive=false; (h) resolveTestAccess va checkTestAccess har holatda bir xil.

4) Hech qanday Product/ProductOffer qatorini seed qilmang. PR tavsifida loyiha egasi uchun Neon'da bajariladigan INSERT namunasi (8 ta mahsulot, har biriga 2 ta variant, narx 0 — keyin admin paneldan to'ldiriladi, isOnSale=false) va DTM majburiy fanlarini belgilaydigan UPDATE namunasi (SELECT bilan id'larni ko'rish) yozing. Bajarmang.

Qilinmasin: bot, admin UI, /pricing, kvota va funksiyalarga tegmang. Eski Payment.selectedSubjects ga yangi ma'no yuklamang.

Qabul mezonlari: migratsiya faqat additive va CI'da zanjir yashil; eski obunachilar uchun kirish natijasi bit-bit o'zgarmagan (testlar bilan isbot); yangi qoidalar testlangan; CLAUDE.md tekshiruvlari toza.
Git'da untracked fayllar bor — git add -A emas, faqat o'zgargan fayllarni nomma-nom qo'shing.
```

---

## O2 — Admin: mahsulotlar, ruxsatlar, majburiy fanlar

```
Vazifa: O1 da qo'shilgan modellar uchun admin panel. O1 merge qilingan.

Branch: feat/admin-products

1) Admin → "Mahsulotlar" sahifasi: Product ro'yxati (8 ta). Har birida: nom (uz/ru/en), "Sotuvda" almashtirgichi, ikkinchi fan chegirmasi (%), tartib. Ichida muddat variantlari (ProductOffer): nom (uz/ru/en), muddat turi — "N oy" yoki "Sanagacha" (sana Toshkent vaqti bo'yicha, CLAUDE.md "Sana va vaqt"), narx (so'm), faol/nofaol, tartib. Har mahsulotda 2 tadan ortiq faol variant bo'lsa — ogohlantirish (taqiqlash emas). Yangi Product yaratish shart emas (O1 dagi INSERT bilan qo'shilgan); variant qo'shish/tahrirlash/o'chirish (nofaol qilish) bor.
2) "Sotuvda" yoqilayotganda: kategoriyadagi nashr etilgan testlar sonini ko'rsating (fan qoidasi ONE bo'lsa — fan bo'yicha). 0 bo'lgan fan yoki kategoriya uchun ogohlantirish.
3a) UserPermission unique indeksini [userId, categoryId, subjectId] ga almashtirish (DROP INDEX — ma'lumot yo'qotmaydi, PR'da alohida ko'rsating) va admin API'dagi userId_categoryId upsert'ini moslash. subjectId NULL bo'lganda Postgres takrorlarni ruxsat beradi — bir xil (userId, categoryId, NULL) ruxsatni admin API o'zi tekshirib yangilasin, yangi qator yaratmasin.
3) /admin/permissions sahifasini qayta ishlating (hozir admin menyusida unga tugma yo'q — faqat manzil orqali ochiladi): foydalanuvchi qidirish, kategoriya, fan (ixtiyoriy — "Butun kategoriya"), muddat. Ro'yxatda faol ruxsatlar, bekor qilish. Admin menyusiga havola qo'shing.
4) Admin → obunalar (mavjud /admin/subscriptions): qo'lda obuna berishda mahsulot, variant va fan(lar) tanlash; DTM blokida 2 asosiy fan tanlanadi, majburiylari avtomatik qo'shiladi (umumiy sof funksiya — O3 da ham ishlatiladi: buildSubjectIds(product, chosenSubjectIds, mandatorySubjects)). endDate hisoblash ham umumiy sof funksiya: computeEndDate(offer, now) — Toshkent vaqti, testlar bilan.
5) Fanlar boshqaruvida DTM fanlari uchun "Majburiy fan" belgisi (Subject.isMandatory).
5b) Test yaratish/tahrirlash formasi (ustoz va admin): kirish turi tanlovi 4 ta eski variant (Premium, Bepul, Ustoz, Ustoz+Premium) o'rniga 3 ta: "Bepul" (free), "Obuna bilan" ('subscription'), "Alohida sotiladi" (paid + narx; obuna doirasida baribir ochiq bo'lishini forma ostida izohlang). Eski qiymatli testni tahrirlashda forma uni "Obuna bilan" deb ko'rsatsin, lekin foydalanuvchi saqlamaguncha bazadagi qiymat o'zgarmasin. PR tavsifida eski qiymatlarni 'subscription' ga o'tkazadigan UPDATE namunasi — eski obunalar tugagandan keyin bajarish uchun (bajarmang).
6) Barcha admin API'lari requireAdmin; Zod validatsiya; route testlari.

Matnlar uz/ru/en (admin paneli qaysi tillarda bo'lsa). Narxlar faqat butun son so'm.
Qabul mezonlari: narx va muddatni kod o'zgartirmasdan admin paneldan o'zgartirish mumkin; fanli ruxsat berilganda foydalanuvchi faqat shu fanning testlarini ochadi (Vercel preview'da tekshirish); CLAUDE.md tekshiruvlari toza.
Git'da untracked fayllar bor — git add -A emas, faqat o'zgargan fayllarni nomma-nom qo'shing.
```

---

## O3 — Telegram bot to'lov oqimi va admin tasdiqlash

```
Vazifa: obunani sotib olish oqimini yangi mahsulotlarga o'tkazish. O1 va O2 merge qilingan.

Branch: feat/bot-category-checkout

1) Avval mavjud oqimni o'rganing: api/telegram/payments, api/telegram/webhook (tarif tanlash, chek rasmi), api/admin/payments (tasdiqlash, durationMap), test-purchase. Qisqa reja yozing.
2) Yangi oqim: Mahsulot (faqat isOnSale) → fan (faqat shu kategoriyada nashr etilgan testi bor fanlar ko'rsatiladi; ONE: bitta; DTM_BLOCK: 2 ta asosiy, majburiylar avtomatik ko'rsatiladi; NONE/BUNDLE: so'ralmaydi) → muddat varianti (faol ProductOffer) → yakuniy narx → chek → admin tasdiqlaydi.
3) Narx: offer.price; foydalanuvchida shu mahsulot bo'yicha faol obuna bo'lsa (boshqa fan) — secondSubjectDiscountPct qo'llanadi. Bir xil fanga ikkinchi marta sotib olinsa — chegirmasiz, va yangi obuna oldingisining endDate'idan boshlanadi (uzaytirish). Narx hisoblash sof funksiya + testlar.
4) Payment ga kerak bo'lsa additive ustunlar: productId, offerId, subjectIds String[] (eski selectedSubjects ga YOZMANG). Migratsiya CLAUDE.md tartibida.
5) Admin tasdiqlash: Subscription yaratadi — plan CATEGORY/BUNDLE, duration CUSTOM, productId, offerId, categoryId, subjectIds (O2 dagi buildSubjectIds), endDate (computeEndDate). Admin to'lov sahifasida mahsulot, fan(lar) va variant ko'rinadi.
6) Eski PREMIUM/TEACHER_PLAN tariflari botda endi taklif qilinmaydi, lekin oldin boshlangan (PENDING) eski to'lovlar avvalgidek tasdiqlanadi.
7) Bitta test/kurs xaridi oqimiga tegmang.

Qabul mezonlari: botda attestatsiya obunasi fan tanlab sotib olinadi va tasdiqlangach faqat o'sha fan ochiladi; ikkinchi fan chegirma bilan; DTM blokida 5 ta fan ochiladi; eski PENDING to'lovlar buzilmagan; route testlari yashil; CLAUDE.md tekshiruvlari toza.
Git'da untracked fayllar bor — git add -A emas, faqat o'zgargan fayllarni nomma-nom qo'shing.
```

---

## O4 — /pricing sahifasi

```
Vazifa: /pricing sahifasini yangi mahsulotlarga o'tkazish. O1–O3 merge qilingan. Avval docs/design/testlar-ui.md ni o'qing.

Branch: feat/pricing-categories

- Ma'lumot: server'da Product (isOnSale) + faol ProductOffer; SystemSetting'dagi premium_price_*/teacher_price_* va PricingClient'dagi qattiq zaxira narxlar endi ishlatilmaydi (o'chiring, grep bilan tekshirib).
- Tuzilma: yuqorida maqsad bo'yicha tanlov (Attestatsiya, Milliy sertifikat, DTM, Maktab, Prezident maktabi, SAT, GRE) — /tests dagi GOAL_STYLES ranglari; tanlangan mahsulot kartasi: nima ochiladi (fan qoidasi tushuntirishi: "bitta fan", "2 asosiy + 3 majburiy fan", "butun kategoriya"), 2 ta variant narxi bilan, "Sotib olish" → Telegram bot (mavjud havola usuli, mahsulot va variant parametri bilan). Pastda "Hammasi" paketi — langar sifatida. Ikkinchi fan chegirmasi matnda ko'rsatiladi.
- URL holati: ?goal=ATTESTATION; /attestation va attestatsiya banneridan kelganda attestatsiya tanlangan bo'lib ochiladi.
- Kirgan foydalanuvchida faol obunalari ko'rinadi ("Fizika — 2026-11-25 gacha").
- /pricing ni mehmon uchun ochish (S15 dagi protected-paths ro'yxati).
- Metadata uchala tilda. Matnlar pricing.* uz/ru/en.

Qabul mezonlari: narx admin paneldan o'zgarsa sahifada darhol o'zgaradi; sotuvda bo'lmagan mahsulot ko'rinmaydi; 360px da gorizontal aylanish yo'q; CLAUDE.md tekshiruvlari toza.
Git'da untracked fayllar bor — git add -A emas, faqat o'zgargan fayllarni nomma-nom qo'shing.
```

---

## O5 — Funksiyalarni obuna doirasiga bog'lash

**2026-10-24 yangilanish:** O1–O4 merge qilingan. O5 ikkiga bo'lindi:
O5a — `feat/entitlement-scope` (kirish, kvota, disciplineKey migratsiyasi);
O5b — `feat/entitlement-ui` (O5a merge bo'lgach alohida reja).
Quyidagi dastlabki promptning aniqlashtirilgan qamrovi va audit jadvallari:
[O5a tasdiqlangan reja](entitlement-scope-reja.md).

```
Vazifa: hasActiveSubscription ga tayangan funksiyalarni yangi obuna modeliga o'tkazish — har qanday faol obuna funksiyalarni o'z kategoriyasi va fanlari doirasida ochadi. O1–O4 merge qilingan.

Branch: feat/entitlement-features

1) Avval ro'yxat tuzing (grep hasActiveSubscription, 'PREMIUM', TEACHER_PLAN): quota.ts, results/[id] (resolveSolutionTiers), ai-explain, practice-answer-check, student/mastery-map, dtm-online/start, subscription/status, cron/subscription-alerts, referral/check-reward, Sidebar, SubscriptionExpiryBanner, admin sahifalari, checkCourseAccess. Har biri uchun qoida taklifi bilan jadvalni PR'ga yozing.
2) Qoidalar (standart):
- Kunlik limitlar (quota.ts): biror faol obuna (eski yoki yangi) bo'lsa — cheklovsiz, lekin faqat obuna doirasidagi kontentda; doiradan tashqarida bepul limitlar. Agar doira bo'yicha ajratish so'rov kontekstida mumkin bo'lmasa (masalan, test tuzish fanni bilmasa) — PR'da yozing va oddiy "faol obuna bormi" qoidasida qoldiring.
- DTM Online: DTM obunasi yoki BUNDLE (fanlar — subjectIds); eski PREMIUM avvalgidek.
- Bilim xaritasi: obuna doirasidagi fanlar bo'yicha.
- Yozma/video yechim (resolveSolutionTiers) va AI tushuntirish: test shu foydalanuvchining obuna doirasida bo'lsa ochiq.
- Kurslar (checkCourseAccess): kurs subjectId/kategoriyasi obuna doirasida bo'lsa — premium/teacher/premium_teacher kurslar ochiq; paid kurs faqat xarid yoki BUNDLE.
- subscription/status, banner, Sidebar, cron eslatmalari: yangi obunalarni ham ko'rsatadi (mahsulot nomi + fan + muddat).
3) Barcha qoidalar bitta sof modul orqali (masalan src/lib/entitlements.ts) — har joy o'zi hisoblamasin. Har qoida uchun testlar; eski PREMIUM/TEACHER_PLAN uchun xatti-harakat o'zgarmaganini isbotlovchi testlar.

Qabul mezonlari: attestatsiya-fizika obunachisi fizika attestatsiyasida cheklovsiz, DTM testlarida bepul limitlarda; eski obunachilarda hech narsa o'zgarmagan; CLAUDE.md tekshiruvlari toza.
Git'da untracked fayllar bor — git add -A emas, faqat o'zgargan fayllarni nomma-nom qo'shing.
```

---

## Eslatmalar

- **1-bosqich sotuvi (2026-10-23 kelishuvi):** O1–O5 tugagach faqat "Attestatsiya" mahsuloti "Sotuvda" yoqiladi (fan tanlovida hozircha faqat Fizika chiqadi). "Hammasi" paketi va boshqa kategoriyalar kontent tayyor bo'lgunicha o'chiq. Milliy sertifikat — Fizika ni yoqish nashr etilgan testlar soniga qarab alohida hal qilinadi. Bepul testlar hamma kategoriyada voronka sifatida ochiq qoladi.

- Ishga tushirishdan oldin (O3 dan keyin) Neon'da: Product/ProductOffer INSERT (O1 PR'idagi namuna), DTM majburiy fanlari, narxlar admin paneldan. Faqat kontenti tayyor mahsulotlarni "Sotuvda" qiling.
- Faol eski obunachilar sonini bilish uchun (Neon, faqat SELECT): `SELECT plan, COUNT(*) FROM "Subscription" WHERE "isActive" AND "endDate" >= now() GROUP BY plan;`
- Prod'dagi 4 ta sinov UserPermission qatori (2026-10-22, bitta foydalanuvchi) O1 dan keyin haqiqatan kirish beradi — kerak bo'lmasa admin paneldan bekor qiling.
- Har PR'ni Vercel preview'da tekshiring: obunasiz, eski Premium, attestatsiya-fizika obunachisi, DTM blok obunachisi va admin akkaunti bilan.
