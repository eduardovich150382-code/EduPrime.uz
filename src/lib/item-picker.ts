import { Prisma, QuestionType } from '@prisma/client';
import { shuffleArray } from './shuffle';
import { tashkentDayRangeUtc } from './date';
import { db } from './db';

/**
 * Savol konstruktori uchun umumiy filtr shakli — `/api/items/count` va
 * `/api/items/search` bir xil spec'ni qabul qiladi, shuning uchun ikkalasi
 * ham xuddi shu (buildItemWhere orqali hosil bo'lgan) havzani ko'radi.
 * `topicPaths` prefiks bo'yicha ishlaydi: "mexanika" berilsa, TopicNode.path
 * shu bilan boshlangan barcha tugunlar (butun shox) mos keladi.
 */
export interface ItemSpec {
  subjectIds?: string[];
  topicPaths?: string[];
  grades?: number[];
  exams?: string[];
  difficultyMin?: number;
  difficultyMax?: number;
  types?: QuestionType[];
  bloomLevels?: string[];
  lang?: string[];
  /**
   * Berilsa, havza AYNAN shu id'lar bilan cheklanadi (boshqa shartlar bilan
   * AND) — masalan konstruktordagi "Kechagi xatolarim" preseti yoki
   * bitta spec'ni havola bilan ulashish/qayta ishlash oqimi uchun. Cheklov
   * bo'shatish (nextRelaxationStep) bu maydonga tegmaydi — bu "toraytiruvchi
   * filtr" emas, aniq tanlov, kengaytirish uning maqsadini yo'qqa chiqaradi.
   */
  onlyItemIds?: string[];
  excludeAnsweredCorrectlyDays?: number;
}

const QUESTION_TYPES = new Set<string>(Object.values(QuestionType));

/**
 * `body`dan ItemSpec'ni ajratib oladi va turlarini tekshiradi. DB'ga
 * bormaydi — faqat shakl (`grades` — sonlar massivi, `types` — mavjud
 * QuestionType qiymatlaridan, va h.k.) to'g'riligini tasdiqlaydi.
 */
export function parseItemSpec(body: unknown): { spec: ItemSpec } | { error: string } {
  if (!body || typeof body !== 'object') return { error: "So'rov tanasi noto'g'ri" };
  const b = body as Record<string, unknown>;
  const spec: ItemSpec = {};

  const stringArray = (v: unknown): string[] | null => {
    if (v === undefined) return [];
    if (!Array.isArray(v) || v.some((x) => typeof x !== 'string')) return null;
    return v;
  };
  const numberArray = (v: unknown): number[] | null => {
    if (v === undefined) return [];
    if (!Array.isArray(v) || v.some((x) => typeof x !== 'number' || !Number.isFinite(x))) return null;
    return v;
  };

  const subjectIds = stringArray(b.subjectIds);
  if (subjectIds === null) return { error: 'subjectIds — satrlar massivi bo\'lishi kerak' };
  if (subjectIds.length) spec.subjectIds = subjectIds;

  const topicPaths = stringArray(b.topicPaths);
  if (topicPaths === null) return { error: "topicPaths — satrlar massivi bo'lishi kerak" };
  if (topicPaths.length) spec.topicPaths = topicPaths;

  const grades = numberArray(b.grades);
  if (grades === null) return { error: "grades — sonlar massivi bo'lishi kerak" };
  if (grades.length) spec.grades = grades;

  const exams = stringArray(b.exams);
  if (exams === null) return { error: "exams — satrlar massivi bo'lishi kerak" };
  if (exams.length) spec.exams = exams;

  if (b.difficultyMin !== undefined) {
    if (typeof b.difficultyMin !== 'number') return { error: "difficultyMin — son bo'lishi kerak" };
    spec.difficultyMin = b.difficultyMin;
  }
  if (b.difficultyMax !== undefined) {
    if (typeof b.difficultyMax !== 'number') return { error: "difficultyMax — son bo'lishi kerak" };
    spec.difficultyMax = b.difficultyMax;
  }
  if (spec.difficultyMin !== undefined && spec.difficultyMax !== undefined && spec.difficultyMin > spec.difficultyMax) {
    return { error: 'difficultyMin difficultyMax dan katta bo\'lishi mumkin emas' };
  }

  const types = stringArray(b.types);
  if (types === null) return { error: "types — satrlar massivi bo'lishi kerak" };
  if (types.some((t) => !QUESTION_TYPES.has(t))) return { error: "types ichida noto'g'ri qiymat bor" };
  if (types.length) spec.types = types as QuestionType[];

  const bloomLevels = stringArray(b.bloomLevels);
  if (bloomLevels === null) return { error: "bloomLevels — satrlar massivi bo'lishi kerak" };
  if (bloomLevels.length) spec.bloomLevels = bloomLevels;

  const lang = stringArray(b.lang);
  if (lang === null) return { error: "lang — satrlar massivi bo'lishi kerak" };
  if (lang.length) spec.lang = lang;

  const onlyItemIds = stringArray(b.onlyItemIds);
  if (onlyItemIds === null) return { error: "onlyItemIds — satrlar massivi bo'lishi kerak" };
  if (onlyItemIds.length > 200) return { error: "onlyItemIds — 200 tadan ko'p bo'lishi mumkin emas" };
  if (onlyItemIds.length) spec.onlyItemIds = onlyItemIds;

  if (b.excludeAnsweredCorrectlyDays !== undefined) {
    if (typeof b.excludeAnsweredCorrectlyDays !== 'number' || b.excludeAnsweredCorrectlyDays <= 0) {
      return { error: "excludeAnsweredCorrectlyDays — musbat son bo'lishi kerak" };
    }
    spec.excludeAnsweredCorrectlyDays = b.excludeAnsweredCorrectlyDays;
  }

  return { spec };
}

