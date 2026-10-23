import { getQuestionSection, groupBySection, SECTION_KEYS, type SectionKey } from './question-sections';

// /attestation sahifasidagi "Sizning tayyorgarligingiz" paneli uchun sof
// hisob-kitoblar. Kirish ma'lumoti serverda (lib/attestation-page.ts)
// yig'iladi; bu yerda bazasiz va React'siz — Vitest bilan tekshiriladi.

export interface AnswerEntry {
  questionId: string;
  isCorrect: boolean;
}

export interface QuestionMeta {
  tags: unknown;
  topic: string | null;
}

export interface Tally {
  correct: number;
  total: number;
  /** 0–100, butun son. */
  percent: number;
}

export interface SectionStat extends Tally {
  key: SectionKey;
}

export interface TopicStat extends Tally {
  key: string;
  label: string;
}

/**
 * `TestResult.answers` (Json) dan faqat statistikaga keraklisi. Javob matni
 * va boshqa maydonlar ataylab tashlanadi — natija client'ga ketadigan
 * hech narsaga aralashmasin. Shakli buzuq yozuv jimgina o'tkazib yuboriladi.
 */
export function parseResultAnswers(json: unknown): AnswerEntry[] {
  if (!Array.isArray(json)) return [];
  const entries: AnswerEntry[] = [];
  for (const item of json) {
    if (typeof item !== 'object' || item === null) continue;
    const { questionId, isCorrect } = item as Record<string, unknown>;
    if (typeof questionId !== 'string' || typeof isCorrect !== 'boolean') continue;
    entries.push({ questionId, isCorrect });
  }
  return entries;
}

// Design doc: bo'lim nomi "Atom va yadro fizikasi", eski "Atom fizikasi" emas.
// Eski teglar ham yangi nom ostida bitta guruhga tushsin.
const TOPIC_ALIASES: Record<string, { key: string; label: string }> = {
  'atom fizikasi': { key: 'atom va yadro fizikasi', label: 'Atom va yadro fizikasi' },
};

