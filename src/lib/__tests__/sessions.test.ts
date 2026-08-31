import { beforeEach, describe, expect, it, vi } from "vitest";

const { itemFindManyMock, itemCountMock, testSessionCreateMock, consumeBuiltTestMock } = vi.hoisted(() => ({
  itemFindManyMock: vi.fn(),
  itemCountMock: vi.fn(),
  testSessionCreateMock: vi.fn(),
  consumeBuiltTestMock: vi.fn(),
}));

vi.mock("../db", () => ({
  db: {
    item: {
      findMany: (...args: unknown[]) => itemFindManyMock(...args),
      count: (...args: unknown[]) => itemCountMock(...args),
    },
    testSession: { create: (...args: unknown[]) => testSessionCreateMock(...args) },
  },
}));

vi.mock("../quota", () => ({
  consumeBuiltTest: (...args: unknown[]) => consumeBuiltTestMock(...args),
}));

import { createSessionFromSections, extractItemPoints, loadSessionItems, type SectionSpec } from "../sessions";

interface FakeItem {
  id: string;
  subjectId: string;
  difficulty: number;
  /** `topics.some.topic.path.startsWith` filtri shu maydonga tekshiriladi — qarang buildItemWhere (lib/item-picker.ts). */
  topicPath?: string;
}

function matchesWhere(item: FakeItem, where: Record<string, any>): boolean {
  if (where.subjectId?.in && !where.subjectId.in.includes(item.subjectId)) return false;
  if (where.difficulty) {
    if (where.difficulty.gte !== undefined && item.difficulty < where.difficulty.gte) return false;
    if (where.difficulty.lte !== undefined && item.difficulty > where.difficulty.lte) return false;
  }
  if (where.id?.notIn && where.id.notIn.includes(item.id)) return false;
  if (where.OR) {
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
      return Promise.resolve(
        rows.map((it) => ({
          id: it.id,
          text: `Savol ${it.id}`,
          images: [] as string[],
          options: [{ label: "A", text: "x", image: null }],
          correctAnswer: "A",
          type: "MULTIPLE_CHOICE",
          explanation: null,
          explanationImages: [] as string[],
          videoUrl: null,
          subject: { nameUz: it.subjectId, nameRu: it.subjectId, nameEn: it.subjectId },
        }))
      );
    }
    return Promise.resolve(rows.map((it) => ({ id: it.id, templateId: null, difficulty: it.difficulty })));
  });
  itemCountMock.mockImplementation(({ where }: { where: Record<string, any> }) =>
    Promise.resolve(pool.filter((it) => matchesWhere(it, where)).length)
  );
}

function buildPool(subjectId: string, count: number, difficulty = 3): FakeItem[] {
  return Array.from({ length: count }, (_, i) => ({ id: `${subjectId}-${i}`, subjectId, difficulty }));
}

function buildTopicPool(subjectId: string, topicPath: string, count: number, difficulty = 1): FakeItem[] {
  return Array.from({ length: count }, (_, i) => ({ id: `${subjectId}-${topicPath}-${i}`, subjectId, difficulty, topicPath }));
}

describe("extractItemPoints", () => {
  it("spec bo'sh yoki obyekt bo'lmasa undefined qaytaradi", () => {
    expect(extractItemPoints(undefined)).toBeUndefined();
    expect(extractItemPoints(null)).toBeUndefined();
    expect(extractItemPoints("x")).toBeUndefined();
    expect(extractItemPoints([])).toBeUndefined();
  });

  it("itemPoints maydoni yo'q spec (oddiy konstruktor ItemSpec'i) uchun undefined qaytaradi", () => {
    expect(extractItemPoints({ subjectIds: ["s1"], difficultyMin: 2 })).toBeUndefined();
  });

  it("itemPoints mavjud bo'lsa, faqat sonli qiymatlarni ajratib qaytaradi", () => {
    const spec = { sections: [], itemPoints: { item1: 3.1, item2: 2.1, item3: "noto'g'ri" as unknown } };
    expect(extractItemPoints(spec)).toEqual({ item1: 3.1, item2: 2.1 });
  });
});

