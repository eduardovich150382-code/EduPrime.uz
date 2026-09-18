import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, findUniqueTestMock, transactionMock, updateTestMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  findUniqueTestMock: vi.fn(),
  transactionMock: vi.fn(),
  updateTestMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    test: {
      findUnique: (...args: unknown[]) => findUniqueTestMock(...args),
      update: (...args: unknown[]) => updateTestMock(...args),
    },
    $transaction: (fn: unknown, opts: unknown) => transactionMock(fn, opts),
  },
}));

vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));
vi.mock("@/lib/logger", () => ({ logger: { warn: vi.fn(), error: vi.fn() } }));

import { PUT } from "../route";

/**
 * Tranzaksiya ichidagi chaqiruvlar tartibini yozib boruvchi `tx`.
 * `calls` — qulf `findMany` dan OLDIN chaqirilganini tekshirish uchun.
 */
function buildTx(existing: { id: string }[]) {
  const calls: string[] = [];
  let created = 0;
  const tx = {
    $queryRaw: vi.fn((...args: unknown[]) => {
      calls.push("lock");
      void args;
      return Promise.resolve([{}]);
    }),
    question: {
      findMany: vi.fn(() => {
        calls.push("findMany");
        return Promise.resolve(existing);
      }),
      deleteMany: vi.fn((args: unknown) => {
        calls.push("deleteMany");
        void args;
        return Promise.resolve({ count: 0 });
      }),
      update: vi.fn((args: { where: { id: string }; data: { order: number } }) => {
        calls.push(`update:${args.where.id}`);
        return Promise.resolve({ id: args.where.id, order: args.data.order });
      }),
      create: vi.fn((args: { data: { order: number } }) => {
        calls.push("create");
        created += 1;
        return Promise.resolve({ id: `new-${created}`, order: args.data.order });
      }),
      count: vi.fn(() => {
        calls.push("count");
        return Promise.resolve(existing.length);
      }),
    },
    test: {
      update: vi.fn((args: unknown) => {
        calls.push("test.update");
        void args;
        return Promise.resolve({});
      }),
    },
  };
  return { tx, calls };
}

async function callPut(questions: unknown[], testId = "test1") {
  const request = new Request(`http://localhost/api/teacher/tests/${testId}/questions`, {
    method: "PUT",
    body: JSON.stringify({ questions, source: "create" }),
  });
  const response = await PUT(request as never, { params: Promise.resolve({ id: testId }) });
  return { response, body: await response.json() };
}

const validQuestion = (over: Record<string, unknown> = {}) => ({
  text: "2+2=?",
  options: [{ label: "A", text: "4" }],
  correctAnswer: "A",
  type: "MULTIPLE_CHOICE",
  points: 1,
  ...over,
});

/** Har testda `$transaction` mock'i `tx` ni callback'ga uzatadi. */
function runWith(tx: unknown) {
  transactionMock.mockImplementation((fn: (t: unknown) => Promise<unknown>) => fn(tx));
}

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ user: { id: "user1", role: "TEACHER" } });
  findUniqueTestMock.mockResolvedValue({ id: "test1", teacher: { userId: "user1" } });
});

