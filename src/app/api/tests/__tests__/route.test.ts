import { beforeEach, describe, expect, it, vi } from "vitest";

const { findManyTestMock, countTestMock, findManyCategoryMock, subscriptionMock, purchaseMock, paymentMock, authMock, createTestMock } =
  vi.hoisted(() => ({
    createTestMock: vi.fn(),
    findManyTestMock: vi.fn(),
    countTestMock: vi.fn(),
    findManyCategoryMock: vi.fn(),
    subscriptionMock: vi.fn(),
    purchaseMock: vi.fn(),
    paymentMock: vi.fn(),
    authMock: vi.fn(),
  }));

vi.mock("@/lib/db", () => ({
  db: {
    test: {
      findMany: (...args: unknown[]) => findManyTestMock(...args),
      count: (...args: unknown[]) => countTestMock(...args),
      create: (...args: unknown[]) => createTestMock(...args),
    },
    teacher: { findUnique: () => Promise.resolve({ id: "teacher1" }) },
    subject: { findUnique: () => Promise.resolve({ categoryId: "cat1" }) },
    testCategory: {
      findMany: (...args: unknown[]) => findManyCategoryMock(...args),
    },
    userPermission: { findMany: async () => [] },
    subscription: { findMany: (...args: unknown[]) => subscriptionMock(...args) },
    purchase: { findMany: (...args: unknown[]) => purchaseMock(...args) },
    payment: { findMany: (...args: unknown[]) => paymentMock(...args) },
  },
}));

vi.mock("@/lib/auth", () => ({ auth: (...args: unknown[]) => authMock(...args) }));
vi.mock("@/lib/telegram-notify", () => ({ notifyViaTelegram: vi.fn() }));

import { NextRequest } from "next/server";
import { GET, POST } from "../route";

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
  questions: [
    {
      id: "q1",
      text: "Savol matni",
      options: ["Variant-maxfiy"],
      correctAnswer: "A-maxfiy",
      explanation: "Tushuntirish-maxfiy",
    },
  ],
};

// Pullik kontentning har bir bo'lagi — javob JSON'ida hech qaysi kalit ham,
// qiymat ham bo'lmasligi kerak.
const PAID_KEYS = ["questions", "text", "options", "correctAnswer", "explanation", "writtenSolution", "videoSolution"];
const PAID_VALUES = ["Savol matni", "Variant-maxfiy", "A-maxfiy", "Tushuntirish-maxfiy", "pullik yechim", "youtu.be/secret"];