function topicKey(text: string): string {
  return text.toLowerCase().replace(/['‘’ʻʼ`´]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * `Question.topic` erkin matn ("Mexanika: Kinematika") — fizika bo'limi
 * ":" dan oldingi qism. Kalit registr va apostrof turlariga befarq
 * (`topic-bridge.ts` dagi bilan bir xil sabab: ustozlar qo'lda yozadi).
 */
export function normalizeTopicHead(topic: string | null | undefined): { key: string; label: string } | null {
  if (!topic) return null;
  const head = topic.split(':')[0].replace(/\s+/g, ' ').trim();
  if (!head) return null;
  const key = topicKey(head);
  if (!key) return null;
  return TOPIC_ALIASES[key] ?? { key, label: head };
}

function tally(correct: number, total: number): Tally {
  return { correct, total, percent: total > 0 ? Math.round((correct / total) * 100) : 0 };
}

interface LatestLike {
  percentage: number;
}

/** Yechilganlar soni va oxirgi urinishlar bo'yicha o'rtacha foiz (yechilgan yo'q bo'lsa `null`). */
export function computeProgress(
  testIds: string[],
  latest: Map<string, LatestLike>,
): { solved: number; total: number; averagePercent: number | null } {
  const percents = testIds.flatMap((id) => {
    const r = latest.get(id);
    return r ? [r.percentage] : [];
  });
  const averagePercent =
    percents.length > 0 ? Math.round(percents.reduce((a, b) => a + b, 0) / percents.length) : null;
  return { solved: percents.length, total: testIds.length, averagePercent };
}

export type NextMock = { kind: 'next' | 'retakeLowest'; testId: string; number: number };

/**
 * Hero tugmasi. `tests` — ro'yxat tartibida (createdAt o'sish), `number` —
 * shu tartibdagi o'rin (1 dan), sarlavhadagi raqam emas. Hammasi yechilgan
 * bo'lsa — oxirgi urinishi eng past test; teng bo'lsa ro'yxatda oldingisi.
 */
export function pickNextMock(tests: { id: string }[], latest: Map<string, LatestLike>): NextMock | null {
  if (tests.length === 0) return null;
  const firstUnsolved = tests.findIndex((t) => !latest.has(t.id));
  if (firstUnsolved >= 0) return { kind: 'next', testId: tests[firstUnsolved].id, number: firstUnsolved + 1 };

  let lowest = 0;
  for (let i = 1; i < tests.length; i++) {
    if (latest.get(tests[i].id)!.percentage < latest.get(tests[lowest].id)!.percentage) lowest = i;
  }
  return { kind: 'retakeLowest', testId: tests[lowest].id, number: lowest + 1 };
}

/**
 * ATTESTATION kategoriyasidagi testlarni ikkiga ajratadi (migratsiyasiz,
 * S13 teglariga tayanib): **mock** — barcha savollarida `section:` tegi bor
 * test (`groupBySection` null emas), **mavzu testi** — qolganlari (bitta
 * bob, faqat fizika, tegsiz). Savolsiz test ham mavzu testi: bo'sh testni
 * mock deb ko'rsatish "50 savol" va'dasini buzardi. Kirish tartibi saqlanadi.
 */
export function classifyAttestationTests<T extends { id: string }>(
  tests: T[],
  questions: { testId: string; tags: unknown }[],
): { mocks: T[]; topics: T[] } {
  const byTest = new Map<string, { tags: unknown }[]>();
  for (const q of questions) {
    const list = byTest.get(q.testId) ?? [];
    list.push({ tags: q.tags });
    byTest.set(q.testId, list);
  }
  const mocks: T[] = [];
  const topics: T[] = [];
  for (const test of tests) {
    (groupBySection(byTest.get(test.id) ?? []) ? mocks : topics).push(test);
  }
  return { mocks, topics };
}

export type HeroTarget = {
  kind: 'mockNext' | 'mockRetake' | 'topicStart' | 'topicRetake';
  testId: string;
  /** Faqat mock uchun — "№N" ro'yxatdagi o'rin. Mavzu testida raqam yo'q. */
  number: number | null;
};

/**
 * Hero tugmasi. Mock bo'lsa — `pickNextMock` faqat mocklar ustida; mock
 * hali yo'q bo'lsa xuddi shu qoida mavzu testlari ustida (raqamsiz).
 */
export function pickHeroTarget(
  mocks: { id: string }[],
  topics: { id: string }[],
  latest: Map<string, LatestLike>,
): HeroTarget | null {
  if (mocks.length > 0) {
    const pick = pickNextMock(mocks, latest)!;
    return { kind: pick.kind === 'next' ? 'mockNext' : 'mockRetake', testId: pick.testId, number: pick.number };
  }
  const pick = pickNextMock(topics, latest);
  if (!pick) return null;
  return { kind: pick.kind === 'next' ? 'topicStart' : 'topicRetake', testId: pick.testId, number: null };
}

/**
 * Bo'limlar bo'yicha foiz. Faqat `section:` tegi bor savollar hisobga
 * olinadi; tegli javob umuman bo'lmasa `null` — panel bu qatorni chiqarmaydi.
 * Natija `SECTION_KEYS` tartibida, javobsiz bo'lim tushib qoladi.
 */
export function computeSectionStats(
  answerSets: AnswerEntry[][],
  meta: Map<string, QuestionMeta>,
): SectionStat[] | null {
  const counts = new Map<SectionKey, { correct: number; total: number }>();
  for (const answers of answerSets) {
    for (const a of answers) {
      const q = meta.get(a.questionId);
      const key = q ? getQuestionSection(q.tags) : null;
      if (!key) continue;
      const c = counts.get(key) ?? { correct: 0, total: 0 };
      c.total += 1;
      if (a.isCorrect) c.correct += 1;
      counts.set(key, c);
    }
  }
  if (counts.size === 0) return null;
  return SECTION_KEYS.filter((k) => counts.has(k)).map((key) => {
    const c = counts.get(key)!;
    return { key, ...tally(c.correct, c.total) };
  });
}

/** Topic'siz fizika javoblari shundan ko'p bo'lsa mavzu taqsimoti ishonchsiz. */
export const MAX_UNTOPICED_SHARE = 0.3;

/**
 * Fizika mavzulari (":" dan oldingi qism bo'yicha). Ikki manba:
 * mock'lardan faqat `section:fizika` savollar, mavzu testlaridan esa barcha
 * javoblar — ular faqat fizika va `section:` tegsiz.
 *
 * Topic'siz savollar ulushi `MAX_UNTOPICED_SHARE` dan oshsa `null`: qolgan
 * foizlar kichik, tasodifiy tanlanma bo'lib, chalg'itadi. Saralash — javoblar
 * soni bo'yicha kamayish, teng bo'lsa nom bo'yicha (barqaror tartib).
 */
export function computeTopicStats(
  sources: { mock: AnswerEntry[][]; topic: AnswerEntry[][] },
  meta: Map<string, QuestionMeta>,
): TopicStat[] | null {
  let physicsTotal = 0;
  let untopiced = 0;
  const groups = new Map<string, { label: string; correct: number; total: number }>();
  const physicsAnswers = [
    ...sources.mock.flatMap((answers) =>
      answers.flatMap((a) => {
        const q = meta.get(a.questionId);
        return q && getQuestionSection(q.tags) === 'fizika' ? [{ a, q }] : [];
      }),
    ),
    ...sources.topic.flatMap((answers) =>
      answers.flatMap((a) => {
        const q = meta.get(a.questionId);
        return q ? [{ a, q }] : [];
      }),
    ),
  ];
  for (const { a, q } of physicsAnswers) {
    physicsTotal += 1;
    const head = normalizeTopicHead(q.topic);
    if (!head) {
      untopiced += 1;
      continue;
    }
    const g = groups.get(head.key) ?? { label: head.label, correct: 0, total: 0 };
    g.total += 1;
    if (a.isCorrect) g.correct += 1;
    groups.set(head.key, g);
  }
  if (physicsTotal === 0 || untopiced / physicsTotal > MAX_UNTOPICED_SHARE) return null;
  return [...groups.entries()]
    .map(([key, g]) => ({ key, label: g.label, ...tally(g.correct, g.total) }))
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
}

export const WEAK_SPOT_MIN_ANSWERS = 10;

export interface WeakSpot {
  section: SectionKey;
  /** Zaif bo'lim fizika va mavzular ishonchli bo'lsa (yoki mock yo'q holatda). */
  topic: TopicStat | null;
  /** Ko'rsatiladigan foiz — mavzu bo'lsa mavzuniki, aks holda bo'limniki. */
  percent: number;
}

function lowest<T extends Tally>(items: T[], minAnswers: number): T | null {
  let best: T | null = null;
  for (const item of items) {
    if (item.total < minAnswers) continue;
    if (!best || item.percent < best.percent) best = item;
  }
  return best;
}

/**
 * Eng past bo'lim (kamida `minAnswers` javob bilan — kam javobda bitta
 * xato foizni keskin tushiradi). Teng bo'lsa `SECTION_KEYS` tartibida
 * oldingisi. Bo'lim fizika bo'lsa, xuddi shu qoida bilan eng past mavzu.
 *
 * Hech bir bo'limda `minAnswers` javob bo'lmasa (yoki bo'lim statistikasi
 * umuman yo'q — mock javobi yo'q), zaif joy to'g'ridan-to'g'ri eng past
 * fizika mavzusi: mavzu testlari faqat fizika, aks holda mock yetarlicha
 * yechilmaguncha karta chiqmasdi. `topics` ning o'zi 30% qoidasidan o'tgan
 * bo'lishi kerak (`computeTopicStats` ishonchsizda `null` qaytaradi).
 */
export function pickWeakSpot(
  sections: SectionStat[] | null,
  topics: TopicStat[] | null,
  minAnswers: number = WEAK_SPOT_MIN_ANSWERS,
): WeakSpot | null {
  const section = sections ? lowest(sections, minAnswers) : null;
  if (!section) {
    const topic = topics ? lowest(topics, minAnswers) : null;
    return topic ? { section: 'fizika', topic, percent: topic.percent } : null;
  }
  const topic = section.key === 'fizika' && topics ? lowest(topics, minAnswers) : null;
  return { section: section.key, topic, percent: topic?.percent ?? section.percent };
}

// Sozlama qo'lda (Neon SQL Editor) kiritiladi — "45 daqiqa" yoki "-1" kabi
// noto'g'ri qiymat raqam sifatida chiqib ketmasin, o'rniga qator yashirinsin.
export function parsePositiveInt(value: string | null | undefined): number | null {
  if (!value || !/^\d+$/.test(value.trim())) return null;
  const n = Number(value.trim());
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

export type MockFilter = 'all' | 'unsolved' | 'solved';

export function filterMocks<T extends { solved: boolean }>(rows: T[], filter: MockFilter): T[] {
  if (filter === 'all') return rows;
  return rows.filter((r) => r.solved === (filter === 'solved'));
}
