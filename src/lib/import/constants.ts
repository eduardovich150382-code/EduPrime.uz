/**
 * Matn tuzilishini aniqlash chegaralari.
 *
 * Hammasi bitta joyda turadi, chunki haqiqiy PDF'larda sozlash kerak bo'ladi:
 * skanerlangan hujjat, ikki ustunli DTM to'plami va Word'dan eksport qilingan
 * fayl bir xil chegaralarda birdek ishlamaydi. Testlar ham shu qiymatlarni
 * import qiladi — konstanta o'zgarganda testlar yolg'on yiqilmasin.
 */

/**
 * Ikki bo'lak bir qatorda deb hisoblanishi uchun `y` farqi qator
 * balandligining shu ulushidan kichik bo'lishi kerak.
 *
 * Yarmi — chunki ketma-ket qatorlar orasidagi masofa deyarli har doim shrift
 * balandligidan katta (satrlararo interval ≥ 1.0), pastki/yuqori indekslar
 * (x², H₂O) esa asosiy qatordan yarim balandlikdan kamroq siljiydi.
 */
export const ROW_Y_TOLERANCE_RATIO = 0.5;

/**
 * Sahifa eni shu kenglikdagi tik ustunchalarga bo'linadi va koridor shu
 * ustunchalar bo'yicha qidiriladi.
 *
 * 2 nuqta — eng tor qabul qilinadigan koridordan (COLUMN_GAP_MIN_PT) bir necha
 * barobar mayda: kvantlash oraliqni ko'pi bilan 2 ustuncha (4 nuqta) ga
 * kamaytiradi, shuning uchun 10 nuqtalik oraliq doim ≥ 8 nuqta o'lchanadi.
 */
export const CORRIDOR_BIN_PT = 2;

/**
 * Ustunchani kesib o'tuvchi matn qatorlari ulushi shundan past bo'lsa, u
 * koridor bo'la oladi (zich sahifa uchun asosiy qiymat).
 *
 * Nol emas: ikki ustunni kesuvchi sarlavha yoki javoblar jadvali yakka
 * "shovqin" — u butun aniqlashni buzmasligi kerak. Haqiqiy bir ustunli matn
 * esa deyarli har qatorda o'rtani kesadi va bu chegaradan ancha yuqori chiqadi.
 */
export const CORRIDOR_MAX_COVERAGE = 0.03;

/**
 * Qator soni qancha bo'lishidan qat'i nazar, shuncha kesuvchi qator kechiriladi.
 *
 * Siyrak sahifada (20–40 qator) 3% bitta qatorga ham yetmaydi — sarlavha va
 * jadval birga bo'lsa koridor rad etilardi. 3 — sahifada odatda uchraydigan
 * kesuvchi elementlar soni (sarlavha, bo'lim nomi, javoblar jadvali).
 */
export const CORRIDOR_TOLERATED_ROWS = 3;

/**
 * Moslashuvchan tolerantlikning shifti.
 *
 * Juda siyrak sahifada `CORRIDOR_TOLERATED_ROWS / qatorlar` katta ulushga
 * aylanadi; shiftsiz o'rtasi bir necha qatorda bo'sh qolgan bir ustunli matn
 * ikkiga bo'linib ketardi.
 */
export const CORRIDOR_MAX_COVERAGE_CAP = 0.1;

/**
 * Koridorning minimal eni — MUTLAQ, sahifa eniga nisbatan emas.
 *
 * Ustunlar oralig'i tipografik qiymat (odatda 10–20 nuqta) va sahifa o'lchami
 * bilan o'zgarmaydi. Oldingi nisbiy chegara (5% → A4 da 30 nuqta) haqiqiy
 * ikki ustunli sahifalarni rad etardi. 8 dan tor bo'shliq — so'z oralig'i
 * yoki jadval katakchalari chegarasi.
 */
export const COLUMN_GAP_MIN_PT = 8;

/**
 * Koridorning har ikki tomonida kamida shuncha matn qatori bo'lishi shart.
 *
 * Aks holda bir ustunli sahifaning chetidagi yakka yozuv (masalan o'ngdagi
 * ball yoki izoh) ikkinchi "ustun" bo'lib chiqardi.
 */
export const MIN_COLUMN_ROWS = 5;

/**
 * Koridor markazi sahifaning o'rtadagi shu ulushida bo'lishi shart (0.4 →
 * o'rta 40%, har chetdan 30%).
 *
 * Shartsiz oddiy bir ustunli sahifaning keng o'ng hoshiyasi ham "koridor"
 * bo'lib ko'rinadi. Hoshiya — ustun chegarasi emas, u sahifa cheti.
 */
export const CORRIDOR_CENTER_BAND = 0.4;

/**
 * Sahifada shundan KAM matn bo'lagi bo'lsa — matn qatlami yo'q, sahifa skan
 * qilingan deb hisoblanadi.
 *
 * Skan PDF'ning ham matn qatlamida bir-ikki bo'lak bo'lishi mumkin (sahifa
 * raqami, skaner qo'shgan yozuv), oddiy savol sahifasida esa yuzlab bo'lak bor.
 */
export const MIN_TEXT_LAYER_ITEMS = 10;

/**
 * Sahifa enining shu ulushidan kengroq qator "to'liq enli" hisoblanadi va
 * ustunlarni aniqlashda HISOBGA OLINMAYDI.
 *
 * Sarlavha, ko'rsatma matni yoki kolontitul ikkala ustunni kesib o'tadi —
 * ularni klasterlashga qo'shsak, markazlar o'rtaga yig'ilib, ustunlar orasidagi
 * bo'shliq yo'qoladi va sahifa noto'g'ri bir ustunli deb topiladi.
 */
