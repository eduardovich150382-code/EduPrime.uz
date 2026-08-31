import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `db`ni to'liq soxta (fake) Item havzasi bilan almashtiramiz — real baza
 * kerak emas, lekin `pickItemsForSpec` (lib/item-picker.ts) ichidagi
 * `where` filtrlari (subjectId/difficulty/mavzu (`topics.some.topic.path`)/
 * excludeIds) HAQIQIY mantiq bilan qayta hosil qilinadi, shu sababli bu
 * fayl `generateDtmOnlineExam` → `createSessionFromSections` →
 * `pickItemsForSpec` → `loadSessionItems` zanjirini UCHIDAN-UCHIGA
 * (`lib/sessions.ts` mock qilinmagan holda) sinaydi — S18a'ning eng muhim
 * talabi: ball ITEM ID bo'yicha to'g'ri hisoblanishi savollar
 * aralashtirilgandan keyin ham saqlanishi shu orqali tasdiqlanadi.
 */
const { itemFindManyMock, itemCountMock, testSessionCreateMock, testCategoryFindFirstMock, subjectFindManyMock, subjectFindUniqueMock } =
  vi.hoisted(() => ({
    itemFindManyMock: vi.fn(),
    itemCountMock: vi.fn(),
    testSessionCreateMock: vi.fn(),
    testCategoryFindFirstMock: vi.fn(),
    subjectFindManyMock: vi.fn(),
    subjectFindUniqueMock: vi.fn(),
  }));

vi.mock("../db", () => ({
  db: {
    item: {
      findMany: (...args: unknown[]) => itemFindManyMock(...args),
      count: (...args: unknown[]) => itemCountMock(...args),
    },
    testSession: { create: (...args: unknown[]) => testSessionCreateMock(...args) },
    testCategory: { findFirst: (...args: unknown[]) => testCategoryFindFirstMock(...args) },
    subject: {
      findMany: (...args: unknown[]) => subjectFindManyMock(...args),
      findUnique: (...args: unknown[]) => subjectFindUniqueMock(...args),
    },
    // `createSessionFromSections` Question jadvaliga umuman tegmasligi
    // shart — mock berilmagani uchun, agar kod hali ham `db.question.*`
    // chaqirsa, "is not a function" bilan darhol yiqiladi (testlar orqali
    // "Question qatori yozilmagani" shu tarzda kafolatlanadi).
  },
}));

import {
  DTM_DURATION_MINUTES,
  DTM_MANDATORY_SUBJECTS,
  DTM_MAX_SCORE,
  DTM_TITLE_PREFIX,
  DTM_TOTAL_QUESTIONS,
  generateDtmOnlineExam,
} from "../dtm-online";
import { loadSessionItems, toPresentedQuestions } from "../sessions";

const CATEGORY_ID = "cat-dtm";
const SPECIALTY1 = { id: "sp-fizika", nameUz: "Fizika" };
const SPECIALTY2 = { id: "sp-kimyo", nameUz: "Kimyo" };
const MANDATORY = [
  { id: "sp-mat", nameUz: "Matematika" },
  { id: "sp-til", nameUz: "Ona tili va adabiyot" },
  { id: "sp-tar", nameUz: "Tarix" },
];
const [MAT, TIL, TAR] = MANDATORY;
const SUBJECT_NAMES: Record<string, { nameUz: string; nameRu: string; nameEn: string }> = {
  [SPECIALTY1.id]: { nameUz: SPECIALTY1.nameUz, nameRu: "Физика", nameEn: "Physics" },
  [SPECIALTY2.id]: { nameUz: SPECIALTY2.nameUz, nameRu: "Химия", nameEn: "Chemistry" },
  [MAT.id]: { nameUz: MAT.nameUz, nameRu: "Математика", nameEn: "Math" },
  [TIL.id]: { nameUz: TIL.nameUz, nameRu: "Родной язык", nameEn: "Native language" },
  [TAR.id]: { nameUz: TAR.nameUz, nameRu: "История", nameEn: "History" },
};

interface FakeItem {
  id: string;
  subjectId: string;
  difficulty: number;
  status: string;
  visibility: string;
  /** TopicNode.path — buildItemWhere'dagi `topics.some.topic.path.startsWith` filtri shu maydonga tekshiriladi (haqiqiy Item'da bu ItemTopic join orqali, bu yerda soddalashtirilgan). */
  topicPath?: string;
}

