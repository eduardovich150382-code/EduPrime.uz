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

1. **`prisma db push` NI HECH QACHON ISHLATMANG.** U ustun/jadvalni ogohlantirishsiz o'chiradi. Loyihada avval shu ishlatilgan — bu tuzatilishi kerak bo'lgan xato, takrorlanadigan naqsh emas.
2. Har sxema o'zgarishi **`prisma migrate dev --name <qisqa-nom>`** orqali migratsiya fayli sifatida yozilsin va git'ga commit qilinsin.
3. Migratsiyalar **additive** bo'lsin: yangi jadval, yangi ustun (nullable yoki default bilan), yangi indeks. Ustun o'chirish yoki nomini o'zgartirish — alohida, ataylab rejalashtirilgan PR'da va faqat kod undan foydalanishni to'xtatgach.
4. Prod bazaga **hech qachon lokal terminaldan migratsiya qo'llamang.** Migratsiya `main` ga merge bo'lgach deploy quvuri orqali qo'llanadi.
5. Test yoki seed ma'lumotini prod bazaga yozmang.
6. `.env` faylini o'qimang va uning mazmunini chiqarmang.

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
npm run build
npm test            # Vitest o'rnatilgach
```

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
