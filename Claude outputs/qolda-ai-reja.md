# Yangi yo'nalish — AI ni serverdan olib chiqish

_Taklif. Sabohat "bo'ladi" degandan keyin ishga tushadi._

---

## Nima uchun

Sabohatning eski usuli ishlagan: savollarni AI chatiga tashlab, tarjima +
LaTeX + variantlar + to'g'ri javoblarni bir zumda olgan. Yagona og'riq —
**rasmlar**: ularni qo'lda joylashtirishga to'g'ri kelgan.

Biz esa ishlayotgan qismni (matn/tarjima) serverga ko'chirdik. Oxirgi kunlarda
kurashgan narsalarimiz — Vercel'ning 60 s chegarasi, bepul kvota, muddat
bo'lish, qayta urinish zanjiri, model zanjiri, token maskalash — **birortasi
ham savol sifatiga aloqador emas**. Hammasi "Gemini chaqiruvi serverless
funksiya ichida turgani" uchun mavjud.

Chatda bu chegaralarning hech biri yo'q.

**Qaror: rasm qismi platformada qoladi (u qiyin va biz uddaladik), matn/tarjima
qismi chatga qaytadi.**

---

## Hozir nima ishlayotgani (tegilmaydi)

| Bosqich | Holat |
|---|---|
| `rasm_ajratgich.py` — 3 xil kitob turi, rasm kesish, OCR, ZIP | ✅ ishlaydi |
| ZIP yuklash → UploadThing → `ImportAsset` | ✅ ishlaydi |
| `blocks.ts` + `grouping.ts` — o'qish tartibi, savolga bo'lish | ✅ ishlaydi |
| **Rasmni to'g'ri savolga ulash** | ✅ ishlaydi — asosiy yutuq |
| `ImportDraft` yozuvlari (`textOriginal`, `[[IMG:...]]` joyida) | ✅ ishlaydi |

Ya'ni **eng qiyin ish allaqachon bitgan**. Turkcha skan kitobda ham 14 ta rasm
o'z savoliga tushdi.

## Nima to'xtaydi

| Bosqich | Nima bo'ladi |
|---|---|
| S4 `structure` (serverda Gemini) | Kod **qoladi**, bayroq ortida o'chiriladi |
| S5 `translate` (serverda Gemini) | Kod **qoladi**, bayroq ortida o'chiriladi |
| Muddat/qayta urinish/zanjir/kvota mantiqi | Tegilmaydi, ishlatilmaydi |

**Hech narsa o'chirilmaydi.** Kelajakda ko'p foydalanuvchi bo'lganda
`IMPORT_AUTO_STRUCTURE=true` bilan qaytariladi. Hozir standart `false`.

---

## Yangi oqim

```
1. ZIP yuklash                          (mavjud)
2. Server: bloklar + guruhlash + rasm ulash   (mavjud)
3. YANGI: "savollar.md" ni yuklab olish / nusxalash
4. Chatga tashlash (tayyor prompt bilan) → JSON
5. YANGI: JSON ni qaytarib yuklash
6. Server: JSON → ImportDraft (Gemini'siz, bir soniyada)
7. Ko'rib chiqish oynasi → tasdiqlash → Item
```

3 va 5 — yangi. 6 — oddiy tekshiruv va yozish. Gemini yo'q.

### Muhim: qisqa tokenlar

`savollar.md` da rasm o'rni **`[[IMG:1]]`, `[[IMG:2]]`** ko'rinishida bo'ladi —
`cmu2gfe670005lc0438g6uky5` emas. Sababi allaqachon o'rganilgan: til modeli
24 belgili tasodifiy satrni ishonchli ko'chira olmaydi (11/11 savol shundan
yiqilgandi).

Raqam ↔ haqiqiy `assetId` xaritasi **serverda, job ichida** saqlanadi. Haqiqiy
token hech qachon chatga chiqmaydi.

---

## Sessiyalar

### A1 — Eksport (`feat/import-export-md`)

**Maqsad:** `stage: 'BLOCK'` draftlarni chatga tashlashga tayyor matnga aylantirish.

