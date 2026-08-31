import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `db`ni to'liq soxta (fake) Item havzasi bilan almashtiramiz — real baza
 * kerak emas, lekin `pickItemsForSpec` (lib/item-picker.ts) ichidagi
 * `where` filtrlari (subjectId/difficulty/excludeIds) HAQIQIY mantiq bilan
 * qayta hosil qilinadi, shu sababli bu fayl `generateDtmOnlineExam` →
 * `createSessionFromSections` → `pickItemsForSpec` → `loadSessionItems`
 * zanjirini UCHIDAN-UCHIGA (`lib/sessions.ts` mock qilinmagan holda)
 * sinaydi — S18a'ning eng muhim talabi: ball ITEM ID bo'yicha to'g'ri
 * hisoblanishi savollar aralashtirilgandan keyin ham saqlanishi shu orqali
 * tasdiqlanadi.
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
const SUBJECT_NAMES: Record<string, { nameUz: string; nameRu: string; nameEn: string }> = {
  [SPECIALTY1.id]: { nameUz: SPECIALTY1.nameUz, nameRu: "Физика", nameEn: "Physics" },
  [SPECIALTY2.id]: { nameUz: SPECIALTY2.nameUz, nameRu: "Химия", nameEn: "Chemistry" },
  [MANDATORY[0].id]: { nameUz: MANDATORY[0].nameUz, nameRu: "Математика", nameEn: "Math" },
  [MANDATORY[1].id]: { nameUz: MANDATORY[1].nameUz, nameRu: "Родной язык", nameEn: "Native language" },
  [MANDATORY[2].id]: { nameUz: MANDATORY[2].nameUz, nameRu: "История", nameEn: "History" },
};

interface FakeItem {
  id: string;
  subjectId: string;
  difficulty: number;
  status: string;
  visibility: string;
}

/** Har fan uchun `perDifficulty` ta savol — har biri difficulty 1..5 bo'yicha teng taqsimlangan (bias fallback'ga tushmasligi uchun har qiyinlik darajasida yetarli zaxira). */
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

describe("generateDtmOnlineExam", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("90 savol, jami 189 ball, 30/30/10/10/10 taqsimot — savollar aralashtirilgandan keyin ham", async () => {
    wireHappyPathSubjects();
    const pool = buildItemPool([SPECIALTY1.id, SPECIALTY2.id, ...MANDATORY.map((s) => s.id)]);
    wireItemMocks(pool);

    const result = await generateDtmOnlineExam({
      userId: "user1",
      specialty1SubjectId: SPECIALTY1.id,
      specialty2SubjectId: SPECIALTY2.id,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.sessionId).toBe("dtm-session-1");
    expect(result.titleUz).toBe(`${DTM_TITLE_PREFIX}${SPECIALTY1.nameUz} + ${SPECIALTY2.nameUz}`);

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

    // ENG MUHIM: `toPresentedQuestions` savollarni ATAYLAB boshqa (yangi)
    // seed bilan qayta aralashtiradi — bu haqiqiy GET so'rovidagi tartibni
    // simulyatsiya qiladi. Har bir taqdim etilgan savolning balli, u qaysi
    // pozitsiyada turishidan qat'i nazar, `itemPoints` xaritasidagi bilan
    // (ITEM ID bo'yicha) mos kelishi shart — pozitsiya bo'yicha saqlangan
    // bo'lsa, shu tekshiruv (boshqa seed bilan) buzilardi.
    const items = await loadSessionItems(createArgs.itemIds, createArgs.spec.itemPoints);
    const shuffledDifferentSeed = toPresentedQuestions(items, 987654321);
    expect(shuffledDifferentSeed).toHaveLength(DTM_TOTAL_QUESTIONS);
    for (const q of shuffledDifferentSeed) {
      expect(q.points).toBeCloseTo(createArgs.spec.itemPoints[q.id], 9);
    }
    const shuffledTotal = shuffledDifferentSeed.reduce((sum, q) => sum + q.points, 0);
    expect(shuffledTotal).toBeCloseTo(DTM_MAX_SCORE, 5);
  });

  it("bitta majburiy fan bo'yicha havza yetarli bo'lmasa aniq xato qaytaradi", async () => {
    wireHappyPathSubjects();
    // Tarix uchun atigi 3 ta savol — kerakli 10 tadan kam.
    const pool = [
      ...buildItemPool([SPECIALTY1.id, SPECIALTY2.id, MANDATORY[0].id, MANDATORY[1].id]),
      { id: "sp-tar-1", subjectId: MANDATORY[2].id, difficulty: 1, status: "PUBLISHED", visibility: "PUBLIC" },
      { id: "sp-tar-2", subjectId: MANDATORY[2].id, difficulty: 2, status: "PUBLISHED", visibility: "PUBLIC" },
      { id: "sp-tar-3", subjectId: MANDATORY[2].id, difficulty: 1, status: "PUBLISHED", visibility: "PUBLIC" },
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
