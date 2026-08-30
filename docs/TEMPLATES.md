# Paramgen shablonlari va korpuslar — o'qituvchi uchun qo'llanma

Bu hujjat `src/lib/paramgen/` ichidagi parametrik savol generatorига yangi
**shablon** (template) va **korpus** (corpus) qo'shmoqchi bo'lgan odam uchun.
Kod bilishni talab qilmaydi — faqat JSON faylni to'g'ri to'ldirishni biladigan
bo'lsangiz yetarli. Texnik tafsilotlar uchun `src/lib/paramgen/paramgen.ts`
boshidagi izohlarga qarang.

## Ikki xil shablon bor

1. **Sonli (formula) shablon** — fizika/matematika masalalari kabi, javob
   formula bilan hisoblanadi (`answer.expr`). Bu turkum allaqachon
   `templates.json`da 60 ta misolda bor (masalan `fiz-kinematika-erkin-tushish-01`).
2. **Matnli (korpus) shablon** — tarix, ona tili, huquq, biologiya kabi
   fanlarda javob hisoblanmaydi, balki tayyor faktlar jadvalidan
   (**korpus**dan) o'qiladi. Shu hujjat asosan shu turkum haqida.

## Korpus nima va u qanday to'ldiriladi

Korpus — `src/lib/paramgen/corpora/` papkasidagi alohida `.json` fayl.
U faktlar jadvali, xolos:

```json
{
  "id": "tarix-voqealar",
  "columns": ["voqea", "yil", "shaxs", "joy"],
  "rows": [
    ["Amir Temur tug'ilgani", 1336, "Amir Temur", "Kesh (Shahrisabz)"],
    ["Ankara jangi", 1402, "Amir Temur", "Ankara"]
  ]
}
```

Qoidalar:

- **Fayl nomi = `id`.** `tarix-voqealar.json` fayl ichidagi `id` ham
  `"tarix-voqealar"` bo'lishi shart — shablon shu nom bilan murojaat qiladi.
- **`columns`** — har ustunning nomi. Shu nomlar keyin shablonning
  `stem`/`solution` matnida `{ustunNomi}` ko'rinishida ishlatiladi.
- **`rows`** — har biri `columns` bilan bir xil uzunlikdagi massiv. Qiymat
  son ham, matn ham bo'lishi mumkin (masalan `yil` — son, `voqea` — matn).
- **Bitta korpus bir nechta shablonga xizmat qiladi.** Masalan
  `tarix-voqealar` korpusidan "qaysi yilda", "kim bilan bog'liq", "qayerda"
  — uchta har xil shablon foydalanadi. Korpusni faktlar bo'yicha bir marta
  to'ldirasiz, so'ng ustiga necha xil savol qurish mumkin.