describe("PUT /api/teacher/tests/[id]/questions", () => {
  it("mavjud ID larni faqat QULFDAN KEYIN o'qiydi", async () => {
    // Bu tartib butun 31→62 nuqsonining yuragi: qulfdan oldin o'qilsa,
    // ustma-ust tushgan ikki so'rov ham bo'sh ro'yxat ko'rib hammasini
    // qaytadan yaratadi.
    //
    // DIQQAT: bu test `$queryRaw` ni MOCK qiladi, shuning uchun qulf
    // so'rovining Postgres'da haqiqatan bajarilishini ISBOTLAMAYDI — mock
    // har qanday SQL'ni qabul qiladi. Bu yerda faqat CHAQIRUV TARTIBI
    // tekshiriladi. Qulfning o'zi ishlashini faqat haqiqiy bazada saqlab
    // ko'rish tasdiqlaydi (PR tavsifidagi qo'lda tekshirish).
    const { tx, calls } = buildTx([]);
    runWith(tx);

    await callPut([validQuestion()]);

    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(calls.indexOf("lock")).toBe(0);
    expect(calls.indexOf("lock")).toBeLessThan(calls.indexOf("findMany"));
    expect(calls.indexOf("findMany")).toBeLessThan(calls.indexOf("deleteMany"));
  });

  it("qulf kaliti test bo'yicha — boshqa testlarni saqlash kutib turmaydi", async () => {
    const { tx } = buildTx([]);
    runWith(tx);

    await callPut([validQuestion()], "test1");

    const values = tx.$queryRaw.mock.calls[0].slice(1);
    expect(values).toContain("test-questions:test1");
  });

  it("interaktiv tranzaksiya oshirilgan timeout bilan chaqiriladi", async () => {
    const { tx } = buildTx([]);
    runWith(tx);

    await callPut([validQuestion()]);

    expect(transactionMock.mock.calls[0][1]).toEqual({ maxWait: 10_000, timeout: 20_000 });
  });

  it("`id` bilan kelgan savolni YANGILAYDI, qaytadan yaratmaydi", async () => {
    const { tx } = buildTx([{ id: "q1" }]);
    runWith(tx);

    await callPut([validQuestion({ id: "q1" })]);

    expect(tx.question.update).toHaveBeenCalledTimes(1);
    expect(tx.question.update.mock.calls[0][0]).toMatchObject({ where: { id: "q1" } });
    expect(tx.question.create).not.toHaveBeenCalled();
  });

  it("`id` siz savolni yaratadi", async () => {
    const { tx } = buildTx([]);
    runWith(tx);

    await callPut([validQuestion()]);

    expect(tx.question.create).toHaveBeenCalledTimes(1);
    expect(tx.question.update).not.toHaveBeenCalled();
  });

  it("bazada yo'q `id` kelsa yaratadi (jimgina, xato bermaydi)", async () => {
    const { tx } = buildTx([{ id: "q1" }]);
    runWith(tx);

    const { response } = await callPut([validQuestion({ id: "begona-id" })]);

    expect(response.status).toBe(200);
    expect(tx.question.create).toHaveBeenCalledTimes(1);
    expect(tx.question.update).not.toHaveBeenCalled();
  });

  it("faqat kelmagan ID larni o'chiradi", async () => {
    const { tx } = buildTx([{ id: "q1" }, { id: "q2" }]);
    runWith(tx);

    await callPut([validQuestion({ id: "q1" })]);

    expect(tx.question.deleteMany.mock.calls[0][0]).toEqual({
      where: { testId: "test1", id: { notIn: ["q1"] } },
    });
  });

  it("hech qanday ID kelmasa hammasini o'chiradi", async () => {
    const { tx } = buildTx([{ id: "q1" }]);
    runWith(tx);

    await callPut([validQuestion()]);

    expect(tx.question.deleteMany.mock.calls[0][0]).toEqual({
      where: { testId: "test1", id: { notIn: ["__none__"] } },
    });
  });

  it("order har savolga ro'yxat tartibida beriladi", async () => {
    const { tx } = buildTx([]);
    runWith(tx);

    await callPut([validQuestion(), validQuestion({ text: "ikkinchi" })]);

    expect(tx.question.create.mock.calls.map((c) => c[0].data.order)).toEqual([0, 1]);
  });

  it("questionCount haqiqiy qator sonidan olinadi va tranzaksiya ICHIDA yoziladi", async () => {
    // Bitta savol yuborilgan, lekin bazada 3 qator bor — hisob
    // `questions.length` dan emas, bazadan olinishi kerak.
    const { tx, calls } = buildTx([{ id: "q1" }, { id: "q2" }, { id: "q3" }]);
    runWith(tx);

    await callPut([validQuestion({ id: "q1" })]);

    expect(tx.test.update).toHaveBeenCalledWith({
      where: { id: "test1" },
      data: { questionCount: 3 },
    });
    expect(calls).toContain("count");
    // Tranzaksiyadan tashqaridagi `db.test.update` endi ishlatilmaydi
    expect(updateTestMock).not.toHaveBeenCalled();
  });

  it("javobda savol ID lari `order` bilan qaytadi", async () => {
    const { tx } = buildTx([{ id: "q1" }]);
    runWith(tx);

    const { body } = await callPut([validQuestion({ id: "q1" }), validQuestion({ text: "yangi" })]);

    expect(body.questions).toEqual([
      { id: "q1", order: 0 },
      { id: "new-1", order: 1 },
    ]);
    expect(body.count).toBe(2);
  });

  it("begona ustozning testiga yozmaydi", async () => {
    findUniqueTestMock.mockResolvedValue({ id: "test1", teacher: { userId: "boshqa-user" } });

    const { response } = await callPut([validQuestion()]);

    expect(response.status).toBe(403);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("autentifikatsiyasiz so'rovni rad etadi", async () => {
    authMock.mockResolvedValue(null);

    const { response } = await callPut([validQuestion()]);

    expect(response.status).toBe(401);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("savollar massivi bo'lmasa 400 qaytaradi", async () => {
    const request = new Request("http://localhost/api/teacher/tests/test1/questions", {
      method: "PUT",
      body: JSON.stringify({ questions: "savol emas" }),
    });
    const response = await PUT(request as never, { params: Promise.resolve({ id: "test1" }) });

    expect(response.status).toBe(400);
    expect(transactionMock).not.toHaveBeenCalled();
  });
});