/**
 * ItemSpec'ni Prisma `where`ga aylantiradi. Har doim faqat nashr etilgan va
 * ochiq (PUBLISHED/PUBLIC) itemlarni qaytaradi — savol matni pullik mahsulot,
 * bu yerdan chetlab o'tib bo'lmaydi. `excludeItemIds` — foydalanuvchi
 * yaqinda to'g'ri javob bergan (yoki hali javob berish oqimi ulanmagan
 * itemlar uchun legacy Question orqali topilgan) itemlar, chaqiruvchi
 * (route) tomonidan alohida so'rov bilan hisoblab beriladi — bu funksiya
 * o'zi DB'ga bormaydi.
 */
export function buildItemWhere(spec: ItemSpec, excludeItemIds: string[] = []): Prisma.ItemWhereInput {
  const where: Prisma.ItemWhereInput = {
    status: 'PUBLISHED',
    visibility: 'PUBLIC',
  };

  if (spec.subjectIds?.length) where.subjectId = { in: spec.subjectIds };

  if (spec.topicPaths?.length) {
    where.OR = spec.topicPaths.map((path) => ({
      topics: { some: { topic: { path: { startsWith: path } } } },
    }));
  }

  if (spec.grades?.length) where.grade = { hasSome: spec.grades };
  if (spec.exams?.length) where.exams = { hasSome: spec.exams };

  if (spec.difficultyMin !== undefined || spec.difficultyMax !== undefined) {
    where.difficulty = {
      ...(spec.difficultyMin !== undefined ? { gte: spec.difficultyMin } : {}),
      ...(spec.difficultyMax !== undefined ? { lte: spec.difficultyMax } : {}),
    };
  }

  if (spec.types?.length) where.type = { in: spec.types };
  if (spec.bloomLevels?.length) where.bloomLevel = { in: spec.bloomLevels };
  if (spec.lang?.length) where.lang = { in: spec.lang };

  // `onlyItemIds` (aniq tanlov) va `excludeItemIds` (chetlatish) ikkalasi
  // ham `id` ustuniga tushadi — ikkalasi berilsa ham bir-birini
  // almashtirmasin deb bitta obyektga birlashtiriladi.
  if (spec.onlyItemIds?.length || excludeItemIds.length) {
    where.id = {
      ...(spec.onlyItemIds?.length ? { in: spec.onlyItemIds } : {}),
      ...(excludeItemIds.length ? { notIn: excludeItemIds } : {}),
    };
  }

  return where;
}

// ===================== Hisoblash (/api/items/count) =====================

export interface CountCandidate {
  difficulty: number | null;
  templateId: string | null;
  id: string;
}