describe("loadSessionItems", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("itemPoints berilmasa har savol 1 ball oladi", async () => {
    wireItemMocks(buildPool("subj1", 2));
    const items = await loadSessionItems(["subj1-0", "subj1-1"]);
    expect(items.map((q) => q.points)).toEqual([1, 1]);
  });

  it("itemPoints berilsa, har savol ITEM ID bo'yicha o'z balini oladi (xaritada yo'qlari 1 qoladi)", async () => {
    wireItemMocks(buildPool("subj1", 3));
    const items = await loadSessionItems(["subj1-0", "subj1-1", "subj1-2"], { "subj1-0": 3.1, "subj1-1": 2.1 });
    expect(items.find((q) => q.id === "subj1-0")?.points).toBe(3.1);
    expect(items.find((q) => q.id === "subj1-1")?.points).toBe(2.1);
    expect(items.find((q) => q.id === "subj1-2")?.points).toBe(1); // xaritada yo'q — standart
  });
});

describe("createSessionFromSections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testSessionCreateMock.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: "session1", ...data })
    );
  });

  const sections: SectionSpec[] = [
    { subjectId: "math", subjectName: "Matematika", count: 3, pointsPerQuestion: 2, bias: "advanced" },
    { subjectId: "hist", subjectName: "Tarix", count: 2, pointsPerQuestion: 1, bias: "easy" },
  ];

  it("har bo'limdan so'ralgan sonda savol yig'adi, ballarni ITEM ID bo'yicha to'g'ri saqlaydi", async () => {
    wireItemMocks([...buildPool("math", 10, 4), ...buildPool("hist", 10, 1)]);

    const outcome = await createSessionFromSections({
      userId: "user1",
      sections,
      durationMin: 60,
      mode: "FIXED",
      title: "Sinov sessiyasi",
      countsAgainstQuota: false,
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.session.questionCount).toBe(5);
    expect(outcome.relaxedSections).toEqual([]); // topicPaths berilmagan — bo'shatish umuman ishga tushmaydi
    expect(consumeBuiltTestMock).not.toHaveBeenCalled();

    const createArgs = testSessionCreateMock.mock.calls[0][0].data as {
      itemIds: string[];
      spec: { itemPoints: Record<string, number> };
    };
    const mathIds = createArgs.itemIds.filter((id) => id.startsWith("math-"));
    const histIds = createArgs.itemIds.filter((id) => id.startsWith("hist-"));
    expect(mathIds).toHaveLength(3);
    expect(histIds).toHaveLength(2);
    for (const id of mathIds) expect(createArgs.spec.itemPoints[id]).toBe(2);
    for (const id of histIds) expect(createArgs.spec.itemPoints[id]).toBe(1);
  });

  it("bitta fan ikki bo'limda ishtirok etsa, ikkalasi HAR XIL savol oladi (takrorlanmaydi)", async () => {
    // "math" ham advanced (3 ta), ham (boshqa bo'lim sifatida) easy (2 ta) —
    // xuddi DTM'da bir fan mutaxassislik VA majburiy bo'lishi mumkinligiga o'xshab.
    const overlapSections: SectionSpec[] = [
      { subjectId: "math", subjectName: "Matematika", count: 3, pointsPerQuestion: 3.1, bias: "advanced" },
      { subjectId: "math", subjectName: "Matematika", count: 2, pointsPerQuestion: 1.1, bias: "easy" },
    ];
    wireItemMocks(buildPool("math", 20, 3)); // difficulty=3 — advanced (3-5) ham, relaxation orqali easy (1-2) ham to'la oladi

    const outcome = await createSessionFromSections({
      userId: "user1",
      sections: overlapSections,
      durationMin: 60,
      mode: "FIXED",
      title: "Sinov",
      countsAgainstQuota: false,
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const createArgs = testSessionCreateMock.mock.calls[0][0].data as { itemIds: string[] };
    expect(createArgs.itemIds).toHaveLength(5);
    expect(new Set(createArgs.itemIds).size).toBe(5); // hech biri takrorlanmagan
  });

  it("topicPaths berilgan bo'lim mos mavzudan tanlaydi, mos kelmasa BUTUN fandan to'ldirib relaxedSections'da qayd etadi", async () => {
    const topicSections: SectionSpec[] = [
      { subjectId: "hist", subjectName: "Tarix", count: 5, pointsPerQuestion: 1, bias: "easy", topicPaths: ["uz-tarixi"] },
    ];

    // Faqat 2 ta "uz-tarixi" tegli (kerak — 5 ta), lekin fanning o'zida jami 8 ta bor.
    wireItemMocks([...buildTopicPool("hist", "uz-tarixi", 2), ...buildTopicPool("hist", "jahon-tarixi", 6)]);

    const outcome = await createSessionFromSections({
      userId: "user1",
      sections: topicSections,
      durationMin: 60,
      mode: "FIXED",
      title: "Sinov",
      countsAgainstQuota: false,
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.session.questionCount).toBe(5); // bo'lim baribir to'liq to'lgan
    expect(outcome.relaxedSections).toEqual(["Tarix"]); // jimgina emas — aniq qayd etilgan

    const createArgs = testSessionCreateMock.mock.calls[0][0].data as { itemIds: string[] };
    expect(createArgs.itemIds.some((id) => id.includes("jahon-tarixi"))).toBe(true); // faqat 2 ta uz-tarixi bor edi, qolgani albatta bo'shatilgandan keladi
  });

  it("topicPaths bilan havza (mavzu bo'shatilgandan keyin ham) yetarli bo'lmasa aniq xato qaytaradi", async () => {
    const topicSections: SectionSpec[] = [
      { subjectId: "hist", subjectName: "Tarix", count: 5, pointsPerQuestion: 1, bias: "easy", topicPaths: ["uz-tarixi"] },
    ];
    wireItemMocks(buildTopicPool("hist", "uz-tarixi", 2)); // jami fan havzasi ham 2 ta — bo'shatish qutqarmaydi

    const outcome = await createSessionFromSections({
      userId: "user1",
      sections: topicSections,
      durationMin: 60,
      mode: "FIXED",
      title: "Sinov",
      countsAgainstQuota: false,
    });

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.error).toMatchObject({ code: "SECTION_INSUFFICIENT_POOL", subjectName: "Tarix", available: 2, required: 5 });
  });

  it("bo'lim uchun havza yetarli bo'lmasa aniq xato qaytaradi va sessiya yaratmaydi", async () => {
    wireItemMocks([...buildPool("math", 1, 4), ...buildPool("hist", 10, 1)]); // math'da atigi 1 ta

    const outcome = await createSessionFromSections({
      userId: "user1",
      sections,
      durationMin: 60,
      mode: "FIXED",
      title: "Sinov",
      countsAgainstQuota: false,
    });

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.error).toEqual({
      status: 422,
      error: expect.stringContaining("Matematika"),
      code: "SECTION_INSUFFICIENT_POOL",
      subjectName: "Matematika",
      available: 1,
      required: 3,
    });
    expect(testSessionCreateMock).not.toHaveBeenCalled();
  });

  it("countsAgainstQuota: true bo'lsa kvota sarflanadi, kvota tugagan bo'lsa 429 va sessiya yaratmaydi", async () => {
    wireItemMocks([...buildPool("math", 10, 4), ...buildPool("hist", 10, 1)]);
    consumeBuiltTestMock.mockResolvedValue({ allowed: false, usedToday: 3, limit: 3 });

    const outcome = await createSessionFromSections({
      userId: "user1",
      sections,
      durationMin: 60,
      mode: "FIXED",
      title: "Sinov",
      countsAgainstQuota: true,
    });

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.error).toMatchObject({ status: 429, code: "BUILT_TEST_QUOTA_EXCEEDED" });
    expect(testSessionCreateMock).not.toHaveBeenCalled();
  });
});
