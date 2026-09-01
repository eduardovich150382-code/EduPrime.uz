/**
 * `seed.ts` va `regenerate.ts` ikkalasi ham AYNAN shu ikki qiymat bilan
 * ishlashi SHART — generator determinilashgan (bir xil shablon + seed +
 * count → bir xil variantlar to'plami), shuning uchun `seed.ts` bazaga
 * yozgan `variantSig`ni `regenerate.ts` faqat shu qiymatlar bilan qayta
 * hisoblab topa oladi. Ilgari ikkalasida alohida (qo'lda sinxronlanadigan)
 * nusxa bor edi — biri o'zgarib ikkinchisi unutilsa, natija JIMGINA
 * (build/test xato bermay) buziladi: barcha eski variantlarning why/hints'i
 * "topilmadi" holatiga tushib qoladi. Endi bitta manba bor.
 */
export const PARAMGEN_SEED = 42;
export const PARAMGEN_PER_TEMPLATE = 200;
