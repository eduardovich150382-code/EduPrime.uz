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
kod bilan birga review qilinadi va alohida workflow orqali qo'llanadi.

## Lokal baza yo'q — MUHIM cheklov

Ishlab chiquvchining tarmog'i 5432-portni bloklaydi. Shu sababli **lokal
terminaldan hech qanday Postgre'ga (na prod, na dev, na CI konteyneriga)
ulanish yo'q va bo'lmaydi** — `prisma migrate dev`, `prisma migrate deploy`,
`prisma migrate resolve`, `prisma studio`, `prisma db push` kabi bazaga
ulanadigan har qanday buyruq lokalda ishga tushirilmaydi va ishlamaydi.

Oqibati — butun migratsiya quvuri shu cheklovga moslashtirilgan:

- Migratsiya fayllari bazaga ulanmasdan, sof matn ko'rinishida,
  `prisma migrate diff --from-schema-datamodel ... --to-schema-datamodel ...`
  orqali **qo'lda** yaratiladi (pastga qarang).
- Migratsiya zanjirining bo'sh bazaga muammosiz qo'llanishini GitHub Actions
  ichidagi vaqtinchalik `postgres:16` konteyneri tekshiradi (`ci.yml`,
  `migration-check` job'i) — bu lokal ulanishga muhtoj emas, chunki konteyner
  runner ichida yashaydi.
- Prod bazaga migratsiya qo'llash — GitHub Actions'dagi `db-deploy.yml`
  orqali, `secrets.DATABASE_URL` bilan. Bu — `DATABASE_URL` haqiqiy bazaga
  ulanadigan yagona *avtomatlashtirilgan* joy. **Hozircha bu workflow
  ishlamaydi** (pastga, "Hozircha: qo'lda qo'llash" bo'limiga qarang) —
  GitHub runner'lari Neon'ga 5432 orqali ulanolmaydi, sababi aniqlanmoqda.
  Shu bois migratsiya prod'ga vaqtincha Neon SQL Editor orqali, qo'lda
  qo'llanadi.
- `npm run build` endi bazaga umuman ulanmaydi (`prisma generate && next
  build`) — shuning uchun lokalda va Vercel'da xavfsiz ishlaydi, migratsiya
  bilan bog'liq emas.

Amaliy natija: **Claude Code sessiyalari (va lokal ishlaydigan har qanday
ishlab chiquvchi) hech qachon bazaga ulanadigan buyruq ishlatmaydi.**
Migratsiya fayli yozish — matn fayli yaratish, xolos.

## Migratsiya yozish tartibi

Sxemaga o'zgartirish kiritish kerak bo'lganda (lokal `migrate dev` ishlamagani
uchun):

```bash
# 1. Joriy sxemaning nusxasini oling (git tarixidan, HEAD holatida)
git show HEAD:prisma/schema.prisma > prisma/_prev.prisma

# 2. prisma/schema.prisma faylini kerakli o'zgarishlar bilan tahrirlang

# 3. Ikki sxema orasidagi farqdan SQL migratsiya generatsiya qiling
#    (bu buyruq hech qanday bazaga ulanmaydi — faqat ikki .prisma faylini solishtiradi)
npx prisma migrate diff \
  --from-schema-datamodel prisma/_prev.prisma \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/<timestamp>_<nom>/migration.sql

# 4. Vaqtinchalik faylni tozalang
rm prisma/_prev.prisma
```

`<timestamp>` — `YYYYMMDDHHMMSS` formatida (masalan, `20260825120000`),
`<nom>` — qisqa, kichik harflarda, pastki chiziq bilan (masalan,
`add_course_rating`). Papka nomi Prisma'ning o'z migratsiyalari bilan bir xil
naqshda bo'lishi shart, aks holda `migrate deploy` uni tartib bilan
qo'llamasligi mumkin.

### Majburiy: generatsiya qilingan SQL'ni o'qib chiqing

`migrate diff` sxemadagi har qanday farqni SQL'ga aylantiradi — jumladan
ustun yoki jadval o'chirishni ham, agar shunday farq bo'lsa. Fayl yozilgach,
**uni albatta o'qing** va tasdiqlang:

- Faylda `DROP TABLE`, `DROP COLUMN` yoki `DROP` bilan boshlanadigan boshqa
  buyruq **yo'qligini** tekshiring — bunday o'zgarish CLAUDE.md dagi
  "additive" qoidasiga ziddir va alohida, ataylab rejalashtirilgan PR talab
  qiladi.
- Yangi ustun **nullable** yoki **default qiymat bilan** ekanligini
  tekshiring — aks holda mavjud qatorlar uchun `migrate deploy` xato beradi.
- SQL loyihaning boshqa migratsiyalari bilan uslub jihatidan mos kelishini
  ko'zdan kechiring.

Shubha bo'lsa — migratsiyani commit qilmasdan, foydalanuvchidan tasdiq
so'rang.

## CI: migratsiya zanjiri bo'sh bazada tekshiriladi

Har bir PR uchun `ci.yml` ichidagi `migration-check` job'i GitHub Actions
runner'ida vaqtinchalik `postgres:16` konteyner ishga tushiradi va unga
qarshi `npx prisma migrate deploy` bajaradi. Bu `0_init` dan boshlab butun
migratsiya zanjirining bo'sh bazaga xatosiz qo'llanishini isbotlaydi —
prod yoki dev bazaga hech qanday aloqasi yo'q, konteyner PR tugagach
yo'q qilinadi.

## Bir martalik baseline — `db-baseline.yml`

`prisma/migrations/0_init/` — mavjud sxemaning "hozirgi holat" suratini
oladigan **baseline** migratsiya. U mavjud jadval/ustunlarni **qayta
yaratishga urinmaydi** — u faqat sxema tarixini boshlash uchun kerak.

Prod baza (Neon) allaqachon shu sxemada, shuning uchun bu migratsiyani
oddiy `migrate deploy` orqali qo'llash mumkin emas — jadvallar "allaqachon
mavjud" xatosini beradi (pastga, **P3005** bo'limiga qarang). Buning
o'rniga, bazaga **hech narsa yozmasdan**, Prisma'ga "bu migratsiya
allaqachon qo'llangan deb hisobla" deb aytish kerak.

Bu — `.github/workflows/db-baseline.yml` workflow'ining vazifasi:

- Ishga tushirish turi: `workflow_dispatch` — ya'ni GitHub'da qo'lda,
  **Actions → DB Baseline (bir martalik) → Run workflow** orqali chaqiriladi.
  Push yoki PR bilan avtomatik ishga tushmaydi.
- Ichida `npx prisma migrate resolve --applied 0_init` bajaradi — bu
  bazadagi `_prisma_migrations` jadvaliga yozuv qo'shadi, boshqa hech
  narsani o'zgartirmaydi.
- Faqat **bir marta**, loyiha egasi tomonidan ishga tushirilishi kerak.
  Claude Code sessiyalari buni **hech qachon** o'zi ishga tushirmaydi va
  ishga tushirishni taklif qilmaydi.

### `DATABASE_URL` ni GitHub secret sifatida sozlash

Baseline va deploy workflow'lari `secrets.DATABASE_URL` dan foydalanadi.
Buni bir marta sozlash kerak:

1. GitHub'da: repo → **Settings → Secrets and variables → Actions → New
   repository secret**.
2. Nomi: `DATABASE_URL`, qiymati — Neon.tech prod bazasining connection
   string'i (Vercel muhit o'zgaruvchilaridagi qiymat bilan bir xil).
3. Bu qiymatni faqat repo egasi yoki vakolatli DevOps shaxsi kiritadi —
   Claude Code sessiyalari `.env` yoki maxfiy qiymatlarni o'qimaydi va
   bu qadamni bajara olmaydi.

Secret sozlangach, avval `db-baseline.yml` bir marta qo'lda ishga
tushiriladi, so'ngra `db-deploy.yml` keyingi migratsiyalarni avtomatik
qo'llay boshlaydi.

## Prod deploy — `db-deploy.yml`

`main` branchga `prisma/migrations/**` ichida o'zgarish bo'lgan push
kelganda avtomatik ishga tushadi va `npx prisma migrate deploy` orqali
hali qo'llanmagan migratsiyalarni prod bazaga qo'llaydi.

`prisma migrate deploy` faqat **hali qo'llanmagan** migratsiyalarni tartib
bilan qo'llaydi — u interaktiv emas va sxemani migratsiya fayllari bilan
solishtirmaydi (drift tekshirmaydi), shuning uchun CI/CD muhitida xavfsiz.

Amaliyot: PR `main`ga merge qilinadi → agar migratsiya fayllari o'zgargan
bo'lsa, `db-deploy.yml` ishga tushadi va prod bazaga yangi migratsiyalarni
qo'llaydi → mustaqil ravishda Vercel ham `main`dagi kodni deploy qiladi
(`npm run build` — endi faqat `prisma generate && next build`, bazaga
tegmaydi).

`concurrency` guruhi (`db-deploy`) bir vaqtda bir nechta deploy ishga
tushishining oldini oladi.

**Hozirgi holat:** bu workflow prod'da ishlamayapti — GitHub Actions
runner'lari Neon'ga 5432-port orqali ulanolmay, `P1001` xatosi bilan
yiqiladi (sababi aniqlanmoqda). Vercel va Neon'ning o'z SQL Editor'i esa
Neon'ga muammosiz ulanadi, shuning uchun migratsiya hozircha pastdagi
qo'lda tartib orqali qo'llanadi. **Workflow faylining o'zi
o'zgartirilmagan va o'chirilmagan** — ulanish muammosi tuzatilgan zahoti,
hech qanday qo'shimcha o'zgarishsiz yana avtomatik ishlay boshlaydi.

## Hozircha: qo'lda qo'llash — `npm run db:manual`

Ulanish muammosi tuzatilguncha, har bir yangi migratsiya `main`ga
qo'shilgach, loyiha egasi uni Neon SQL Editor orqali qo'lda qo'llaydi.
Buni xatosiz va takrorlanadigan qilish uchun `scripts/make-manual-migration.ts`
yordamchi skripti bor — u migratsiyani Neon SQL Editor'ga to'g'ridan-to'g'ri
nusxa-qo'yiladigan bitta tayyor SQL faylga aylantiradi.

**Nega qo'lda yozib bo'lmaydi:** Neon SQL Editor orqali qo'llangan SQL
Prisma'ning hisobida "qo'llangan" deb ko'rinmaydi — `_prisma_migrations`
jadvaliga yozuv qo'shish kerak, aks holda keyingi `prisma migrate deploy`
(ulanish tiklangach) shu migratsiyani yana qo'llashga urinadi. Bu yozuvning
`checksum` ustuni migratsiya matnining SHA-256 hex digest'i bo'lishi shart —
qo'lda hisoblash xatoga moyil (ayniqsa Windows'da CRLF sabab noto'g'ri
checksum chiqishi mumkin), shuning uchun skript buni avtomatlashtiradi.