/**
 * Allaqachon havzadan olib kelingan qatorlardan hisobotni yig'adi — DB'ga
 * bormaydi, shu sababli sinovda haqiqiy so'rovsiz tekshirilishi mumkin.
 * `distinctTemplates` shablon (yoki shablonsiz bo'lsa savolning o'zi)
 * bo'yicha hisoblanadi: bitta shablonning ko'p varianti bitta xilma-xillik
 * birligi sifatida sanaladi.
 */
export function summarizeCandidates(rows: CountCandidate[]): {
  total: number;
  byDifficulty: Record<number, number>;
  distinctTemplates: number;
} {
  const byDifficulty: Record<number, number> = {};
  const templates = new Set<string>();
  for (const row of rows) {
    if (row.difficulty !== null) byDifficulty[row.difficulty] = (byDifficulty[row.difficulty] ?? 0) + 1;
    templates.add(row.templateId || row.id);
  }
  return { total: rows.length, byDifficulty, distinctTemplates: templates.size };
}

// ===================== Tanlash (/api/items/search) =====================

/**
 * `items`ni `keyFn` bo'yicha guruhlab, guruhlar orasida aylanma tartibda
 * ("round-robin") tekislaydi — bitta guruhdan (masalan bitta paramgen
 * shabloni) hammasi ketma-ket kelib qolmasligi uchun. `seedFn` har
 * chaqirilganda urug' (seed) qaytaradigan funksiya — chaqiruvchi buni
 * qat'iy (test/reproducible qidiruv uchun) yoki tasodifiy qilib bera
 * oladi. `pickItems` (pastda) shu funksiyani ishlatadi — DTM Online
 * S18a'da bu funksiyaga to'g'ridan-to'g'ri emas, `pickItems` orqali
 * bilvosita tayanadi (qarang `lib/sessions.ts` — `createSessionFromSections`).
 */
export function roundRobinFlatten<T>(items: T[], keyFn: (item: T) => string, seedFn: () => number): T[] {
  const byKey = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const list = byKey.get(key) || [];
    list.push(item);
    byKey.set(key, list);
  }
  for (const [key, list] of byKey) byKey.set(key, shuffleArray(list, seedFn()));

  const keys = shuffleArray(Array.from(byKey.keys()), seedFn());
  const flat: T[] = [];
  let round = 0;
  let addedThisRound = true;
  while (addedThisRound) {
    addedThisRound = false;
    for (const key of keys) {
      const list = byKey.get(key)!;
      if (round < list.length) {
        flat.push(list[round]);
        addedThisRound = true;
      }
    }
    round++;
  }
  return flat;
}

export type DifficultyBucket = 'easy' | 'medium' | 'hard';

export interface DifficultyRange {
  min: number;
  max: number;
}

/**
 * Berilgan `difficulty`ning [range.min, range.max] oralig'ining qaysi
 * uchdan biriga (oson/o'rta/qiyin) tushishini aniqlaydi — DTM Online'dagi
 * `difficultyBucketOf`dan farqli, u yerda chegaralar butun shkala (1-5) bo'yicha
 * qattiq belgilangan, bu yerda esa foydalanuvchi so'ragan ORALIQ ichida
 * NISBIY (chunki konstruktorda foydalanuvchi masalan faqat 3-5 oralig'ini
 * so'rashi mumkin — o'sha holda ham shu oraliq ichida yana 20/60/20 kerak).
 * Tegsiz (`null`) savol har doim 'medium' — ma'lumot yetarli bo'lmagan
 * davrda ekstremal guruhlarga majburan surilmasligi uchun.
 */
export function bucketOfDifficulty(difficulty: number | null, range: DifficultyRange): DifficultyBucket {
  if (difficulty === null) return 'medium';
  const span = range.max - range.min;
  if (span <= 0) return 'medium';
  const clamped = Math.min(range.max, Math.max(range.min, difficulty));
  const t = (clamped - range.min) / span;
  if (t < 1 / 3) return 'easy';
  if (t >= 2 / 3) return 'hard';
  return 'medium';
}

