# EduPrime.uz — Claude Code uchun loyiha konteksti

Bu fayl har sessiyada avtomatik o'qiladi. Har bir vazifa promptida takrorlanmasin.

## Stack

- **Framework:** Next.js 15 (App Router) + TypeScript + Tailwind CSS 4
- **ORM:** Prisma 6 → PostgreSQL
- **Auth:** NextAuth v5 (Telegram Bot + Google OAuth)
- **i18n:** next-intl — `uz` (asosiy), `ru`, `en`
- **AI:** Google Gemini
- **Matematik matn:** KaTeX (`LatexRenderer`, `LatexToolbar`)
- **Sudrash:** `@dnd-kit` (o'rnatilgan)
- **Media:** Cloudinary, UploadThing

## Muhit — DIQQAT

| | Joyi | Eslatma |
|---|---|---|
| Deploy | **Vercel** | `main` ga merge → avtomatik prod deploy |
| Ma'lumotlar bazasi | **Neon.tech (PostgreSQL)** | Bu **PRODUCTION** baza. Real foydalanuvchi ma'lumotlari bor. |
| Bot | Telegram (`@EduPrimeuzbot`) | `bot/` papkasi, alohida deploy |
| Cron | `vercel.json` → `/api/cron/*` | `CRON_SECRET` bilan himoyalangan |

## Ma'lumotlar bazasi qoidalari — QAT'IY

**Muhim kontekst:** ishlab chiquvchining tarmog'i 5432-portni bloklaydi, shuning uchun **lokal bazaga ulanish yo'q va bo'lmaydi**. Migratsiyalar ulanishsiz yoziladi, CI'da tekshiriladi, prod'ga GitHub Actions orqali qo'llanadi. Bu vaqtinchalik chetlanish emas — loyihaning doimiy ish tartibi.

1. **`prisma db push` ni hech qachon ishlatmang.** U ustun/jadvalni ogohlantirishsiz o'chiradi.
2. **`prisma migrate dev` ni ham ishlatmang** — u bazaga ulanishni talab qiladi.
3. **Migratsiya shunday yoziladi (ulanishsiz):**
   ```bash
   # 1. Sxemaning oldingi holatini git'dan oling
   git show HEAD:prisma/schema.prisma > prisma/_prev.prisma

   # 2. prisma/schema.prisma ni tahrirlang

   # 3. Farqdan SQL hosil qiling
   npx prisma migrate diff \
     --from-schema-datamodel prisma/_prev.prisma \
     --to-schema-datamodel prisma/schema.prisma \
     --script > prisma/migrations/<YYYYMMDDHHMMSS>_<nom>/migration.sql

   # 4. Vaqtinchalik faylni o'chiring
   rm prisma/_prev.prisma
   ```
   Papka nomi `20260824143000_add_indexes` shaklida — sana Prisma tartibini belgilaydi.
4. **Hosil qilingan SQL'ni doim o'qib chiqing.** `DROP TABLE`, `DROP COLUMN`, `ALTER COLUMN ... SET NOT NULL` bo'lmasligi kerak — bular ma'lumot yo'qotadi. Faqat `CREATE` va nullable ustun qo'shish.
5. Migratsiyalar **additive** bo'lsin: yangi jadval, yangi ustun (nullable yoki default bilan), yangi indeks. Ustun o'chirish — alohida, ataylab rejalashtirilgan PR'da va faqat kod undan foydalanishni to'xtatgach.
6. **Migratsiya zanjiri CI'da tekshiriladi** — `.github/workflows/ci.yml` toza Postgres konteynerida `prisma migrate deploy` ni ishga tushiradi. PR yashil bo'lmasa migratsiya noto'g'ri.
7. **Prod'ga qo'llash — hozircha qo'lda, Neon SQL Editor orqali.** GitHub runner'lari Neon'ga 5432 orqali ulanolmaydi (sabab aniqlanmoqda), shuning uchun `db-deploy.yml` avtomatik ishlamaydi. Har migratsiya uchun `npm run db:manual -- <papka-nomi>` bilan yagona qo'yiladigan SQL fayl hosil qilinadi va u Neon SQL Editor'ga tashlanadi. Loyiha egasi bajaradi, siz emas. Ulanish tiklangach `db-deploy.yml` hech qanday o'zgarishsiz ishlay boshlaydi.
8. **Lokal terminaldan prod'ga hech qachon hech narsa qo'llamang.**
9. **`.env` faylini o'qimang** va uning mazmunini chiqarmang.
10. Test yoki seed ma'lumotini prod bazaga yozmang.
11. **Baseline.** `0_init` migratsiyasi prod bazada `migrate resolve --applied` bilan belgilangan. Uni hech qachon qayta yozmang yoki o'chirmang.
12. `prisma migrate reset` — hech qachon.

## Git ish tartibi

Har sessiya = bitta branch = bitta PR. Foydalanuvchi merge qiladi, siz emas.

```
git checkout main && git pull
git checkout -b <tur>/<qisqa-nom>
# ... ish ...
git add -A && git commit -m "..."
git push -u origin <branch>
gh pr create --title "..." --body "..."
```

Branch prefikslari: `fix/`, `feat/`, `chore/`, `refactor/`, `test/`, `db/`

Commit sarlavhasi — imperativ, 72 belgidan qisqa, o'zbekcha yoki inglizcha (izchil bo'lsin).

**PR tavsifi shu tuzilishda bo'lsin:**