### To'liq tartib

1. `prisma/schema.prisma` ni tahrirlang.
2. Yuqoridagi "Migratsiya yozish tartibi" bo'yicha `prisma migrate diff`
   bilan `migration.sql` hosil qiling.
3. Hosil qilingan SQL'ni o'qing — `DROP TABLE`/`DROP COLUMN` yo'qligini,
   yangi ustunlar nullable yoki default bilan ekanini tekshiring.
4. Oddiy PR jarayoni: branch, commit, push, PR. CI'dagi `migration-check`
   job'i butun zanjirni bo'sh bazada tekshiradi.
5. CI yashil bo'lgach, PR `main`ga merge qilinadi (foydalanuvchi tomonidan).
6. Loyiha egasi lokalda ishga tushiradi:
   ```bash
   npm run db:manual -- <migratsiya-papkasi-nomi>
   ```
   Bu `prisma/migrations/<nom>/manual-apply.sql` faylini yozadi — bitta
   tranzaksiya ichida migratsiya SQL'i va `_prisma_migrations`ga yozuv
   qo'shadigan `INSERT`. Fayl allaqachon mavjud bo'lsa, qayta yozish uchun
   `--force` qo'shiladi.
7. `manual-apply.sql`ning to'liq mazmuni Neon Console → **SQL Editor**'ga
   nusxa-qo'yiladi va bajariladi.