/** 20% oson / 60% o'rta / 20% qiyin — qolgan (yumaloqlashdan keyingi) qism har doim o'rtaga tushadi. */
export function difficultyQuota(limit: number): Record<DifficultyBucket, number> {
  if (limit <= 0) return { easy: 0, medium: 0, hard: 0 };
  const easy = Math.round(limit * 0.2);
  const hard = Math.round(limit * 0.2);
  const medium = Math.max(0, limit - easy - hard);
  return { easy, medium, hard };
}

export interface PickableItem {
  id: string;
  templateId: string | null;
  difficulty: number | null;
}

/**
 * `candidates`dan `limit` tagacha item tanlaydi: qiyinlik bo'yicha 20/60/20
 * egri taqsimot + har guruh ichida shablon bo'yicha round-robin
 * xilma-xillik. Bitta guruh (masalan "qiyin") kvotasini to'ldirish uchun
 * yetarli bo'lmasa, qolgan o'rinlar boshqa barcha nomzoddan (kvota
 * hisobga olinmay) to'ldiriladi — qiyinlik nisbati aniq bo'lmagan taqdirda
 * ham `limit` to'lishi ustuvor (havza kichik konstruktor so'rovlarida bu
 * kutilgan holat).
 */
export function pickItems(
  candidates: PickableItem[],
  opts: { limit: number; range: DifficultyRange; seedFn: () => number }
): PickableItem[] {
  const { limit, range, seedFn } = opts;
  if (limit <= 0 || candidates.length === 0) return [];

  const groupKey = (c: PickableItem) => c.templateId || c.id;
  const buckets: Record<DifficultyBucket, PickableItem[]> = { easy: [], medium: [], hard: [] };
  for (const c of candidates) buckets[bucketOfDifficulty(c.difficulty, range)].push(c);

  const quota = difficultyQuota(limit);
  const picked: PickableItem[] = [];
  const pickedIds = new Set<string>();

  for (const bucket of ['easy', 'medium', 'hard'] as const) {
    const chosen = roundRobinFlatten(buckets[bucket], groupKey, seedFn).slice(0, quota[bucket]);
    for (const c of chosen) {
      picked.push(c);
      pickedIds.add(c.id);
    }
  }

  if (picked.length < limit) {
    const leftover = candidates.filter((c) => !pickedIds.has(c.id));
    const filler = roundRobinFlatten(leftover, groupKey, seedFn).slice(0, limit - picked.length);
    picked.push(...filler);
  }

  return shuffleArray(picked, seedFn()).slice(0, limit);
}

// ===================== Cheklov bo'shatish =====================

export type RelaxationStep = 'difficulty' | 'grade' | 'neighborTopics';

/**
 * Havza `limit`dan kam chiqqanda cheklovlarni QAYSI TARTIBDA bo'shatish
 * kerakligini aniqlaydi: avval qiyinlik oralig'i, keyin sinf, keyin mavzu
 * (qo'shni — ota tugun — mavzularga kengaytirish). Har chaqiriqda faqat
 * bittasi qaytariladi; `alreadyRelaxed` shu vaqtgacha qo'llangan qadamlar —
 * chaqiruvchi (route) har muvaffaqiyatsiz urinishdan keyin shu ro'yxatga
 * qo'shib qayta chaqiradi. Bo'shatadigan narsa qolmasa — `null`.
 */
export function nextRelaxationStep(spec: ItemSpec, alreadyRelaxed: RelaxationStep[]): RelaxationStep | null {
  const done = new Set(alreadyRelaxed);
  if (!done.has('difficulty') && (spec.difficultyMin !== undefined || spec.difficultyMax !== undefined)) {
    return 'difficulty';
  }
  if (!done.has('grade') && spec.grades?.length) return 'grade';
  if (!done.has('neighborTopics') && spec.topicPaths?.length) return 'neighborTopics';
  return null;
}

/**
 * `topicPaths`dagi har bir yo'lni bitta daraja yuqoriga (ota tugunga)
 * ko'taradi — masalan "mexanika/kinematika" → "mexanika", shu bilan
 * qidiruv butun "mexanika" shoxiga (opa-uka mavzular ham) kengayadi.
 * Allaqachon ildiz darajasidagi ("/" belgisiz) yo'llar bo'shatib
 * bo'lmaydi — natijadan chiqarib tashlanadi.
 */
