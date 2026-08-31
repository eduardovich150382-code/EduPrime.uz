import { db } from './db';

/**
 * `Question.topic` erkin matn ("Kinematika", "kinematika ", "Elektr toki")
 * bilan konstruktor Item bankidagi `TopicNode` daraxtini bog'lovchi ko'prik.
 * Ikkisi mustaqil kiritilgan — savol tegini ustoz qo'lda yozgan, `TopicNode`
 * esa alohida seed fayllaridan (`prisma/seeds/topics/*.json`) yuklangan,
 * shuning uchun aniq moslik kafolatlanmaydi. `lib/mastery.ts` (bilim
 * xaritasi) va `GET /api/items/weak-topics` shu ko'prikdan foydalanadi.
 */

export interface TopicNodeRef {
  id: string;
  path: string;
  nameUz: string;
}

/**
 * O'zbek tilida apostrof bir nechta xil belgi bilan yozilishi mumkin
 * (', ', ‘, ʻ, ʼ) — ustozlar teglarni qo'lda kiritganda ular aralash
 * ishlatiladi (masalan "O'zbekiston" va "Oʻzbekiston"). Moslashtirish
 * ularning barchasini olib tashlaydi (slug'larda ham apostrof yo'q, qarang
 * `dtm-online.ts` — MANDATORY_TOPIC_PATHS), registr va ortiqcha bo'shliq
 * ham e'tiborga olinmaydi.
 */
function normalizeTopicText(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/['‘’ʻʼ`´]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Berilgan fanning BARCHA `TopicNode`larini BITTA so'rov bilan olib,
 * xotirada `rawTopics`ga moslashtiradi (N ta alohida so'rov o'rniga).
 * Moslashtirish tartibi (birinchi mos kelgani g'olib):
 *   1. `nameUz` bilan aniq moslik (normalizatsiyadan keyin)
 *   2. `slug` bilan moslik
 *   3. `aliases` massivi ichidagi moslik
 *   4. Topilmasa — natija xaritasiga kirmaydi (majburan taxmin qilinmaydi)
 *
 * Natija — xom matndan (kalit sifatida berilgan `rawTopics` elementining
 * O'ZI, normalizatsiyadan OLDIN) topilgan tugunga xarita, shuning uchun
 * chaqiruvchi asl matn bilan qidirishi mumkin.
 */
export async function resolveTopicNodes(
  subjectId: string,
  rawTopics: string[]
): Promise<Map<string, TopicNodeRef>> {
  const result = new Map<string, TopicNodeRef>();
  const uniqueTopics = Array.from(new Set(rawTopics.filter((t) => t && t.trim())));
  if (uniqueTopics.length === 0) return result;

  const nodes = await db.topicNode.findMany({
    where: { subjectId },
    select: { id: true, path: true, nameUz: true, slug: true, aliases: true },
    orderBy: [{ level: 'asc' }, { order: 'asc' }],
  });
  if (nodes.length === 0) return result;

  const byNameUz = new Map<string, TopicNodeRef>();
  const bySlug = new Map<string, TopicNodeRef>();
  const byAlias = new Map<string, TopicNodeRef>();

  // Birinchi topilgan tugun g'olib (daraxt yuqoridan pastga, order bo'yicha
  // saralangan) — bir xil normallashtirilgan nomga ega ikki tugun kamdan-kam
  // uchraydi, lekin uchrasa ham natija izchil (reproducible) bo'lib qoladi.
  for (const node of nodes) {
    const ref: TopicNodeRef = { id: node.id, path: node.path, nameUz: node.nameUz };

    const nameKey = normalizeTopicText(node.nameUz);
    if (!byNameUz.has(nameKey)) byNameUz.set(nameKey, ref);

    const slugKey = normalizeTopicText(node.slug);
    if (!bySlug.has(slugKey)) bySlug.set(slugKey, ref);

    for (const alias of node.aliases) {
      const aliasKey = normalizeTopicText(alias);
      if (!byAlias.has(aliasKey)) byAlias.set(aliasKey, ref);
    }
  }

  for (const raw of uniqueTopics) {
    const key = normalizeTopicText(raw);
    const match = byNameUz.get(key) ?? bySlug.get(key) ?? byAlias.get(key);
    if (match) result.set(raw, match);
  }

  return result;
}
