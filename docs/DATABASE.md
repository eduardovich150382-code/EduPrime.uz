# Ma'lumotlar bazasi — migratsiya quvuri

Bu loyihada `prisma db push` ishlatilmaydi. Barcha sxema o'zgarishlari
`prisma/migrations/` papkasidagi versiyalangan SQL fayllar orqali qo'llanadi
va git tarixida saqlanadi.

## Fon: nega bu kerak

Ilgari sxema `prisma db push` bilan to'g'ridan-to'g'ri bazaga surilgan —
bu buyruq ustun yoki jadvalni ogohlantirishsiz o'chirib yuborishi mumkin va
qaysi o'zgarish qachon qo'llanganini kuzatib bo'lmaydi. Prod bazamiz
(Neon.tech) da real foydalanuvchi ma'lumotlari bo'lgani uchun bu xavfli
holat edi. Endi har bir sxema o'zgarishi migratsiya fayli sifatida yoziladi,
kod bilan birga review qilinadi va deploy vaqtida avtomatik qo'llanadi.

## Bir martalik baseline qadami — MUHIM

`prisma/migrations/0_init/` — bu mavjud sxemaning "hozirgi holat" suratini
oladigan **baseline** migratsiya. U mavjud jadval/ustunlarni **qayta
yaratishga urinmaydi** — u faqat sxema tarixini boshlash uchun kerak.

Prod baza (Neon) allaqachon shu sxemada, shuning uchun bu migratsiyani
oddiy `migrate deploy` orqali qo'llash mumkin emas (jadvallar "allaqachon
mavjud" xatosini beradi). Buning o'rniga, bazaga **hech narsa yozmasdan**,
Prisma'ga "bu migratsiya allaqachon qo'llangan deb hisobla" deb aytamiz:

```bash
npx prisma migrate resolve --applied 0_init
```

**Bu buyruq faqat bir marta, prod bazaga qarshi ishlatiladi** (masalan,
Vercel muhit o'zgaruvchilari bilan lokal terminaldan yoki bitta xavfsiz
sessiyada). U bazadagi `_prisma_migrations` jadvaliga yozuv qo'shadi, boshqa
hech narsani o'zgartirmaydi. Shundan keyingina deploy quvuridagi
`prisma migrate deploy` ishlay boshlaydi (chunki u endi 0_init dan keyingi
migratsiyalarnigina qidiradi).

Bu qadamni loyiha egasi yoki vakolatli DevOps shaxsi bajarishi kerak —
Claude Code sessiyalari buni **hech qachon** o'zi bajarmaydi (quyidagi
"Xavfsizlik qoidalari" bo'limiga qarang).

## Lokal ish tartibi (development)

Sxemaga o'zgartirish kiritganda:

```bash
# prisma/schema.prisma ni tahrirlang, keyin:
npx prisma migrate dev --name <qisqa-nom>
```

Bu buyruq:
1. Yangi migratsiya faylini `prisma/migrations/<timestamp>_<nom>/` ga yozadi
2. Uni lokal/dev bazangizga qo'llaydi
3. Prisma Client'ni qayta generatsiya qiladi

Yaratilgan migratsiya faylini **har doim commit qiling** — u kod review'ning
bir qismi.

`npm run db:generate` — faqat Prisma Client generatsiya qilish uchun
(sxema yoki migratsiyaga tegmaydi).

## Prod — avtomatik deploy

`package.json` dagi `build` skripti endi shunday:

```json
"build": "prisma generate && prisma migrate deploy && next build"
```

`prisma migrate deploy` faqat **hali qo'llanmagan** migratsiyalarni tartib
bilan qo'llaydi — u interaktiv emas va sxemani migratsiya fayllari bilan
solishtirmaydi (drift tekshirmaydi), shuning uchun CI/CD muhitida xavfsiz.

Amaliyot: `main` ga merge → Vercel avtomatik build boshlaydi → build
ichida `migrate deploy` prod bazaga yangi migratsiyalarni qo'llaydi →
`next build` ishga tushadi.

## ⚠️ Ogohlantirish: Vercel Preview muhiti

