import 'server-only';
import type { Prisma } from '@prisma/client';
import { db } from './db';
import { loadTestAccessContext, resolveTestAccess } from './access';
import { getCardLinks, getCardState, getLockBadge, latestResultByTest, type BriefResult, type LockBadge } from './test-card';
import { resolveTopicNodes } from './topic-bridge';
import {
  classifyAttestationTests,
  computeProgress,
  computeSectionStats,
  computeTopicStats,
  normalizeTopicHead,
  parsePositiveInt,
  parseResultAnswers,
  pickHeroTarget,
  pickWeakSpot,
  type HeroTarget,
  type QuestionMeta,
  type SectionStat,
  type TopicStat,
} from './attestation-stats';
import type { SectionKey } from './question-sections';

// /attestation sahifasining barcha ma'lumoti — bitta joyda, so'rovlar soni
// testlar sonidan qat'i nazar o'zgarmas (N+1 yo'q).
//
// PAYWALL CHEGARASI: `TestResult.answers` va Question qatorlari faqat shu
// fayl ichida ishlatiladi. Qaytariladigan obyektda savol matni, variant,
// javob yoki savol id'si yo'q — faqat tayyor qatorlar va sonlar; client
// komponentlarga shu uzatiladi.

const SETTING_KEYS = ['attestation_date', 'attestation_duration_min', 'attestation_pass_score'] as const;

export interface AttestationSettings {
  /** `YYYY-MM-DD`; hisoblagich `daysUntil` orqali. */
  date: string | null;
  durationMin: number | null;
  passScore: number | null;
}

export interface MockRow {
  id: string;
  /** Mock ro'yxatidagi o'rin (createdAt o'sish tartibi), 1 dan; mavzu testida `null`. */
  number: number | null;
  title: string;
  questionCount: number;
  solved: boolean;
  lastScore: number | null;
  lastMax: number | null;
  lastPercent: number | null;
  primaryHref: string;
  /** Faqat yechilganda — natija sahifasi. */
  secondaryHref: string | null;
  locked: boolean;
  lockBadge: LockBadge;
}

export interface WeakSpotView {
  section: SectionKey;
  /** Fizika mavzusi (Question.topic dan, o'zbekcha erkin matn). */
  topicLabel: string | null;
  percent: number;
  href: string;
}

export interface Readiness {
  /** Mock hali yo'q bo'lsa progress mavzu testlari bo'yicha. */
  progressKind: 'mock' | 'topic';
  solved: number;
  total: number;
  averagePercent: number | null;
  sections: SectionStat[] | null;
  topics: { label: string; percent: number; total: number }[] | null;
  weakSpot: WeakSpotView | null;
}

export interface AttestationPageData {
  settings: AttestationSettings;
  mockRows: MockRow[];
  topicRows: MockRow[];
  hero: { kind: HeroTarget['kind']; number: number | null; href: string } | null;
  /** `null` — kirmagan foydalanuvchi. */
  readiness: Readiness | null;
}

function localizedTitle(test: { titleUz: string; titleRu: string | null; titleEn: string | null }, locale: string): string {
  // `||` ataylab: bo'sh satr ham tarjima yo'q degani (TestCard bilan bir xil).
  return (locale === 'ru' && test.titleRu) || (locale === 'en' && test.titleEn) || test.titleUz;
}

const TEST_SELECT = {
  id: true,
  titleUz: true,
  titleRu: true,
  titleEn: true,
  isFree: true,
  accessType: true,
  price: true,
  questionCount: true,
  subjectId: true,
} satisfies Prisma.TestSelect;

