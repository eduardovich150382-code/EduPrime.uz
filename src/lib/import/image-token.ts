/**
 * Rasm tokeni (`[[IMG:<assetId>]]`) bilan ishlaydigan eng quyi qatlam.
 *
 * ALOHIDA fayl bo'lishining sababi bitta: bu yordamchilar ilgari
 * `structure.ts` va `chat-apply.ts` da turardi, ular esa `@google/generative-ai`
 * dan QIYMAT importi qiladi (`SchemaType`). Klient komponenti (JSON qo'yish
 * rejimi) tokenni tozalash uchun o'sha fayllardan birini import qilsa, Gemini
 * SDK butunlay brauzer bundle'iga tushardi.
 *
 * Shu sababli bu modulning HECH QANDAY importi yo'q va bo'lmasligi ham kerak.
 */

/** Rasm tokeni: model matn ichida shu ko'rinishda ko'radi va qaytaradi. */
export function imageToken(assetId: string): string {
  return `[[IMG:${assetId}]]`;
}

/**
 * Har chaqiruvda YANGI regex qaytaradi.
 *
 * Tayyor regex eksport qilinmaydi: `g` bayrog'i bilan u holatli (`lastIndex`)
 * va ikki modul uni baham ko'rsa, biri ikkinchisining qidiruvini jimgina
 * yarmidan boshlab yuborardi.
 */
export function imageTokenPattern(): RegExp {
  return /\[\[IMG:[^\]]*\]\]/g;
}

/** Matndagi hamma rasm tokenini qaytaradi. S5 (`translate.ts`) shuni ishlatadi. */
export function imageTokensOf(text: string): string[] {
  return text.match(imageTokenPattern()) ?? [];
}

/**
 * Rasm tokenlarini matndan olib tashlaydi — son solishtiruvidan OLDIN.
 *
 * Tokenning ichidagi cuid da raqamlar bor (`cmu2gfe670005lc0438g6uky5`), manba
 * matnida esa token umuman bo'lmaydi: `BLOCK` bosqichida rasmlar `raw.images`
 * da turadi. Tozalamasdan solishtirilsa HAR rasmli savol yolg'on
 * `NUMBER_MISMATCH` olardi va bayroq ma'nosini butunlay yo'qotardi.
 */
export function withoutImageTokens(text: string): string {
  let out = text;
  for (const token of imageTokensOf(text)) out = out.replace(token, ' ');
  return out;
}
