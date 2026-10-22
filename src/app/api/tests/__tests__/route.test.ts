import { beforeEach, describe, expect, it, vi } from "vitest";

const { findManyTestMock, countTestMock, findManyCategoryMock } = vi.hoisted(() => ({
  findManyTestMock: vi.fn(),
  countTestMock: vi.fn(),
  findManyCategoryMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    test: {
      findMany: (...args: unknown[]) => findManyTestMock(...args),
      count: (...args: unknown[]) => countTestMock(...args),
    },
    testCategory: {
      findMany: (...args: unknown[]) => findManyCategoryMock(...args),
    },
  },
}));

vi.mock("@/lib/auth", () => ({ auth: vi.fn().mockResolvedValue(null) }));
vi.mock("@/lib/telegram-notify", () => ({ notifyViaTelegram: vi.fn() }));

import { NextRequest } from "next/server";
import { GET } from "../route";

// Bazadagi to'liq qator — yechim maydonlari va savollar bilan. Mock Prisma
// kabi `omit` va `include` ni qo'llaydi: route ularni noto'g'ri bersa,
// javobda pullik ma'lumot chiqib qoladi va pastdagi test yiqiladi.
const fullRow = {
  id: "t1",
  titleUz: "Kinematika",
  titleRu: null,
  titleEn: null,
  categoryId: "cat1",
  subjectId: "s1",
  isPublished: true,
  isFree: false,
  accessType: "premium",
  duration: 30,
  questionCount: 10,
  difficulty: 3,
  coverImage: null,
  writtenSolution: "\\frac{v^2}{2a} — pullik yechim",
  videoSolution: "https://youtu.be/secret",
  createdAt: "2026-10-01T00:00:00.000Z",
  subject: { nameUz: "Fizika", nameRu: "Физика", nameEn: "Physics", icon: null },
  questions: [{ id: "q1", text: "Savol matni", correctAnswer: "A" }],
};

type FindManyArgs = {
  omit?: Record<string, boolean>;
  include?: Record<string, unknown>;
};

function applyPrismaShape(row: Record<string, unknown>, args: FindManyArgs) {
  const relations = new Set(["subject", "questions", "results", "teacher"]);
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (args.omit?.[key]) continue;
    if (relations.has(key) && !args.include?.[key]) continue;
    out[key] = value;
  }
  return out;
}

async function callGet(query: string) {
  const request = new NextRequest(`http://localhost/api/tests${query}`);
  const response = await GET(request);
  return { status: response.status, data: await response.json() };
}

function lastFindManyArgs() {
  return findManyTestMock.mock.calls.at(-1)?.[0];
}