export const FULL_WIDTH_ROW_RATIO = 0.6;

// ---------------------------------------------------------------------------
// Chizma sohalari (figures.ts)
// ---------------------------------------------------------------------------

/**
 * Qatorlar orasidagi tik bo'shliq o'rtacha qator balandligining shu
 * barobaridan katta bo'lsa — u yerda chizma bor deb gumon qilinadi.
 *
 * 1.5 — chunki oddiy satrlararo interval (1.0–1.2) va abzatslar orasidagi
 * bo'shliq bundan past qoladi, chizma uchun ajratilgan joy esa deyarli har
 * doim bir necha qator balandligida bo'ladi.
 *
 * Shu nisbat gorizontal bo'linishda ham ishlatiladi: bo'shliq eng katta
 * bo'shliqning 1/1.5 qismidan keng bo'lsa, u variantlar orasidagi ajratuvchi.
 */
export const FIGURE_GAP_RATIO = 1.5;

/**
 * Eni yoki bo'yi shundan kichik soha chizma emas — bu formula ostidagi chiziq,
 * belgi yoki tasodifiy shtrix. 40 nuqta ≈ 1.4 sm.
 */
export const FIGURE_MIN_SIZE_PT = 40;

/**
 * Kesib olinadigan sohaga har tomondan qo'shiladigan hoshiya.
 *
 * Chiziqning qalinligi (line width) `DrawOp` qamroviga kirmasligi mumkin —
 * hoshiyasiz kesilsa chizmaning tashqi chizig'i qirqilib qoladi.
 */
export const FIGURE_PADDING_PT = 2;

/**
 * Sahifa enining shu ulushidan keng VA past soha — ajratuvchi chiziq
 * (savollar orasidagi gorizontal chiziq), chizma emas.
 */
export const DIVIDER_WIDTH_RATIO = 0.9;

/** Ajratuvchi chiziq deb tan olinishi uchun maksimal balandlik. */
export const DIVIDER_MAX_HEIGHT_PT = 10;

/**
 * Sahifaning yuqori va quyi shu ulushi — kolontitul tasmasi. Butunlay shu
 * tasmaga tushgan grafika logotip yoki sahifa bezagi, savolga tegishli emas.
 *
 * Ustun aniqlashda (columns.ts) ham ishlatiladi: tasmadagi sahifa raqami
 * ("~ 9 ~") odatda aynan koridor ustida turadi.
 */
export const HEADER_FOOTER_BAND_RATIO = 0.05;

/**
 * Bitta grafika shundan KO'P sahifada takrorlansa — logotip/kolontitul.
 *
 * 3 — chunki bir xil chizma ikki-uch savolda qayta ishlatilishi mumkin
 * (masalan bitta sxema bo'yicha bir necha savol), lekin to'rt va undan ortiq
 * sahifada takrorlanishi amalda faqat bezakda uchraydi.
 */
export const DEDUPE_PAGE_THRESHOLD = 3;

/**
 * Yonma-yon chizmalar variantlar qatori (A/B/C/D) deb tan olinishi uchun
 * bo'laklar soni shu oraliqda bo'lishi kerak.
 *
 * Oraliqdan tashqarida bo'lsa, bo'linish bitta murakkab chizmani
 * (bir necha ajralgan qismdan iborat sxema) noto'g'ri parchalagan bo'ladi —
 * shuning uchun bunday holda soha butunligicha qoldiriladi.
 */
export const OPTION_SPLIT_MIN = 3;
export const OPTION_SPLIT_MAX = 5;

// ---------------------------------------------------------------------------
// Render va piksel tahlili (pixels.ts)
// ---------------------------------------------------------------------------

/**
 * Sahifa shu zichlikda render qilinadi va chizmalar shu aksdan kesiladi.
 *
 * 300 — bosma sifat chegarasi: undan pastda ingichka o'q va shtrixlar
 * yo'qoladi (siyoh qidiruvi ularni topolmay qoladi), undan yuqorida esa
 * bitta A4 sahifaning aksi telefon xotirasida haddan tashqari joy egallaydi.
 */
export const RENDER_DPI = 300;

/**
 * Yorug'ligi shundan PAST piksel "siyoh" hisoblanadi (0 — qora, 255 — oq).
 *
 * 255 emas, 250: PDF render qirralarni silliqlaydi (anti-aliasing), shuning
 * uchun chinakam oq fon ham 252–254 atrofida chiqadi. 250 shu shovqinni
 * kesadi, lekin eng och kulrang shtrixni ham siyoh deb tanigan holda qoladi.
 */
export const INK_LUMINANCE_THRESHOLD = 250;

/**
 * Bir-biridan shundan YAQIN turgan siyoh sohalari bitta chizma deb
 * birlashtiriladi.
 *
 * Chizma deyarli hech qachon uzluksiz emas: o'q uchi, punktir chiziq, alohida
 * turgan belgi va yozuvlar bog'langan sohalar sifatida alohida chiqadi.
 * 3 nuqta ≈ 1 mm — bitta chizma ichidagi uzilishlar odatda shundan kichik,
 * yonma-yon turgan ikki AYRIM chizma orasidagi masofa esa ancha katta.
 */
export const INK_MERGE_GAP_PT = 3;

/**
 * Shundan ko'p sahifali fayl qabul qilinmaydi.
 *
 * Ikki sabab: butun quvur brauzerda ishlaydi va har sahifa 300 DPI da render
 * qilinadi (telefon xotirasi), hamda bitta kvota birligi cheksiz katta
 * hujjatni qamrab olmasligi kerak.
 */
export const MAX_IMPORT_PAGES = 40;
