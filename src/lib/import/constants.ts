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
 * Ikki ustun deb tan olinishi uchun ular orasidagi tik koridor sahifa
 * enining shu ulushidan keng bo'lishi shart.
 *
 * 5% — A4 uchun ~30 nuqta. Undan tor bo'shliq odatda ustun emas, balki
 * kengroq so'z oralig'i yoki jadval katakchalari chegarasi bo'ladi.
 */
export const COLUMN_GAP_RATIO = 0.05;

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
