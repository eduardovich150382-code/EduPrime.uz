/**
 * `link-item-topics.sql` ichidagi `pg_temp.eduprime_norm_topic` funksiyasi va
 * undan foydalanadigan moslashtirish shartining sof TypeScript aynan nusxasi
 * — bazaga ulanmaydi, hech qanday yon ta'sirga ega emas, faqat shu SQL
 * mantig'ini `topic-match.test.ts`da tasdiqlash uchun. Haqiqiy bog'lashni
 * `link-item-topics.sql`ning o'zi bajaradi — bu fayl uni ijro etmaydi.
 *
 * `scripts/backfill-sql-lib.ts#normalizeTopicForMatch` bilan bir xil qoida
 * (aynan bir xil apostrof to'plami — to'g'ri kavichcha, ikkita tipografik
 * qo'shtirnoq, ikkita modifikator harf), faqat bu yerda TopicNode.aliases
 * massivi ham hisobga olinadi.
 */

const APOSTROPHE_RE = /['‘’ʻʼ]/g;

/** SQL: `trim(regexp_replace(lower(regexp_replace(text, '[''‘’ʻʼ]', '', 'g')), '\s+', ' ', 'g'))`. */
export function normalizeTopicText(text: string): string {
  return text
    .replace(APOSTROPHE_RE, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Mavzu matni TopicNode.nameUz BILAN, aks holda aliases massividagi biror
 * qiymat bilan (har biri normallashtirilgan holda) mos kelsa true —
 * link-item-topics.sql'dagi JOIN shartining nusxasi.
 */
export function topicMatchesNodeOrAlias(topic: string, nameUz: string, aliases: string[]): boolean {
  const normTopic = normalizeTopicText(topic);
  if (normalizeTopicText(nameUz) === normTopic) return true;
  return aliases.some((alias) => normalizeTopicText(alias) === normTopic);
}