8. Tasdiqlash:
   ```sql
   SELECT migration_name FROM "_prisma_migrations" ORDER BY finished_at;
   ```
   Yangi migratsiya nomi ro'yxatda oxirida ko'rinishi kerak.

`manual-apply.sql` git'da migratsiya papkasi bilan birga saqlanadi (audit
uchun) — `.gitignore`ga qo'shilmagan.

**Bu qadam faqat loyiha egasi tomonidan bajariladi — Claude Code
sessiyalari `manual-apply.sql` faylini yaratishi mumkin (matn fayli
yozish, bazaga ulanmaydi), lekin uni Neon SQL Editor'ga qo'yish va
bajarish har doim inson tomonidan, qo'lda amalga oshiriladi.**

## P3005 nima va nega chiqqan edi

`P3005: The database schema is not empty` — Prisma Migrate xatosi. U
`migrate deploy` bo'sh bo'lmagan (allaqachon jadvallari bor) bazaga
qarshi ishga tushirilganda, lekin `_prisma_migrations` jadvalida hali
hech qanday migratsiya "qo'llangan" deb belgilanmagan bo'lsa yuzaga
keladi — Prisma sxemaning haqiqiy holatini bilmaydi va xavfsizlik uchun
bosh tortadi.

Bu loyihada shunday bo'ldi: `package.json` dagi `build` skriptiga
`prisma migrate deploy` qo'shilgan edi, lekin `0_init` baseline migratsiyasi
prod bazada hali `migrate resolve --applied` bilan belgilanmagan edi.
Natijada Vercel Preview deploy `build` bosqichida `migrate deploy`ni
ishga tushirdi, u prod `DATABASE_URL`ga ulandi, jadvallarni "bo'sh emas"
deb topdi va P3005 bilan yiqildi.