export function relaxTopicPathsToParents(topicPaths: string[]): string[] {
  const parents = topicPaths
    .map((p) => {
      const idx = p.lastIndexOf('/');
      return idx === -1 ? null : p.slice(0, idx);
    })
    .filter((p): p is string => p !== null && p.length > 0);
  return Array.from(new Set(parents));
}

/** Bitta bo'shatish qadamini spec'ga qo'llaydi — asl spec'ni o'zgartirmaydi. */
export function applyRelaxationStep(spec: ItemSpec, step: RelaxationStep): ItemSpec {
  switch (step) {
    case 'difficulty': {
      const rest = { ...spec };
      delete rest.difficultyMin;
      delete rest.difficultyMax;
      return rest;
    }
    case 'grade': {
      const rest = { ...spec };
      delete rest.grades;
      return rest;
    }
    case 'neighborTopics': {
      if (!spec.topicPaths?.length) return spec;
      const relaxed = relaxTopicPathsToParents(spec.topicPaths);
      if (relaxed.length === 0) {
        const rest = { ...spec };
        delete rest.topicPaths;
        return rest;
      }
      return { ...spec, topicPaths: relaxed };
    }
  }
}

/** Bir martalik sonli urug'dan (seed) ketma-ket, lekin izchil (reproducible) urug'lar seriyasi hosil qiladi. */
export function makeSeedSequence(seed: number): () => number {
  let n = 0;
  return () => seed + n++;
}

// ===================== Yaqinda to'g'ri javob berilganlarni chetlatish =====================

/**
 * Foydalanuvchi so'nggi `days` kun ichida TO'G'RI javob bergan itemlar id'sini
 * qaytaradi (`buildItemWhere`ga `excludeItemIds` sifatida beriladi). DB'ga
 * boradi — shu sababli item-picker.ts dagi qolgan (sof) funksiyalardan farqli,
 * testlanmaydi; xatti-harakati oddiy join, xatoga joy yo'q.
 *
 * Muhim chegara: hozircha savol javoblari faqat `TestResult.answers` (eski
 * `Question` jadvaliga ishora qiluvchi `questionId`) orqali yoziladi — Item
 * banki hali test topshirish oqimiga ulanmagan (`prisma/schema.prisma`dagi
 * Item modeli izohiga qarang). Shu sababli ikki manbadan qidiramiz:
 * (1) `questionId` to'g'ridan-to'g'ri Item.id bo'lishi mumkin — kelajakda
 * Item testlarga bevosita ulanganda avtomatik ishlay boshlaydi;
 * (2) `Item.legacyQuestionId` orqali — backfill qilingan itemlar uchun.
 * Item bank hozircha "yaqinda javob berilgan" ma'lumotini deyarli hech
 * qachon qamrab olmasligi mumkin (chunki hali unga bevosita javob
 * berilmagan) — bu funksiya shunga qaramay, mavjud ma'lumotdan foydalanadigan
 * eng to'g'ri variant.
 */
export async function getRecentlyCorrectItemIds(userId: string, days: number): Promise<string[]> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const results = await db.testResult.findMany({
    where: { userId, completedAt: { gte: cutoff } },
    select: { answers: true },
    orderBy: { completedAt: 'desc' },
    take: 500,
  });

  const correctQuestionIds = new Set<string>();
  for (const r of results) {
    const answers = r.answers as unknown as { questionId?: string; isCorrect?: boolean }[] | null;
    for (const a of answers || []) {
      if (a.questionId && a.isCorrect) correctQuestionIds.add(a.questionId);
    }
  }
  if (correctQuestionIds.size === 0) return [];

  const ids = Array.from(correctQuestionIds);
  const legacyItems = await db.item.findMany({
    where: { legacyQuestionId: { in: ids } },
    select: { id: true },
  });

  const excludeIds = new Set<string>(ids); // (1) — to'g'ridan-to'g'ri itemId bo'lishi ehtimoli
  for (const it of legacyItems) excludeIds.add(it.id); // (2) — legacy backfill orqali
  return Array.from(excludeIds);
}