/** Har fan uchun `perDifficulty` ta savol — har biri difficulty 1..5 bo'yicha teng taqsimlangan (mavzu tegisiz — topicPaths berilmagan bo'limlar, yoki mavzu filtri butunlay bo'shatilgan holat uchun). */
function buildItemPool(subjectIds: string[], perDifficulty = 12): FakeItem[] {
  const pool: FakeItem[] = [];
  for (const subjectId of subjectIds) {
    for (let d = 1; d <= 5; d++) {
      for (let i = 0; i < perDifficulty; i++) {
        pool.push({ id: `${subjectId}-d${d}-${i}`, subjectId, difficulty: d, status: "PUBLISHED", visibility: "PUBLIC" });
      }
    }
  }
  return pool;
}

/** `topicPath` bilan belgilangan savollar — MANDATORY_TOPIC_PATHS filtriga mos/mos kelmasligini sinash uchun. Difficulty 1-2 (majburiy bo'limlar bias='easy' — qarang lib/sessions.ts biasToDifficultyRange) — asosiy havzaga to'g'ridan-to'g'ri tushishi uchun. */
function buildTopicTaggedItems(subjectId: string, topicPath: string, count: number): FakeItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${subjectId}-${topicPath}-${i}`,
    subjectId,
    difficulty: (i % 2) + 1, // 1 yoki 2 — 'easy' oralig'i (1-2) ichida
    status: "PUBLISHED",
    visibility: "PUBLIC",
    topicPath,
  }));
}

function matchesWhere(item: FakeItem, where: Record<string, any>): boolean {
  if (where.status && item.status !== where.status) return false;
  if (where.visibility && item.visibility !== where.visibility) return false;
  if (where.subjectId?.in && !where.subjectId.in.includes(item.subjectId)) return false;
  if (where.difficulty) {
    if (where.difficulty.gte !== undefined && item.difficulty < where.difficulty.gte) return false;
    if (where.difficulty.lte !== undefined && item.difficulty > where.difficulty.lte) return false;
  }
  if (where.id?.notIn && where.id.notIn.includes(item.id)) return false;
  if (where.id?.in && !where.id.in.includes(item.id)) return false;
  if (where.OR) {
    // buildItemWhere (lib/item-picker.ts) topicPaths'ni shu shaklga
    // aylantiradi: `OR: topicPaths.map((path) => ({ topics: { some: { topic: { path: { startsWith: path } } } } }))`.
    const matchesAnyPath = (where.OR as any[]).some((clause) => {
      const startsWith = clause?.topics?.some?.topic?.path?.startsWith;
      return typeof startsWith === "string" && !!item.topicPath && item.topicPath.startsWith(startsWith);
    });
    if (!matchesAnyPath) return false;
  }
  return true;
}

function wireItemMocks(pool: FakeItem[]) {
  itemFindManyMock.mockImplementation(({ where, select }: { where: Record<string, any>; select?: Record<string, unknown> }) => {
    const rows = pool.filter((it) => matchesWhere(it, where));
    if (select && "text" in select) {
      // loadSessionItems'dagi to'liq (correctAnswer bilan) select — sinov
      // uchun minimal, lekin haqiqiy shakldagi savol matnini qaytaradi.
      return Promise.resolve(
        rows.map((it) => ({
          id: it.id,
          text: `Savol ${it.id}`,
          images: [] as string[],
          options: [{ label: "A", text: "to'g'ri", image: null }, { label: "B", text: "noto'g'ri", image: null }],
          correctAnswer: "A",
          type: "MULTIPLE_CHOICE",
          explanation: null,
          explanationImages: [] as string[],
          videoUrl: null,
          subject: SUBJECT_NAMES[it.subjectId],
        }))
      );
    }
    // pickItemsForSpec'dagi nomzod select'i — {id, templateId, difficulty}
    return Promise.resolve(rows.map((it) => ({ id: it.id, templateId: null, difficulty: it.difficulty })));
  });
  itemCountMock.mockImplementation(({ where }: { where: Record<string, any> }) =>
    Promise.resolve(pool.filter((it) => matchesWhere(it, where)).length)
  );
}

function wireHappyPathSubjects() {
  testCategoryFindFirstMock.mockResolvedValue({ id: CATEGORY_ID });
  subjectFindManyMock.mockResolvedValue(MANDATORY);
  subjectFindUniqueMock.mockImplementation(({ where }: { where: { id: string } }) => {
    if (where.id === SPECIALTY1.id) return Promise.resolve(SPECIALTY1);
    if (where.id === SPECIALTY2.id) return Promise.resolve(SPECIALTY2);
    return Promise.resolve(null);
  });
  testSessionCreateMock.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
    Promise.resolve({ id: "dtm-session-1", ...data })
  );
}

/** Baxtli yo'l uchun to'liq havza — majburiy Tarix/Ona tili bo'limlari o'z mavzu filtriga (topicPaths) ANIQ mos keladigan yetarli savolga ega, shuning uchun bo'shatish (relaxation) ISHGA TUSHMAYDI — bu topic filtri haqiqatan qo'llanilishini isbotlaydi. */
function buildFullyTaggedPool(): FakeItem[] {
  return [
    ...buildItemPool([SPECIALTY1.id, SPECIALTY2.id]), // mutaxassislik — mavzu filtri yo'q
    ...buildItemPool([MAT.id]), // Matematika majburiy — mavzu filtri yo'q (MANDATORY_TOPIC_PATHS'da yo'q)
    ...buildTopicTaggedItems(TIL.id, "ona-tili", 15),
    ...buildTopicTaggedItems(TIL.id, "adabiyot", 15), // filtrga mos kelmaydi — chetlab o'tilishi kerak
    ...buildTopicTaggedItems(TAR.id, "ozbekiston-tarixi", 15),
    ...buildTopicTaggedItems(TAR.id, "jahon-tarixi", 15), // filtrga mos kelmaydi
  ];
}

describe("generateDtmOnlineExam", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("90 savol, jami 189 ball, 30/30/10/10/10 taqsimot — savollar aralashtirilgandan keyin ham", async () => {
    wireHappyPathSubjects();
    wireItemMocks(buildFullyTaggedPool());

    const result = await generateDtmOnlineExam({
      userId: "user1",
      specialty1SubjectId: SPECIALTY1.id,
      specialty2SubjectId: SPECIALTY2.id,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.sessionId).toBe("dtm-session-1");
    expect(result.titleUz).toBe(`${DTM_TITLE_PREFIX}${SPECIALTY1.nameUz} + ${SPECIALTY2.nameUz}`);
    // Havza mavzu filtriga to'g'ridan-to'g'ri yetarli edi — hech qanday bo'lim bo'shatilmagan.
    expect(result.relaxedSections).toEqual([]);

    // Yaratilgan sessiyaga uzatilgan xom `data` — itemIds va itemPoints shu yerda tekshiriladi.
    expect(testSessionCreateMock).toHaveBeenCalledTimes(1);
    const createArgs = testSessionCreateMock.mock.calls[0][0].data as {
      itemIds: string[];
      spec: { sections: unknown[]; itemPoints: Record<string, number> };
      durationMin: number;
    };
    expect(createArgs.itemIds).toHaveLength(DTM_TOTAL_QUESTIONS);
    expect(new Set(createArgs.itemIds).size).toBe(DTM_TOTAL_QUESTIONS); // takrorlanish yo'q
    expect(createArgs.durationMin).toBe(DTM_DURATION_MINUTES);

    // Majburiy Tarix/Ona tili bo'limlariga faqat mos mavzuli item'lar tushgani — "adabiyot"/"jahon-tarixi" tegli item'lar tanlanmagan.
    const tarIds = createArgs.itemIds.filter((id) => id.startsWith(`${TAR.id}-`));
    const tilIds = createArgs.itemIds.filter((id) => id.startsWith(`${TIL.id}-`));
    expect(tarIds.every((id) => id.includes("ozbekiston-tarixi"))).toBe(true);
    expect(tilIds.every((id) => id.includes("ona-tili"))).toBe(true);

    const totalFromItemPoints = Object.values(createArgs.spec.itemPoints).reduce((a, b) => a + b, 0);
    expect(totalFromItemPoints).toBeCloseTo(DTM_MAX_SCORE, 5);

    const byPoints = (p: number) => Object.values(createArgs.spec.itemPoints).filter((v) => Math.abs(v - p) < 1e-9).length;
    expect(byPoints(3.1)).toBe(30);
    expect(byPoints(2.1)).toBe(30);
    expect(byPoints(1.1)).toBe(30); // 3 majburiy fan x 10

    // `Question` jadvaliga hech qanday yozuv qilinmagani — db.question mock
    // berilmagan, shu sababli chaqirilgan bo'lsa yuqoridagi bosqichlarning
    // birortasida allaqachon xato bilan yiqilardi.
    expect(createArgs.spec.sections).toHaveLength(5);

    // ENG MUHIM: `toPresentedQuestions`ga ATAYLAB boshqa (yangi) seed va
    // `preserveOrder: true` beriladi — haqiqiy GET so'rovi shu ikkalasini
    // ishlatadi (DTM sessiyasida `spec.sections` bor, qarang
    // `sessionPreserveOrder`, bo'lim tartibi saqlanadi, faqat variantlar
    // aralashtiriladi). Har bir taqdim etilgan savolning balli, u qaysi
    // pozitsiyada turishidan qat'i nazar, `itemPoints` xaritasidagi bilan
    // (ITEM ID bo'yicha) mos kelishi shart — pozitsiya bo'yicha saqlangan
    // bo'lsa, shu tekshiruv (boshqa seed bilan) buzilardi.
    const items = await loadSessionItems(createArgs.itemIds, createArgs.spec.itemPoints);
    const shuffledDifferentSeed = toPresentedQuestions(items, 987654321, true);
    expect(shuffledDifferentSeed).toHaveLength(DTM_TOTAL_QUESTIONS);
    for (const q of shuffledDifferentSeed) {
      expect(q.points).toBeCloseTo(createArgs.spec.itemPoints[q.id], 9);
    }
    const shuffledTotal = shuffledDifferentSeed.reduce((sum, q) => sum + q.points, 0);
    expect(shuffledTotal).toBeCloseTo(DTM_MAX_SCORE, 5);
  });

  it("majburiy Tarix bo'limi 'ozbekiston-tarixi' topicPaths bilan so'raladi (spec tekshiruvi)", async () => {
    wireHappyPathSubjects();
    wireItemMocks(buildFullyTaggedPool());

    await generateDtmOnlineExam({
      userId: "user1",
      specialty1SubjectId: SPECIALTY1.id,
      specialty2SubjectId: SPECIALTY2.id,
    });

    const tarixCandidateCalls = itemFindManyMock.mock.calls.filter((args: any[]) => {
      const { where, select } = args[0];
      const isCandidateQuery = !select || !("text" in select); // {id, templateId, difficulty} tanlovi — pickItemsForSpec
      return isCandidateQuery && where?.subjectId?.in?.length === 1 && where.subjectId.in[0] === TAR.id && where.OR;
    });
    expect(tarixCandidateCalls.length).toBeGreaterThan(0);
    const { where } = tarixCandidateCalls[0][0];
    expect(where.OR).toEqual([{ topics: { some: { topic: { path: { startsWith: "ozbekiston-tarixi" } } } } }]);

    // Mutaxassislik (Fizika) bo'limida esa mavzu filtri UMUMAN berilmagan.
    const fizikaCandidateCalls = itemFindManyMock.mock.calls.filter((args: any[]) => {
      const { where, select } = args[0];
      const isCandidateQuery = !select || !("text" in select);
      return isCandidateQuery && where?.subjectId?.in?.length === 1 && where.subjectId.in[0] === SPECIALTY1.id;
    });
    expect(fizikaCandidateCalls.length).toBeGreaterThan(0);
    expect(fizikaCandidateCalls[0][0].where.OR).toBeUndefined();
  });

  it("mavzuga mos savol yetmasa zaxira yo'l ishga tushadi, bo'lim to'liq to'ladi va relaxedSections'da qayd etiladi", async () => {
    wireHappyPathSubjects();
    // Tarix: "ozbekiston-tarixi" tegli atigi 4 ta (kerak — 10 ta), lekin
    // "jahon-tarixi" bilan birga havzada yetarli (16 ta) — zaxira yo'l
    // ishga tushib, tor filtr olib tashlanishi kerak.
    const pool = [
      ...buildItemPool([SPECIALTY1.id, SPECIALTY2.id]),
      ...buildItemPool([MAT.id]),
      ...buildTopicTaggedItems(TIL.id, "ona-tili", 15), // Ona tili yetarli — bo'shatilmasligi kerak
      ...buildTopicTaggedItems(TAR.id, "ozbekiston-tarixi", 4),
      ...buildTopicTaggedItems(TAR.id, "jahon-tarixi", 12),
    ];
    wireItemMocks(pool);

    const result = await generateDtmOnlineExam({
      userId: "user1",
      specialty1SubjectId: SPECIALTY1.id,
      specialty2SubjectId: SPECIALTY2.id,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Jimgina kengaymagan — aniq qayd etilgan, faqat Tarix (Ona tili yetarli edi).
    expect(result.relaxedSections).toEqual(["Tarix"]);

    const createArgs = testSessionCreateMock.mock.calls[0][0].data as { itemIds: string[] };
    const tarIds = createArgs.itemIds.filter((id) => id.startsWith(`${TAR.id}-`));
    expect(tarIds).toHaveLength(10); // bo'lim baribir TO'LIQ to'lgan
    // Bo'shatilgandan keyin "jahon-tarixi" tegli item'lar ham kirishi mumkin.
    expect(tarIds.some((id) => id.includes("jahon-tarixi"))).toBe(true);
  });

  it("bitta majburiy fan bo'yicha havza (mavzu filtrisiz ham) yetarli bo'lmasa aniq xato qaytaradi", async () => {
    wireHappyPathSubjects();
    // Tarix uchun atigi 3 ta savol (hech qanday mavzu tegisiz) — kerakli 10 tadan kam, zaxira yo'l ham qutqarmaydi.
    const pool = [
      ...buildItemPool([SPECIALTY1.id, SPECIALTY2.id, MAT.id]),
      ...buildTopicTaggedItems(TIL.id, "ona-tili", 15),
      { id: "sp-tar-1", subjectId: TAR.id, difficulty: 1, status: "PUBLISHED", visibility: "PUBLIC" },
      { id: "sp-tar-2", subjectId: TAR.id, difficulty: 2, status: "PUBLISHED", visibility: "PUBLIC" },
      { id: "sp-tar-3", subjectId: TAR.id, difficulty: 1, status: "PUBLISHED", visibility: "PUBLIC" },
    ];
    wireItemMocks(pool);

    const result = await generateDtmOnlineExam({
      userId: "user1",
      specialty1SubjectId: SPECIALTY1.id,
      specialty2SubjectId: SPECIALTY2.id,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toEqual({
      code: "INSUFFICIENT_POOL",
      subjectName: "Tarix",
      available: 3,
      required: 10,
    });
    expect(testSessionCreateMock).not.toHaveBeenCalled();
  });

  it("DTM kategoriyasi topilmasa CATEGORY_NOT_FOUND qaytaradi", async () => {
    testCategoryFindFirstMock.mockResolvedValue(null);

    const result = await generateDtmOnlineExam({
      userId: "user1",
      specialty1SubjectId: SPECIALTY1.id,
      specialty2SubjectId: SPECIALTY2.id,
    });

    expect(result).toEqual({ ok: false, error: { code: "CATEGORY_NOT_FOUND" } });
    expect(subjectFindManyMock).not.toHaveBeenCalled();
  });

  it("majburiy fanlardan biri (masalan Tarix) tizimda topilmasa MANDATORY_SUBJECT_MISSING qaytaradi", async () => {
    testCategoryFindFirstMock.mockResolvedValue({ id: CATEGORY_ID });
    subjectFindManyMock.mockResolvedValue(MANDATORY.filter((s) => s.nameUz !== "Tarix"));
    subjectFindUniqueMock.mockImplementation(({ where }: { where: { id: string } }) => {
      if (where.id === SPECIALTY1.id) return Promise.resolve(SPECIALTY1);
      if (where.id === SPECIALTY2.id) return Promise.resolve(SPECIALTY2);
      return Promise.resolve(null);
    });

    const result = await generateDtmOnlineExam({
      userId: "user1",
      specialty1SubjectId: SPECIALTY1.id,
      specialty2SubjectId: SPECIALTY2.id,
    });

    expect(result).toEqual({ ok: false, error: { code: "MANDATORY_SUBJECT_MISSING", subjectName: "Tarix" } });
  });

  it("DTM_MANDATORY_SUBJECTS — 3 ta majburiy fan o'zgarmagan", () => {
    expect(DTM_MANDATORY_SUBJECTS).toEqual(["Matematika", "Ona tili va adabiyot", "Tarix"]);
  });
});