- `GET /api/teacher/import/[jobId]/export` → `savollar.md` (matn).
- Har blok shunday:

  ```
  ### 12
  1. Rasmdagi eshik sharnirlar atrofida erkin aylana oladi... [[IMG:1]]
  A) ... B) ... C) ... D) ... E) ...
  ```

  `### <order>` — qaytishda moslash uchun kalit. Boshqa hech narsa qo'shilmaydi.
- Qisqa token xaritasi `ImportJob.raw.tokenMap` ga yoziladi:
  `{ "1": "cmu2gfe...", "2": "cmu2gfc..." }`. Raqamlash — `order`, keyin blok
  ichidagi tartib bo'yicha, butun job bo'ylab **ketma-ket** (1, 2, 3 …).
- **Bo'lish:** `?chunk=1&size=50` — 50 savoldan bo'lib beradi. 300 savolli
  kitob bitta xabarga sig'maydi. Import sahifasida "1-qism / 2-qism" tugmalari.
- Import sahifasida: **"Matnni nusxalash"** tugmasi (clipboard) va
  **"savollar.md yuklab olish"**. Yonida — **"Promptni nusxalash"**.

**Prompt matni** (`src/lib/import/chat-prompt.ts`, uchala til uchun bitta):
foydalanuvchi uni chatga birinchi tashlaydi. Mazmuni S5 promptidan ko'chadi —
lug'at, LaTeX qoidalari, `[[IMG:n]]` ni o'zgartirmaslik, faqat son/formula
bo'lgan variantni tarjima qilmaslik, JSON sxemasi.

### A2 — Import (`feat/import-json-in`)

**Maqsad:** chatdan kelgan JSON ni draftlarga yozish.

- Import sahifasida: **katta textarea + fayl yuklash** (`.json`).
- `POST /api/teacher/import/[jobId]/apply` — JSON qabul qiladi.
- Kutilgan shakl (chat modeli uchun soddalashtirilgan):

  ```json
  [
    { "order": 12,
      "text": "...",
      "options": ["...", "...", "...", "...", "..."],
      "answer": "C" }
  ]
  ```

  `label` lar yozilmaydi — indeks bo'yicha A, B, C, D, E qo'yiladi. Chat
  modelidan kam narsa so'ralsa, kam xato qiladi.
- **Tekshiruv, har savol uchun alohida** (bittasi yiqilsa qolgani yoziladi):
  - `order` shu jobda bormi → yo'q bo'lsa `UNKNOWN_ORDER`, o'sha element tashlanadi;
  - `options` soni 2–8;
  - `answer` — variantlar ichidagi harf;
  - `[[IMG:n]]` — `tokenMap` da bor raqamlar, har biri **bir marta**;
    ortiqchasi o'chiriladi (`IMAGE_TOKEN_INVALID`), yetishmagani matn oxiriga
    qo'shiladi (`IMAGE_TOKEN_MOVED`) — PR #159 dagi mantiq **qayta ishlatiladi**;
  - `$` soni juft (`LATEX_UNBALANCED` → bayroq, yiqitmaydi);
  - sonlar `textOriginal` bilan solishtiriladi (`NUMBER_MISMATCH` → bayroq).
- Yozilishi: `text`, `options`, `correctAnswer`, `raw.stage = 'READY'`.
  `textOriginal`/`optionsOriginal` **tegilmaydi**.
- Javob: `{ applied, skipped, problems: [{ order, code }] }` — ekranda
  ro'yxat bo'lib ko'rinadi, ustoz nimaga e'tibor berishni biladi.
- **Idempotent:** o'sha JSON ni ikki marta yuklash zarar qilmaydi, ustidan yozadi.

### A3 — Ko'rib chiqish oynasi (`feat/import-review`)

Bu **har qanday yo'lda ham kerak edi** — eski S7. Endi u oxirgi qadam.

- Savollar ro'yxati: matn, variantlar, to'g'ri javob, **rasmlar ko'rinib turadi**.
- Har savolda: matnni tahrirlash, rasmni boshqa joyga surish/o'chirish,
  to'g'ri javobni almashtirish.