/**
 * Foydalanuvchi KECHA (Asia/Tashkent kalendar kuni) NOTO'G'RI javob bergan
 * itemlar id'sini qaytaradi — konstruktordagi "Kechagi xatolarim" preseti
 * `spec.onlyItemIds` sifatida shuni ishlatadi (`where.id: { in: ... }`,
 * qarang `buildItemWhere`), shuning uchun bu yerda RAQAM emas, faqat
 * DB'da haqiqatan mavjud Item.id'lar qaytishi shart — aks holda `onlyItemIds`
 * xayoliy id'lar bilan to'lib, haqiqiy itemlar 200 limitidan siqilib chiqib
 * ketishi (yoki `questionCount` haqiqiy havzadan katta ko'rsatilishi)
 * mumkin edi.
 *
 * Shu sababli `getRecentlyCorrectItemIds`dan farqli (u yerda ikki bosqichli
 * to'plam — xom `questionId` + legacy topilganlar — chetlatish (`notIn`)
 * uchun ishlatilgani sababli xavfsiz), bu yerda BITTA so'rov bilan
 * to'g'ridan-to'g'ri Item jadvalidan (`id` YOKI `legacyQuestionId` orqali)
 * tasdiqlangan qatorlar olinadi.
 */
export async function getYesterdayIncorrectItemIds(userId: string): Promise<string[]> {
  const { start, end } = tashkentDayRangeUtc(1);
  const results = await db.testResult.findMany({
    where: { userId, completedAt: { gte: start, lt: end } },
    select: { answers: true },
    orderBy: { completedAt: 'desc' },
    take: 500,
  });

  const incorrectQuestionIds = new Set<string>();
  for (const r of results) {
    const answers = r.answers as unknown as { questionId?: string; isCorrect?: boolean }[] | null;
    for (const a of answers || []) {
      if (a.questionId && a.isCorrect === false) incorrectQuestionIds.add(a.questionId);
    }
  }
  if (incorrectQuestionIds.size === 0) return [];

  const ids = Array.from(incorrectQuestionIds);
  const items = await db.item.findMany({
    where: { OR: [{ id: { in: ids } }, { legacyQuestionId: { in: ids } }] },
    select: { id: true },
    take: 200, // parseItemSpec'dagi onlyItemIds chegarasi bilan mos — DB darajasida kesiladi, haqiqiy id'lar siqilib chiqmaydi
  });
  return items.map((it) => it.id);
}

// ===================== Havzadan tanlash (DB bilan) =====================

/**
 * `POST /api/items/search`dagi havza bo'shatish tsiklining aynan o'zi
 * (relaxation loop) — `POST /api/sessions` ham bir xil algoritm bilan
 * savol tanlaydi, shuning uchun bu yerda bir marta yozilgan. `items/search`
 * o'zining mavjud (sinovdan o'tgan) yo'lini alohida saqlaydi — bu funksiya
 * faqat yangi chaqiruvchilar uchun.
 */
export async function pickItemsForSpec(params: {
  spec: ItemSpec;
  limit: number;
  seed: number;
  excludeItemIds: string[];
}): Promise<{ ids: string[]; relaxed: RelaxationStep[] }> {
  const { spec, limit, seed, excludeItemIds } = params;

  const fetchCandidates = (s: ItemSpec): Promise<PickableItem[]> =>
    db.item.findMany({
      where: buildItemWhere(s, excludeItemIds),
      select: { id: true, templateId: true, difficulty: true },
    });

  const relaxed: RelaxationStep[] = [];
  let effectiveSpec = spec;
  let candidates = await fetchCandidates(effectiveSpec);

  while (candidates.length < limit) {
    const step = nextRelaxationStep(effectiveSpec, relaxed);
    if (!step) break;
    relaxed.push(step);

    const relaxedSpec = applyRelaxationStep(effectiveSpec, step);
    if (JSON.stringify(relaxedSpec) === JSON.stringify(effectiveSpec)) continue; // bo'shatish hech narsani o'zgartirmadi — keyingi qadamga o'tiladi

    effectiveSpec = relaxedSpec;
    candidates = await fetchCandidates(effectiveSpec);
  }

  const picked = pickItems(candidates, {
    limit,
    range: { min: effectiveSpec.difficultyMin ?? 1, max: effectiveSpec.difficultyMax ?? 5 },
    seedFn: makeSeedSequence(seed),
  });

  return { ids: picked.map((p) => p.id), relaxed };
}