```markdown
## Nima o'zgardi
<2-4 punkt>

## Nima uchun
<1-2 jumla>

## Migratsiya
<yo'q | migratsiya nomi va u nima qiladi>

## Tekshirish
- [ ] `npx tsc --noEmit` toza
- [ ] `npm run lint` toza
- [ ] `npm run build` muvaffaqiyatli
- [ ] `npm test` o'tdi
- [ ] Qo'lda tekshirildi: <nima>

## Xavf
<nima buzilishi mumkin va nima uchun buzilmaydi>
```

## Har sessiya oxirida majburiy tekshiruv

Quyidagilarning hammasi o'tmaguncha PR yaratmang:

```bash
npx tsc --noEmit
npm run lint
npm test            # Vitest o'rnatilgach
npx prisma generate && npx next build
```

Bazaga ulanadigan hech qanday buyruqni ishlatmang — ular yiqiladi va bu kutilgan holat.

Biror biri xato bersa — tuzating. "Bu mening o'zgarishimdan emas" deb o'tkazib yubormang; xato bo'lsa PR tayyor emas.

## Kod uslubi

- Izohlar **o'zbek tilida**, kod identifikatorlari inglizcha — mavjud kod shunday, buzilmasin.
- Izoh *nima* qilayotganini emas, **nima uchun** shunday qilinganini tushuntirsin. Mavjud kodda yaxshi namunalar bor (`lib/dtm-online.ts`, `lib/course-lock.ts`).
- Yangi kodda **`any` ishlatmang.** Prisma so'rovlari uchun `Prisma.XxxWhereInput` turlaridan foydalaning. Eski `any` larni yo'l-yo'lakay tuzatmang — bu alohida PR.
- Foydalanuvchiga ko'rinadigan matn `src/messages/{uz,ru,en}.json` da. Yangi matn qo'shsangiz, uchala faylga ham qo'shing.
- Yangi UI komponentlari **mobil-birinchi**: auditoriyaning 80%+ i telefonda, asosan Android. Tegish maydoni ≥ 44px. Sahifa gorizontal aylanmasin.
- Formula va kod bloklari o'z `overflow-x: auto` konteynerida bo'lsin.

## Qamrov intizomi — MUHIM

Faqat promptda aytilgan ishni qiling.

- Yo'l-yo'lakay refaktoring qilmang.
- Bog'liq bo'lmagan xatoni ko'rsangiz — tuzatmang, PR tavsifining oxirida "Yo'l-yo'lakay ko'rilgan" bo'limida yozib qo'ying.
- Yangi bog'liqlik (dependency) qo'shish kerak bo'lsa, avval promptda ruxsat berilganini tekshiring. Berilmagan bo'lsa — mavjud kutubxonalar bilan yeching yoki PR'da so'rang.
- Fayl 400 satrdan oshsa yangi fayl oching, lekin mavjud katta fayllarni bo'lish — alohida PR.

## Loyiha xaritasi

```
src/
  app/[locale]/(main)/      # foydalanuvchi sahifalari — tests, courses, results, dashboard
  app/[locale]/(teacher)/   # ustoz paneli — tests, courses, question-bank
  app/[locale]/(admin)/     # admin paneli
  app/api/                  # 71 ta route
  components/test/          # QuestionDisplay, QuestionNav, TestTimer
  components/teacher/       # CourseCurriculumEditor, QuestionEditorForm, LessonBlocksEditor
  components/ui/            # LatexRenderer, SecureYouTubePlayer, FillBlankEditor, MatchingEditor
  lib/
    access.ts               # paywall — checkTestAccess, checkCourseAccess
    api-auth.ts             # requireAuth, requireTeacher
    dtm-online.ts           # DTM imtihoni generatori — bo'lajak konstruktorning prototipi
    mastery.ts              # bilim xaritasi
    shuffle.ts              # Fisher-Yates — TO'G'RI realizatsiya, shuni ishlating
    course-lock.ts          # ketma-ket ochish mantig'i
    paramgen/               # parametrik savol generatori + templates.json
    gemini.ts               # AI import va tushuntirish
prisma/schema.prisma
bot/index.ts                # Telegram bot
```

## Nozik joylar — ehtiyot bo'ling

- **Baholash va aralashtirish.** `app/api/tests/[id]/submit/route.ts` shuffle tartibini qaytadan hisoblaydi va u `GET /api/tests/[id]` dagi mantiq bilan **aynan** mos kelishi shart. Biri o'zgarsa, imtihonlar jimgina noto'g'ri baholanadi. Bu ikkisiga tegsangiz — testsiz tegmang.
- **Paywall.** Savol matni, variantlari va to'g'ri javobi — pullik mahsulot. Ularni ochib beradigan har bir joy (`GET`, `submit`, AI tushuntirish) `lib/access.ts` orqali tekshirilsin.
- **Sana va vaqt.** Foydalanuvchilar **Asia/Tashkent (UTC+5)** da. Kunlik hisob-kitoblarda `new Date().toISOString()` (UTC) ishlatmang — soat 05:00 gacha "kechagi kun" ga yozadi.
- **`MATCHING` va `FILL_BLANK`** savollarining javob formati odatiy emas (`lib/matching.ts`, `lib/fill-blank.ts`). Ularga tegmasdan oldin shu fayllarni o'qing.

## Nima qilmaslik kerak

- `.env` yoki maxfiy qiymatlarni o'qish, chiqarish, commit qilish.
- `main` branchga to'g'ridan-to'g'ri commit qilish.
- PR ni o'zingiz merge qilish.
- Prod bazaga migratsiya yoki seed qo'llash.
- `prisma migrate reset` — hech qachon.