Yechim ikki qismdan iborat:

1. `build` skriptidan `prisma migrate deploy` butunlay olib tashlandi —
   endi Vercel build bazaga umuman ulanmaydi.
2. Migratsiyani bazaga qo'llash mas'uliyati alohida, ataylab chaqiriladigan
   workflow'larga (`db-baseline.yml`, `db-deploy.yml`) o'tkazildi — ular
   `main`ga merge yoki qo'lda ishga tushirish orqali, nazorat ostida
   ishlaydi, Preview deploy'lar bilan aralashmaydi.

## Additive-only qoidasi

- Yangi jadval, yangi ustun (**nullable yoki default bilan**), yangi
  indeks — xavfsiz, `migrate diff` bilan avtomatik yaratiladi.
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

## Kelajakda: Preview uchun Neon branch (ixtiyoriy)

Hozircha Vercel Preview deploy'lar `build` bosqichida bazaga umuman
ulanmaydi (`prisma migrate deploy` build'dan olib tashlangan), shuning
uchun P3005 muammosi endi Preview'da qayta chiqmaydi. Lekin agar
kelajakda Preview muhitida haqiqiy ma'lumotlar bilan ishlash kerak bo'lsa
(masalan, API route'larni Preview'da qo'lda sinash uchun), quyidagi sozlash
tavsiya etiladi:

1. **Neon.tech'da** — loyiha uchun alohida branch (masalan, `preview`)
   yarating: Neon Console → Branches → "New Branch" → asosiy (prod)
   branch'dan. Neon branch'lari copy-on-write bo'lib, prod ma'lumotini
   nusxalaydi, lekin undan mustaqil ishlaydi.
2. **Vercel'da** — loyiha Settings → Environment Variables bo'limida
   `DATABASE_URL` uchun alohida qiymat qo'shing va uni faqat **Preview**
   muhitiga biriktiring (Production'dan farqli qiymat, Neon preview
   branch'ining connection string'i bilan).
3. Migratsiyani bu Neon preview branch'iga qo'llash alohida masala —
   masalan, `db-deploy.yml`ga o'xshash, lekin preview branch uchun mo'ljallangan
   qo'shimcha workflow orqali. Hozircha bu qilinmagan, chunki build endi
   umuman migratsiya qo'llamaydi va bu ehtiyoj yo'q.

## Xavfsizlik qoidalari (Claude Code sessiyalari uchun)

- Bazaga ulanadigan **hech qanday** buyruq (`prisma migrate dev`,
  `migrate deploy`, `migrate resolve`, `db push`, `studio`, va h.k.)
  lokal terminaldan ishga tushirilmaydi — na prod, na dev, na CI
  konteynerga qarshi. Sabab: lokal tarmoq 5432-portni bloklaydi, ulanish
  baribir muvaffaqiyatsiz bo'ladi va bu kutilgan holat.
- Yangi migratsiya fayli yaratish — bu faqat fayl yozish, bazaga
  tegmaydi (`prisma migrate diff ... --script > ...`). Bunga ruxsat bor,
  lekin generatsiya qilingan SQL har doim qo'lda tekshirilsin (yuqoridagi
  bo'limga qarang).
- Migratsiyani bazaga qo'llash — `db-deploy.yml` (avtomatik, `main`ga
  merge'dan keyin — hozircha P1001 sababli ishlamayapti) yoki
  `db-baseline.yml` (qo'lda, loyiha egasi tomonidan, faqat bir marta)
  orqali amalga oshiriladi. Hozirgi vaqtinchalik tartibda migratsiya Neon
  SQL Editor orqali qo'lda qo'llanadi (`npm run db:manual` — yuqoriga
  qarang); `manual-apply.sql`ni yaratish ruxsat etilgan (bazaga ulanmaydi),
  lekin uni SQL Editor'ga qo'yib bajarish — faqat loyiha egasi ishi.
- `.env` faylini o'qimang va uning mazmunini chiqarmang. GitHub secret
  qiymatlarini ham o'qib bo'lmaydi va chiqarilmaydi.