function expectNoPaidContent(data: unknown) {
  const json = JSON.stringify(data);
  for (const key of PAID_KEYS) expect(json).not.toContain(`"${key}"`);
  for (const value of PAID_VALUES) expect(json).not.toContain(value);
}

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
  return { status: response.status, data: await response.json(), headers: response.headers };
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
    authMock.mockResolvedValue(null);
    subscriptionMock.mockResolvedValue([]);
    purchaseMock.mockResolvedValue([]);
    paymentMock.mockResolvedValue([]);
  });

  it("kategoriya javobini kutayotganda kirish konteksti parallel yuklanadi", async () => {
    authMock.mockResolvedValue({ user: { id: 'u1', role: 'USER' } });
    let release!: (value: { id: string; type: string }[]) => void;
    findManyCategoryMock.mockReturnValue(new Promise((resolve) => { release = resolve; }));
    const response = callGet('');
    try {
      await vi.waitFor(() => expect(subscriptionMock).toHaveBeenCalledTimes(1));
      expect(findManyCategoryMock).toHaveBeenCalledTimes(1);
    } finally { release([{ id: 'cat1', type: 'ATTESTATION' }]); }
    expect((await response).status).toBe(200);
    expect(findManyCategoryMock).toHaveBeenCalledTimes(1);
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

  it("noma'lum type — 400, bazaga so'rov yo'q (avval Prisma 500 berardi)", async () => {
    const { status } = await callGet("?type=FOO");
    expect(status).toBe(400);
    expect(findManyCategoryMock).not.toHaveBeenCalled();
    expect(findManyTestMock).not.toHaveBeenCalled();
  });

  it("kichik harfli type ham noma'lum — 400 (enum registrga sezgir)", async () => {
    expect((await callGet("?type=dtm")).status).toBe(400);
  });

  it("bo'sh ?type= — 200, filtrsiz (Hammasi)", async () => {
    const { status } = await callGet("?type=");
    expect(status).toBe(200);
    expect(lastFindManyArgs().where).toEqual({ isPublished: true });
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

  it("paywall: mehmon ham, kirgan foydalanuvchi ham savol matni/varianti/to'g'ri javobi/yechimini olmaydi", async () => {
    const guest = await callGet("");
    expect(guest.status).toBe(200);
    expectNoPaidContent(guest.data);

    authMock.mockResolvedValue({ user: { id: "u1", role: "USER" } });
    subscriptionMock.mockResolvedValue([{ plan: "PREMIUM", isActive: true, endDate: new Date("2099-01-01"), categoryId: null, subjectIds: [], product: null }]);
    const authed = await callGet("?type=ATTESTATION");
    expect(authed.status).toBe(200);
    expect(authed.data.tests[0].hasAccess).toBe(true);
    expectNoPaidContent(authed.data);
  });

  describe("hasAccess", () => {
    it.each([
      ["TEACHER_PLAN", [true, false]],
      ["PREMIUM", [false, true]],
    ] as const)("%s subscription: kategoriya turlari qayta so'ralmaydi", async (plan, expected) => {
      authMock.mockResolvedValue({ user: { id: "u1", role: "USER" } });
      findManyTestMock.mockImplementation(async (args: FindManyArgs) => [
        applyPrismaShape({ ...fullRow, categoryId: "att", accessType: "subscription" }, args),
        applyPrismaShape({ ...fullRow, id: "t2", categoryId: "dtm", accessType: "subscription" }, args),
      ]);
      findManyCategoryMock.mockResolvedValue([{ id: "att", type: "ATTESTATION" }, { id: "dtm", type: "DTM" }]);
      subscriptionMock.mockResolvedValue([{ plan, isActive: true, endDate: new Date("2099-01-01"), categoryId: null, subjectIds: [], product: null }]);
      const { status, data } = await callGet("");
      expect(status).toBe(200);
      expect(data.tests.map((t: { hasAccess: boolean }) => t.hasAccess)).toEqual(expected);
      expect(findManyCategoryMock).toHaveBeenCalledTimes(1);
      expect(findManyCategoryMock).toHaveBeenCalledWith({ where: { id: { in: ["att", "dtm"] } }, select: { id: true, type: true } });
    });

    const rows = [
      { ...fullRow, id: "free", isFree: true, accessType: "free" },
      { ...fullRow, id: "prem", accessType: "premium" },
      { ...fullRow, id: "paid", accessType: "paid", price: 15000 },
    ];

    beforeEach(() => {
      findManyTestMock.mockImplementation(async (args: FindManyArgs) => rows.map((r) => applyPrismaShape(r, args)));
    });

    it("kirmagan — bepul ochiq, qolgani yopiq, obuna/xarid so'rovi umuman yo'q", async () => {
      const { data, headers } = await callGet("");
      expect(data.tests.map((t: { id: string; hasAccess: boolean }) => [t.id, t.hasAccess])).toEqual([
        ["free", true],
        ["prem", false],
        ["paid", false],
      ]);
      expect(subscriptionMock).not.toHaveBeenCalled();
      expect(purchaseMock).not.toHaveBeenCalled();
      expect(paymentMock).not.toHaveBeenCalled();
      expect(headers.get("Cache-Control") ?? "").not.toMatch(/public/);
    });

    it("premium obunachi — premium ochiq, sotib olinmagan paid yopiq; javob shaxsiy va keshlanmaydi", async () => {
      authMock.mockResolvedValue({ user: { id: "u1", role: "USER" } });
      subscriptionMock.mockResolvedValue([{ plan: "PREMIUM", isActive: true, endDate: new Date("2099-01-01"), categoryId: null, subjectIds: [], product: null }]);
      const { data, headers } = await callGet("");
      expect(data.tests.map((t: { id: string; hasAccess: boolean }) => [t.id, t.hasAccess])).toEqual([
        ["free", true],
        ["prem", true],
        ["paid", false],
      ]);
      expect(subscriptionMock).toHaveBeenCalledTimes(1);
      expect(purchaseMock).toHaveBeenCalledWith({
        where: { userId: "u1", itemType: "test", itemId: { in: ["paid"] } },
        select: { itemId: true },
      });
      expect(headers.get("Cache-Control")).toBe("private, no-store");
    });

    it("javobda faqat boolean — obuna/xarid tafsilotlari yo'q", async () => {
      authMock.mockResolvedValue({ user: { id: "u1", role: "USER" } });
      subscriptionMock.mockResolvedValue([{ plan: "PREMIUM", isActive: true, endDate: new Date("2099-01-01"), categoryId: null, subjectIds: [], product: null }]);
      purchaseMock.mockResolvedValue([{ itemId: "paid" }]);
      const { data } = await callGet("");
      for (const t of data.tests) expect(typeof t.hasAccess).toBe("boolean");
      expect(data.tests.find((t: { id: string }) => t.id === "paid").hasAccess).toBe(true);
      const json = JSON.stringify(data);
      for (const leak of ["PREMIUM", "plan", "premium\":true", "purchasedTestIds", "subscription"]) {
        expect(json).not.toContain(leak);
      }
    });
  });
});

describe("POST /api/tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "user1", role: "TEACHER" } });
    createTestMock.mockResolvedValue({ id: "t-new", titleUz: "Attestatsiya" });
  });

  async function callPost(questions: unknown[], accessType?: string) {
    const request = new NextRequest("http://localhost/api/tests", {
      method: "POST",
      body: JSON.stringify({ titleUz: "Attestatsiya", subjectId: "s1", duration: 120, questions, accessType }),
    });
    return POST(request);
  }

  it("JSON importdagi section: teglari Question.tags ga yoziladi", async () => {
    const response = await callPost([
      { text: "a", correctAnswer: "A", tags: ["section:fizika", 5] },
      { text: "b", correctAnswer: "B" },
    ]);

    expect(response.status).toBe(201);
    const created = createTestMock.mock.calls[0][0].data.questions.create;
    expect(created.map((q: { tags: string[] }) => q.tags)).toEqual([["section:fizika"], []]);
  });

  it("subscription turi validatsiyadan o'tadi va saqlanadi", async () => {
    const response = await callPost([{ text: "a", correctAnswer: "A" }], "subscription");
    expect(response.status).toBe(201);
    expect(createTestMock.mock.calls[0][0].data.accessType).toBe("subscription");
  });

  it.each([-1, 1.5, '1000', 2147483648])('noto‘g‘ri narxni rad etadi: %s', async (price) => {
    const response = await POST(new NextRequest('http://localhost/api/tests', { method: 'POST', body: JSON.stringify({ titleUz: 'Test', subjectId: 's1', duration: 30, accessType: 'paid', price }) }));
    expect(response.status).toBe(400);
    expect(createTestMock).not.toHaveBeenCalled();
  });
});