- Bayroqli savollar (`NUMBER_MISMATCH`, `IMAGE_TOKEN_MOVED`, `NO_KEY_FOUND`,
  `LATEX_UNBALANCED`) **yuqorida**, rangli belgisi bilan.
- `sourceBbox` emas, `raw.regions` ishlatilsin — ustunlar bo'ylab cho'zilgan
  savollarda `sourceBbox` noto'g'ri.

### A4 — Tasdiqlash (`feat/import-commit`)

Eski S8. `READY` draftlarni `Item` ga yozadi, rasmlarni biriktiradi, jobni
yopadi. Yozilgandan keyin sahifa akslari (`sahifalar/`) o'chiriladi — ular
faqat ko'rib chiqish uchun kerak edi, UploadThing'da o'rin egallamasin.

### A5 — Mahalliy avtomatlashtirish (ixtiyoriy, keyin)

Chatga tashlash qadamini ham avtomatlashtirish — lekin **kompyuteringizda**,
serverda emas.

`savol_tayyorla.py` — kichik script: `savollar.md` ni oladi, Gemini'ni
chaqiradi, `savollar.json` yozadi. U yerda 60 sekundlik chegara **yo'q**,
shuning uchun muddat bo'lish, qayta urinish zanjiri, `deferred` holati —
hech biri kerak emas. 15 RPM bilan 58 savol ≈ 4 daqiqa, script kutadi.

A1 dagi prompt va A2 dagi JSON sxemasi **o'zgarishsiz** ishlatiladi.

Shundan keyin oqim: `rasm_ajratgich.py` → ZIP yuklash → `savollar.md` yuklab
olish → `savol_tayyorla.py` → JSON yuklash → ko'rib chiqish → tasdiq.

---

## Nima yutamiz

- **Kvota muammosi yo'qoladi.** Chat obunangiz alohida, API kvotasi bilan
  bog'liq emas.
- **60 sekund chegarasi yo'qoladi.** Server endi faqat JSON o'qiydi.
- **Sifat oshadi.** Chatdagi model API'dagi `flash-lite` dan kuchliroq.
- **Matnni ko'rib, tuzatib yuborish mumkin** — chatda savol bering, qayta
  so'rang, o'zingiz o'zgartiring. Serverda bu imkonsiz edi.
- **Rasm avtomatik joyiga tushadi** — aynan siz xohlagan narsa.

## Nima yo'qotamiz

- Har kitob uchun bitta qo'shimcha qadam: nusxalash → chat → qaytarib qo'yish.
  A5 dan keyin bu ham yo'qoladi.
- Bir necha yuz savolli kitob bir necha qismga bo'linadi.

---

## Sessiya tartibi va mehnat hajmi

| Sessiya | Ish | Migratsiya |
|---|---|---|
| A1 eksport | kichik — mavjud draftlarni matnga aylantirish | yo'q |
| A2 import | o'rta — tekshiruvlar, PR #159 mantiqini qayta ishlatish | yo'q* |
| A3 ko'rib chiqish | eng katta — UI | yo'q* |
| A4 tasdiqlash | o'rta | ehtimol |
| A5 mahalliy script | kichik — promptlar tayyor | yo'q |

\* `raw` JSON ichida saqlanadi, ustun qo'shilmaydi.

**A1 + A2 bir sessiyada bitadi.** Shundan keyin birinchi kitobingizni to'liq
import qila olasiz — ko'rib chiqish oynasisiz, to'g'ridan-to'g'ri bazaga.

---

## Ehtiyot choralari (o'zgarmaydi)

- Neon konnektorini Claude Code'ga ulamaslik.
- `prisma db push` / `migrate dev` / `migrate reset` — yo'q.
- `.env` o'qilmaydi, `main` ga to'g'ridan-to'g'ri commit yo'q, PR ni o'zi
  merge qilmaydi.
- Migratsiya bo'lsa — `manual-apply.sql` Neon'da **merge'dan oldin**.
- `git add -A` ishlatilmaydi.
