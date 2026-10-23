/**
 * Attestatsiya testidagi savolning BO'LIMI (fizika / kasb standarti /
 * pedagogika). Alohida ustun yo'q — `Question.tags` ichidagi `section:<kalit>`
 * tegida saqlanadi, shuning uchun migratsiya kerak bo'lmadi. `Question.topic`
 * bunga yaramaydi: u fan ichidagi mavzu ("Kinematika"), bo'lim emas.
 *
 * Bitta savolda ko'pi bilan bitta `section:` tegi bo'lishi kerak. Qo'lda
 * (SQL bilan) ikkitasi tushib qolsa birinchisi olinadi — natija sahifasi
 * yiqilmasin.
 */

export const SECTION_KEYS = ['fizika', 'kasb-standarti', 'pedagogika'] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

export const SECTION_TAG_PREFIX = 'section:';

function isSectionKey(value: string): value is SectionKey {
  return (SECTION_KEYS as readonly string[]).includes(value);
}

/** `tags` dagi birinchi `section:` tegining kaliti; noma'lum kalit yoki teg yo'q bo'lsa `null`. */
export function getQuestionSection(tags: unknown): SectionKey | null {
  if (!Array.isArray(tags)) return null;
  const tag = tags.find((t): t is string => typeof t === 'string' && t.startsWith(SECTION_TAG_PREFIX));
  if (!tag) return null;
  const key = tag.slice(SECTION_TAG_PREFIX.length);
  return isSectionKey(key) ? key : null;
}

/**
 * Bo'lim tegini almashtiradi. Boshqa teglar o'z joyida qoladi — `tags` kelajakda
 * boshqa maqsadlarga ham ishlatiladi va muharrir ularni yo'qotmasligi kerak.
 * Barcha eski `section:` teglar olib tashlanadi, ya'ni "bittadan ko'p emas"
 * qoidasi shu yerda tiklanadi.
 */
export function setQuestionSection(tags: string[], key: SectionKey | null): string[] {
  const rest = tags.filter((t) => !t.startsWith(SECTION_TAG_PREFIX));
  return key ? [...rest, `${SECTION_TAG_PREFIX}${key}`] : rest;
}

export interface SectionGroup<T> {
  key: SectionKey;
  /** `index` — kirish massividagi o'rin, ya'ni foydalanuvchi ko'rgan raqam − 1. */
  items: { question: T; index: number }[];
}

/**
 * Savollarni bo'limlarga ajratadi. Guruhlar `SECTION_KEYS` tartibida (bo'sh
 * guruh tushib qoladi), guruh ichida kirish tartibi saqlanadi.
 *
 * Birorta savolda bo'lim bo'lmasa — butun test uchun `null`. Qisman guruhlash
 * ataylab qilinmaydi: "Boshqa" guruhi bilan chiqqan xarita eski ma'lumotda
 * chalg'itardi, oddiy to'r esa hech bo'lmasa to'g'ri.
 */
export function groupBySection<T extends { tags?: unknown }>(questions: T[]): SectionGroup<T>[] | null {
  if (questions.length === 0) return null;
  const buckets = new Map<SectionKey, SectionGroup<T>['items']>();
  for (const [index, question] of questions.entries()) {
    const key = getQuestionSection(question.tags);
    if (!key) return null;
    const bucket = buckets.get(key) ?? [];
    bucket.push({ question, index });
    buckets.set(key, bucket);
  }
  return SECTION_KEYS.filter((key) => buckets.has(key)).map((key) => ({ key, items: buckets.get(key)! }));
}

/**
 * Guruhdagi raqamlar (1 dan) uzluksiz bo'lsa `{ from, to }`, aks holda `null`.
 *
 * Attestatsiya testlarida savol tartibi foydalanuvchiga qarab aralashtiriladi,
 * shuning uchun bo'lim ko'pincha uzluksiz BO'LMAYDI — o'shanda sarlavhada
 * oraliq emas, son ko'rsatiladi. Raqamlarni qattiq yozish (1–35) xaritadagi
 * kataklar bilan ziddiyatga kirardi.
 */
export function sectionRange(indexes: number[]): { from: number; to: number } | null {
  if (indexes.length === 0) return null;
  const sorted = [...indexes].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) return null;
  }
  return { from: sorted[0] + 1, to: sorted[sorted.length - 1] + 1 };
}

/** Guruh bali: to'g'ri javoblar ballari yig'indisi va jami ball (`points` yo'q bo'lsa 1). */
export function sectionScore<T extends { id: string; points?: number | null }>(
  items: SectionGroup<T>['items'],
  answers: { questionId: string; isCorrect: boolean }[],
): { score: number; max: number } {
  const correct = new Set(answers.filter((a) => a.isCorrect).map((a) => a.questionId));
  let score = 0;
  let max = 0;
  for (const { question } of items) {
    const points = question.points ?? 1;
    max += points;
    if (correct.has(question.id)) score += points;
  }
  return { score, max };
}