export async function loadAttestationPage(
  user: { id: string; role?: string } | null,
  locale: string,
): Promise<AttestationPageData> {
  const [categories, settingRows] = await Promise.all([
    db.testCategory.findMany({ where: { type: 'ATTESTATION' }, select: { id: true } }),
    db.systemSetting.findMany({ where: { key: { in: [...SETTING_KEYS] } }, select: { key: true, value: true } }),
  ]);
  const settingMap = new Map(settingRows.map((s) => [s.key, s.value]));
  const settings: AttestationSettings = {
    date: settingMap.get('attestation_date')?.trim() || null,
    durationMin: parsePositiveInt(settingMap.get('attestation_duration_min')),
    passScore: parsePositiveInt(settingMap.get('attestation_pass_score')),
  };

  // Test'da category relation yo'q — kategoriya id lari bo'yicha. Tartib
  // maydoni ham yo'q: createdAt o'sish (teng bo'lsa id — barqaror).
  const where: Prisma.TestWhereInput = {
    isPublished: true,
    categoryId: { in: categories.map((c) => c.id) },
  };
  const tests = categories.length
    ? await db.test.findMany({ where, select: TEST_SELECT, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] })
    : [];
  const testIds = tests.map((t) => t.id);

  // Tasniflash uchun teglar bitta so'rovda (N+1 yo'q). Faqat teg va mavzu —
  // matn, variant va to'g'ri javob tanlanmaydi.
  const [questions, results, accessContext] = testIds.length
    ? await Promise.all([
        db.question.findMany({
          where: { testId: { in: testIds } },
          select: { id: true, testId: true, tags: true, topic: true },
        }),
        user
          ? db.testResult.findMany({
              where: { userId: user.id, testId: { in: testIds } },
              select: { id: true, testId: true, score: true, maxScore: true, percentage: true, completedAt: true, answers: true },
            })
          : [],
        user ? loadTestAccessContext(user.id, user.role, tests) : null,
      ])
    : [[], [], null];

  const { mocks, topics: topicTests } = classifyAttestationTests(tests, questions);

  const brief: BriefResult[] = results.flatMap((r) =>
    r.testId
      ? [{ id: r.id, testId: r.testId, completedAt: r.completedAt.toISOString(), score: r.score, maxScore: r.maxScore, percentage: r.percentage }]
      : [],
  );
  const latest = latestResultByTest(brief);

  const toRow = (test: (typeof tests)[number], number: number | null): MockRow => {
    const result = latest.get(test.id);
    const state = getCardState(test, result, resolveTestAccess(test, accessContext));
    // Mehmon havolasi (login → solve) /tests kartasi bilan bitta qoidada.
    const links = getCardLinks(test.id, state, user ? undefined : { locale });
    return {
      id: test.id,
      number,
      title: localizedTitle(test, locale),
      questionCount: test.questionCount,
      solved: state.kind === 'solved',
      lastScore: result?.score ?? null,
      lastMax: result?.maxScore ?? null,
      lastPercent: result ? Math.round(result.percentage) : null,
      primaryHref: links.primary,
      secondaryHref: links.secondary ?? null,
      locked: state.kind === 'buy' || state.kind === 'upgrade',
      lockBadge: getLockBadge(test, state),
    };
  };
  const mockRows = mocks.map((test, index) => toRow(test, index + 1));
  const topicRows = topicTests.map((test) => toRow(test, null));

  const target = pickHeroTarget(mocks, topicTests, latest);
  const targetRow = target && [...mockRows, ...topicRows].find((r) => r.id === target.testId);
  const hero = target && targetRow ? { kind: target.kind, number: target.number, href: targetRow.primaryHref } : null;

  if (!user) return { settings, mockRows, topicRows, hero, readiness: null };

  const progressKind = mocks.length > 0 ? 'mock' : 'topic';
  const progress = computeProgress((progressKind === 'mock' ? mocks : topicTests).map((t) => t.id), latest);

  // Har test bo'yicha oxirgi urinish javoblari, mock va mavzu testi alohida.
  const resultById = new Map(results.map((r) => [r.id, r]));
  const latestAnswers = (list: { id: string }[]) =>
    list.flatMap((t) => {
      const last = latest.get(t.id);
      const full = last && resultById.get(last.id);
      return full ? [parseResultAnswers(full.answers)] : [];
    });
  const mockAnswers = latestAnswers(mocks);
  const topicAnswers = latestAnswers(topicTests);

  const meta = new Map<string, QuestionMeta>(questions.map((q) => [q.id, { tags: q.tags, topic: q.topic }]));
  // Bo'limlar faqat mock javoblaridan — mavzu testlarida `section:` tegi yo'q.
  const sections: SectionStat[] | null = mockAnswers.length ? computeSectionStats(mockAnswers, meta) : null;
  const topicStats: TopicStat[] | null =
    mockAnswers.length || topicAnswers.length ? computeTopicStats({ mock: mockAnswers, topic: topicAnswers }, meta) : null;

  let weakSpot: WeakSpotView | null = null;
  const spot = pickWeakSpot(sections, topicStats);
  if (spot) {
    weakSpot = {
      section: spot.section,
      topicLabel: spot.topic?.label ?? null,
      percent: spot.percent,
      href: spot.topic ? await buildHrefForTopic(spot.topic.key, questions, tests) : '/build',
    };
  }

  return {
    settings,
    mockRows,
    topicRows,
    hero,
    readiness: {
      progressKind,
      ...progress,
      sections,
      topics: topicStats?.map(({ label, percent, total }) => ({ label, percent, total })) ?? null,
      weakSpot,
    },
  };
}

/**
 * Zaif fizika mavzusi uchun /build havolasi: `s` — fan, `t` — TopicNode yo'li
 * (`buildStateFromParams`). Fizika daraxti ATTESTATION fanlari uchun ham seed
 * qilingan, lekin "Mexanika" tuguni topilmasa majburan taxmin qilinmaydi —
 * oddiy /build.
 */
async function buildHrefForTopic(
  topicKey: string,
  questions: { testId: string; topic: string | null }[],
  tests: { id: string; subjectId: string }[],
): Promise<string> {
  const sample = questions.find((q) => normalizeTopicHead(q.topic)?.key === topicKey);
  const subjectId = sample && tests.find((t) => t.id === sample.testId)?.subjectId;
  const head = sample?.topic?.split(':')[0].trim();
  if (!subjectId || !head) return '/build';
  const nodes = await resolveTopicNodes(subjectId, [head]);
  const node = nodes.get(head);
  if (!node) return '/build';
  const params = new URLSearchParams({ s: subjectId, t: node.path });
  return `/build?${params.toString()}`;
}