describe("GET /api/tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findManyTestMock.mockImplementation(async (args: FindManyArgs) => [applyPrismaShape(fullRow, args)]);
    countTestMock.mockResolvedValue(1);
    findManyCategoryMock.mockResolvedValue([{ id: "cat1" }, { id: "cat2" }]);
  });

  it("eski chaqiruv ?type= — where/orderBy/skip/take avvalgidek", async () => {
    const { status } = await callGet("?type=ATTESTATION");
    expect(status).toBe(200);
    expect(findManyCategoryMock).toHaveBeenCalledWith({ where: { type: "ATTESTATION" }, select: { id: true } });
    const args = lastFindManyArgs();
    expect(args.where).toEqual({ isPublished: true, categoryId: { in: ["cat1", "cat2"] } });
    expect(args.orderBy).toEqual({ createdAt: "desc" });
    expect(args.skip).toBe(0);
    expect(args.take).toBe(20);
  });

  it("eski chaqiruv ?subject= — avvalgidek", async () => {
    await callGet("?subject=s1");
    const args = lastFindManyArgs();
    expect(args.where).toEqual({ isPublished: true, subjectId: "s1" });
    expect(args.orderBy).toEqual({ createdAt: "desc" });
    expect(args.take).toBe(20);
    // type bo'lmasa kategoriya bo'yicha filtr so'rovi yo'q (kartadagi
    // maqsad belgisi uchun id bo'yicha so'rov — boshqa narsa).
    expect(findManyCategoryMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { type: expect.anything() } }),
    );
  });

  it("har testga kategoriya turi (maqsad belgisi) biriktiriladi", async () => {
    findManyCategoryMock.mockResolvedValue([{ id: "cat1", type: "ATTESTATION" }]);
    const { data } = await callGet("");
    expect(findManyCategoryMock).toHaveBeenCalledWith({
      where: { id: { in: ["cat1"] } },
      select: { id: true, type: true },
    });
    expect(data.tests[0].category).toEqual({ type: "ATTESTATION" });
  });

  it("mos kategoriyasi yo'q type — bo'sh ro'yxat (avvalgidek)", async () => {
    findManyCategoryMock.mockResolvedValue([]);
    const { data } = await callGet("?type=GRE");
    expect(data).toEqual({ tests: [], total: 0, page: 1, limit: 20 });
    expect(findManyTestMock).not.toHaveBeenCalled();
  });

  it("parametrsiz — barcha nashr etilgan testlar (Hammasi)", async () => {
    const { data } = await callGet("");
    expect(lastFindManyArgs().where).toEqual({ isPublished: true });
    expect(countTestMock).toHaveBeenCalledWith({ where: { isPublished: true } });
    expect(data.total).toBe(1);
  });

  it("q — test nomi (uz/ru/en) va fan nomi bo'yicha, registrga befarq", async () => {
    await callGet("?type=DTM&subject=s1&q=%20fizika%20");
    const where = lastFindManyArgs().where;
    expect(where.subjectId).toBe("s1");
    expect(where.categoryId).toEqual({ in: ["cat1", "cat2"] });
    expect(where.OR).toEqual([
      { titleUz: { contains: "fizika", mode: "insensitive" } },
      { titleRu: { contains: "fizika", mode: "insensitive" } },
      { titleEn: { contains: "fizika", mode: "insensitive" } },
      { subject: { nameUz: { contains: "fizika", mode: "insensitive" } } },
    ]);
  });

  it("bo'sh q filtr qo'shmaydi", async () => {
    await callGet("?q=%20%20");
    expect(lastFindManyArgs().where).toEqual({ isPublished: true });
  });

  it("sort=popular — yechilishlar soni, keyin yangilari", async () => {
    await callGet("?sort=popular");
    expect(lastFindManyArgs().orderBy).toEqual([{ results: { _count: "desc" } }, { createdAt: "desc" }]);
  });

  it("sahifalash: page/limit hisoblanadi, limit 50 bilan cheklanadi, xato qiymat standartga tushadi", async () => {
    await callGet("?page=3&limit=24");
    expect(lastFindManyArgs()).toMatchObject({ skip: 48, take: 24 });

    await callGet("?limit=1000");
    expect(lastFindManyArgs()).toMatchObject({ skip: 0, take: 50 });

    await callGet("?page=-2&limit=abc");
    expect(lastFindManyArgs()).toMatchObject({ skip: 0, take: 20 });
  });

  it("paywall: javobda savollar, yozma va video yechim yo'q", async () => {
    const { data } = await callGet("?type=ATTESTATION");
    expect(lastFindManyArgs().omit).toEqual({ writtenSolution: true, videoSolution: true });
    expect(lastFindManyArgs().include).not.toHaveProperty("questions");
    const [test] = data.tests;
    expect(test.id).toBe("t1");
    expect(test.subject.nameUz).toBe("Fizika");
    expect(test).not.toHaveProperty("questions");
    expect(test).not.toHaveProperty("writtenSolution");
    expect(test).not.toHaveProperty("videoSolution");
    expect(JSON.stringify(data)).not.toContain("pullik yechim");
  });
});