Vercel'da har bir Pull Request uchun alohida **Preview deployment**
yaratiladi, va u ham xuddi shu `build` skriptini (`prisma migrate deploy`
bilan) ishga tushiradi.

**Agar Preview muhiti uchun alohida `DATABASE_URL` sozlanmagan bo'lsa,
u environment o'zgaruvchilarini Production muhitidan meros oladi — demak
har bir PR uchun ochilgan preview deploy prod bazaga migratsiya
qo'llaydi.** Bu, ayniqsa, hali review qilinmagan yoki noto'g'ri
migratsiya bilan xavfli.

### Buni qanday oldini olish kerak

1. **Neon.tech'da** — loyiha uchun alohida branch (masalan, `preview`)
   yarating: Neon Console → Branches → "New Branch" → asosiy (prod)
   branch'dan. Neon branch'lari copy-on-write bo'lib, prod ma'lumotini
   nusxalaydi, lekin undan mustaqil ishlaydi.
2. **Vercel'da** — loyiha Settings → Environment Variables bo'limida
   `DATABASE_URL` uchun alohida qiymat qo'shing va uni faqat **Preview**
   muhitiga biriktiring (Production'dan farqli qiymat, Neon preview
   branch'ining connection string'i bilan).
3. Shundan so'ng har bir PR preview deploy'i o'z alohida Neon branch'iga
   migratsiya qo'llaydi — prod bazaga tegmaydi.

Bu sozlash hali qilinmagan bo'lsa, Preview deploylar prod bazaga
`migrate deploy` ishlatishda davom etadi — bu holatda hech bo'lmaganda
migratsiyalar faqat **additive** (pastga qarang) bo'lishiga alohida
e'tibor bering, chunki ular preview'da ham, prod'da ham qo'llanadi.

## Additive-only qoidasi

- Yangi jadval, yangi ustun (**nullable yoki default bilan**), yangi
  indeks — xavfsiz, `migrate dev` bilan avtomatik yaratiladi.
- Ustun yoki jadvalni **o'chirish yoki nomini o'zgartirish** — alohida,
  ataylab rejalashtirilgan PR'da qilinsin, va faqat kod undan
  foydalanishni butunlay to'xtatgandan keyin. Bunday migratsiyani PR
  tavsifida aniq belgilang va merge qilishdan oldin ikkinchi ko'z bilan
  tekshirtiring.
- Mavjud ustunni **NOT NULL** qilish — avval default qiymat bilan
  qo'shing, mavjud qatorlarni to'ldiring, keyin alohida migratsiyada
  NOT NULL cheklovini qo'ying.

## Rollback

Prisma Migrate avtomatik "down" migratsiya yaratmaydi. Muammo yuzaga
kelsa:

1. **Kod darajasida** — Vercel'da oldingi muvaffaqiyatli deploy'ga
   "Instant Rollback" qiling. Bu faqat kodni qaytaradi, bazani emas.
2. **Baza darajasida** — agar migratsiya bazani buzgan bo'lsa, muammoni
   tuzatuvchi **yangi** migratsiya yozing (masalan, xato ustunni qayta
   qo'shish yoki noto'g'ri constraint'ni olib tashlash). Eski
   migratsiya faylini o'zgartirmang yoki o'chirmang — u allaqachon
   qo'llangan bo'lishi mumkin, va tarixni o'zgartirish `migrate deploy`
   ni buzadi.
3. Neon.tech **Point-in-time restore** imkoniyatini beradi — jiddiy
   ma'lumot yo'qotilganda oxirgi chora sifatida shundan foydalaning.

## Xavfsizlik qoidalari (Claude Code sessiyalari uchun)

- `prisma migrate dev` yoki `prisma migrate resolve` kabi bazaga
  yozadigan buyruqlarni **hech qachon** lokal terminaldan prod
  `DATABASE_URL` bilan ishlatmang.
- Yangi migratsiya fayli yaratish — bu faqat fayl yozish, bazaga
  tegmaydi (`prisma migrate diff ... --script > ...`). Bunga ruxsat bor.
- Migratsiyani bazaga qo'llash — faqat deploy quvuri (Vercel build)
  yoki loyiha egasining o'zi orqali amalga oshiriladi.
