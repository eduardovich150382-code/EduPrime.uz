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