- **Kamida 40 qator tavsiya etiladi.** Kamroq bo'lsa, savollar tez
  takrorlana boshlaydi (o'quvchi javobni yodlab oladi, faktni emas).
- **Faqat ishonchingiz komil bo'lgan faktlarni yozing.** Yil, ism, joy —
  hammasi tekshirilgan bo'lishi kerak. Ishonchsiz qatorni qo'shmang —
  korpusni kichikroq qoldiring, keyin to'ldirasiz. Noto'g'ri fakt — noto'g'ri
  baholashga olib keladi, bu formuladagi arifmetik xatodan ham yomonroq,
  chunki uni fan o'qituvchisi darhol payqamasligi mumkin.

## Shablon korpusga qanday ishora qiladi

```json
{
  "id": "tarix-voqea-yil-01",
  "subject": "tarix",
  "topic": "Jahon va O'zbekiston tarixi — muhim sanalar",
  "grade": [9, 10, 11],
  "exams": ["dtm", "maktab"],
  "difficulty": 2,
  "params": [
    { "name": "event", "type": "set", "corpus": "tarix-voqealar" }
  ],
  "answer": { "fromParam": "yil" },
  "distractors": { "fromColumn": "yil", "strategy": "nearest", "count": 3 },
  "stem": { "uz": "\"{voqea}\" voqeasi qaysi yilda sodir bo'lgan?" },
  "solution": { "uz": "\"{voqea}\" — {yil}-yilda sodir bo'lgan." },
  "seedCount": 40
}
```

Muhim joylar:

- `params[0].corpus` — korpus faylining `id`si. `name` (bu yerda `"event"`)
  ixtiyoriy, faqat ichki nom — hech qayerda ko'rinmaydi.
- `columns`ni shablonda qayta yozish shart emas — ular korpusning o'zidan
  olinadi va `stem`/`solution` ichida `{voqea}`, `{yil}` kabi to'g'ridan-to'g'ri
  ishlatiladi.
- `answer.fromParam` — to'g'ri javob sifatida qaysi ustun olinishini
  ko'rsatadi. **Hisoblanmaydi**, korpusdagi qiymat o'zi javob bo'ladi.
- `distractors.fromColumn` — chalg'ituvchilar qaysi ustundan olinishini
  ko'rsatadi (odatda `answer.fromParam` bilan bir xil ustun).
- `seedCount` — korpusdagi qatorlar sonidan oshmasin (masalan 40 qatorli
  korpus uchun `40`). Katta qo'ysangiz ham xato bo'lmaydi, faqat generator
  behuda urinib, mavjud bo'lmagan qo'shimcha variant qidirib vaqt yo'qotadi.

## Chalg'ituvchi strategiyasi — qaysi qachon ishlatiladi

`distractors.strategy` uchta variantdan biri bo'ladi:

| Strategiya | Qachon ishlatiladi | Misol |
|---|---|---|
| `nearest` | Ustun **sonli va tartiblangani ma'noli** bo'lsa (sanalar, raqamlar) — chalg'ituvchilar to'g'ri javobga eng yaqin qiymatlar bo'ladi, shuning uchun taxmin qilib emas, bilib javob berish talab qilinadi | "qaysi yilda" — 1405 to'g'ri javob bo'lsa, chalg'ituvchilar 1402, 1401, 1394 kabi yaqin yillar bo'ladi, 570 kabi uzoq yil emas |
| `sameGroup` | Ustun **toifa/kategoriya** bo'lsa — barcha noyob qiymatlar orasidan tasodifiy tanlanadi | "so'z turkumi" (ot/sifat/fe'l/...), "qaysi tizimga tegishli" (yurak-qon tomir/nafas olish/...) |
| `otherRows` | Yuqoridagi ikkalasi ham mos kelmasa — istalgan boshqa qatordan tasodifiy | "qayerda sodir bo'lgan" (joy nomlari orasida "yaqinlik" yoki "toifa" ma'nosi yo'q) |

Amalda: sanalar va o'lchanadigan miqdorlar uchun `nearest`, chekli
toifalar (turkum, tizim, sinf) uchun `sameGroup`, qolgan hamma narsa uchun
`otherRows`.

## Sonli va matnli shablonni aralashtirmang

Korpusdagi matnli ustunlar (masalan `voqea`, `shaxs`, `joy`) `derived` yoki
`answer.expr` kabi mathjs ifodalarida **ishlatilmaydi** — faqat
`stem`/`solution`/`hints` matnida yoki `answer.fromParam` /
`distractors.fromColumn` orqali. Buni buzsangiz, generator darhol aniq xato
beradi (`"matnli parametr ... ifodasida ishlatilgan"`) — bu qasddan shunday,
sokin noto'g'ri natija chiqarishning oldini oladi.

## Tez-tez uchraydigan xatolar

- **Korpus fayl nomi va ichidagi `id` mos kelmasligi.** Fayl
  `mavzu-nomi.json`, ichidagi `"id"` esa boshqa satr — generator
  `"Korpus topilmadi"` deb xato beradi (chunki fayl nomi bo'yicha qidiradi).
- **`columns` va `rows` uzunligi mos kelmasligi.** Har qatordagi elementlar
  soni `columns` soniga aynan teng bo'lishi kerak — aks holda korpus yuklash
  bosqichidayoq xato chiqadi.
- **`answer.fromParam` yoki `distractors.fromColumn`da ustun nomini xato
  yozish** (masalan `"turkim"` o'rniga to'g'risi `"turkum"`) — generator aniq
  xato beradi, savol shunchaki bo'sh chiqmaydi.
- **`nearest` strategiyasini toifaviy ustunga qo'llash** (masalan so'z
  turkumiga) — natija ma'nosiz bo'ladi, chunki "eng yaqin toifa" tushunchasi
  yo'q. Toifalar uchun doim `sameGroup`.
- **Kam qatorli korpusdan ko'p variant so'rash** (`seedCount` yoki
  `PER_TEMPLATE`ni korpus hajmidan ancha katta qilib qo'yish) — generator
  xato bermaydi, shunchaki mavjud bo'lgancha (masalan 40 ta) variant qaytaradi
  va qolgan urinishlarni behuda sarflaydi. `seedCount`ni korpus qatorlar
  soniga moslang.
- **Faktni "chamalab" yozish.** Yil yoki joy noaniq bo'lsa, qatorni umuman
  qo'shmang — kamroq, lekin to'g'ri korpus ko'proq, lekin xato korpusdan
  yaxshi.

## Hozirgi korpuslar va ular ustidagi shablonlar

| Korpus | Qatorlar | Ustunlar | Shablonlar |
|---|---|---|---|
| `tarix-voqealar` | 40 | voqea, yil, shaxs, joy | `tarix-voqea-yil-01`, `tarix-voqea-shaxs-01`, `tarix-voqea-joy-01` |
| `onatili-soz-turkum` | 40 | soz, turkum, misol | `onatili-soz-turkum-01`, `onatili-soz-turkum-matnda-01` |
| `biologiya-organ` | 40 | organ, tizim, vazifa | `biologiya-organ-tizim-01`, `biologiya-organ-vazifa-01`, `biologiya-vazifa-organ-01` |

### Kengaytirish kerak

- **`tarix-voqealar`** — hozir asosan jahon tarixi va Sohibqironlar
  davridagi keng tanilgan, sana darajasida ishonchli sanalar bilan
  cheklangan (ataylab — noaniq mahalliy voqealar qo'shilmadi). Zamonaviy
  O'zbekiston tarixi (1990-yillardan keyingi), mintaqaviy voqealar va
  aniq kun darajasidagi sanalar tarix o'qituvchisi tomonidan tekshirilib
  qo'shilishi kerak.
- **`onatili-soz-turkum`** yordamchi so'z turkumlaridan (`bog'lovchi`,
  `ko'makchi`, `yuklama`, `modal so'z`) hozircha bittadan-ikkitadan misol
  bilan cheklangan — har turkum uchun ko'proq so'z qo'shilsa, `sameGroup`
  distraktorlari yanada xilma-xil bo'ladi.
- **`biologiya-organ`** hozircha faqat inson anatomiyasi bilan cheklangan —
  o'simlik/hayvon a'zolari yoki hujayra organoidlari uchun alohida yangi
  korpus (masalan `biologiya-hujayra`) ochish tavsiya etiladi, bitta
  korpusga aralashtirmang (`tizim` ustuni ma'nosi boshqacha bo'lib qoladi).

## Yangi shablon qo'shgandan keyin

```bash
npm run validate:templates   # har shablondan 50 variant chiqarib, qat'iy tekshiradi (CI shu bilan qizil/yashil bo'ladi)
npm test                     # shu jumladan har shablon uchun shakliy regressiya testlari
```

`validate:templates` xato bersa, xabar qaysi shablon (`templateId`) va qaysi
tekshiruv (`check`) muvaffaqiyatsiz bo'lganini aniq ko'rsatadi — shu bo'yicha
tuzating, keyin qayta ishga tushiring.
