/**
 * `generate-backfill-sql.ts` hosil qiladigan SQL ichidagi dublikat aniqlash
 * va mavzu moslashtirish ifodalarining sof TypeScript aynan nusxasi. Bazaga
 * ulanmaydi, hech qanday yon ta'sirga ega emas — faqat shu SQL
 * ifodalarining mantig'ini `backfill-sql-lib.test.ts`da tasdiqlash uchun.
 * SQL'ning o'zi (`01-items.sql`) haqiqiy ko'chirishni bajaradi — bu fayl
 * uni ijro etmaydi, faqat aynan bir xil qoidani takrorlaydi.
 *
 * DIQQAT: bu yerdagi normalizatsiya `scripts/backfill-items-lib.ts`dagi
 * (Prisma Client asosidagi backfill uchun) `normalizeText`/
 * `normalizeTopicToSlug`dan ATAYLAB farq qiladi — SQL varianti soddaroq:
 * dublikat kaliti uchun apostroflarga tegilmaydi (promptda berilgan aniq
 * formula), mavzu moslashtirish esa slug emas, TopicNode.nameUz bilan
 * to'g'ridan-to'g'ri solishtiriladi.
 */

/** SQL: `trim(lower(regexp_replace(text, '\s+', ' ', 'g')))`. */
export function normalizeWhitespace(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * SQL: `md5(subjectId || '|' || trim(lower(regexp_replace(text,'\s+',' ','g'))) || '|' || coalesce(correctAnswer,''))`.
 * Haqiqiy md5 emas — faqat "bir xil kirish bir xil kalit beradi, har xili
 * har xil kalit beradi" xususiyatini testlash uchun tuple-shaklidagi kalit.
 * correctAnswer ATAYLAB normalizatsiya qilinmaydi (SQL formulasi ham
 * shunday) — faqat coalesce(..., '') bilan null'dan himoyalanadi.
 */
export function computeItemDuplicateKey(
  subjectId: string,
  text: string,
  correctAnswer: string | null
): string {
  return `${subjectId}|${normalizeWhitespace(text)}|${correctAnswer ?? ""}`;
}

// Lotin apostrof variantlari — generate-backfill-sql.ts#ITEMS_SQL dagi
// `pg_temp.eduprime_norm_topic` funksiyasi bilan bir xil to'plam: to'g'ri
// kavichcha, ikkita tipografik qo'shtirnoq va ikkita modifikator harf.
const APOSTROPHE_RE = /['‘’ʻʼ]/g;

/** SQL: `trim(regexp_replace(lower(regexp_replace(text, '[''‘’ʻʼ]', '', 'g')), '\s+', ' ', 'g'))`. */
export function normalizeTopicForMatch(text: string): string {
  return text
    .replace(APOSTROPHE_RE, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Mavzu matni TopicNode.nameUz bilan (normallashtirilgan holda) mos kelsa true. */
export function topicMatchesNode(topic: string, nodeNameUz: string): boolean {
  return normalizeTopicForMatch(topic) === normalizeTopicForMatch(nodeNameUz);
}
