import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireTeacherMock,
  findTeacherMock,
  findJobMock,
  findDraftsMock,
  countDraftMock,
  updateDraftMock,
  transactionMock,
  infoMock,
  errorMock,
} = vi.hoisted(() => ({
  requireTeacherMock: vi.fn(),
  findTeacherMock: vi.fn(),
  findJobMock: vi.fn(),
  findDraftsMock: vi.fn(),
  countDraftMock: vi.fn(),
  updateDraftMock: vi.fn(),
  transactionMock: vi.fn(),
  infoMock: vi.fn(),
  errorMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    teacher: { findUnique: (...a: unknown[]) => findTeacherMock(...a) },
    importJob: { findUnique: (...a: unknown[]) => findJobMock(...a) },
    importDraft: {
      findMany: (...a: unknown[]) => findDraftsMock(...a),
      count: (...a: unknown[]) => countDraftMock(...a),
      update: (...a: unknown[]) => updateDraftMock(...a),
    },
    $transaction: (...a: unknown[]) => transactionMock(...a),
  },
}));
vi.mock("@/lib/api-auth", () => ({ requireTeacher: () => requireTeacherMock() }));
vi.mock("@/lib/logger", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/logger")>();
  return { ...actual, logger: { info: (...a: unknown[]) => infoMock(...a), warn: vi.fn(), error: (...a: unknown[]) => errorMock(...a) } };
});

import { NextRequest } from "next/server";
import { GET } from "../route";

const JOB = "job-1";
const ID_A = "cmu2gfe670005lc0438g6uky5";

interface DraftRow {
  id: string;
  order: number;
  textOriginal: string;
  text: string;
  optionsOriginal: unknown;
  raw: Record<string, unknown>;
}

function draft(order: number, raw: Record<string, unknown> = {}, overrides: Partial<DraftRow> = {}): DraftRow {
  return {
    id: `d${order}`,
    order,
    textOriginal: `${order + 1}. Savol matni`,
    text: `${order + 1}. Savol matni`,
    optionsOriginal: [],
    raw: { stage: "BLOCK", images: [], notQuestion: false, ...raw },
    ...overrides,
  };
}

function call(query = ""): Promise<Response> {
  const request = new NextRequest(`http://localhost/api/teacher/import/job-1/export${query}`);
  return GET(request, { params: Promise.resolve({ jobId: JOB }) }) as unknown as Promise<Response>;
}

function setup(rows: DraftRow[], remaining = rows.length) {
  requireTeacherMock.mockResolvedValue({ user: { id: "u1" }, error: null });
  findTeacherMock.mockResolvedValue({ id: "t1" });
  findJobMock
    .mockResolvedValueOnce({ id: JOB, teacherId: "t1", status: "PARSING", pageCount: 1, blockCount: rows.length, pagesDone: [1] })
    .mockResolvedValueOnce({ sourceLang: "tr", targetLang: "uz", subject: { nameUz: "Fizika" } });
  countDraftMock.mockResolvedValue(remaining);
  findDraftsMock.mockResolvedValue(rows);
}

/** `findMany` ga uzatilgan argumentlar. */
function findArgs(): { where: Record<string, unknown>; take: number; skip?: number } {
  return findDraftsMock.mock.calls[0][0];
}

beforeEach(() => {
  vi.clearAllMocks();
  updateDraftMock.mockImplementation((args: unknown) => args);
  transactionMock.mockResolvedValue([]);
});

describe("GET /api/teacher/import/[jobId]/export", () => {
  it("savollarni ### <order> sarlavhasi bilan beradi", async () => {
    setup([draft(0), draft(1)]);

    const res = await call();
    const text = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/markdown; charset=utf-8");
    expect(text).toBe("### 0\n1. Savol matni\n\n### 1\n2. Savol matni");
  });

  it("faqat BLOCK va yiqilgan bosqichlar tanlanadi", async () => {
    setup([draft(0)]);
    await call();

    expect(findArgs().where).toMatchObject({
      jobId: JOB,
      OR: [
        { raw: { path: ["stage"], equals: "BLOCK" } },
        { raw: { path: ["stage"], equals: "STRUCTURE_FAILED" } },
        { raw: { path: ["stage"], equals: "TRANSLATE_FAILED" } },
      ],
    });
  });

  it("notQuestion blok chatga chiqmaydi", async () => {
    setup([draft(0, { notQuestion: true }), draft(1)]);

    const text = await (await call()).text();

    expect(text).toBe("### 1\n2. Savol matni");
  });

  it("qismlarga bo'lish KURSOR bilan — skip ishlatilmaydi", async () => {
    // `skip` bilan bo'lmaydi: `apply` draftlarni READY ga o'tkazib filtrdan
    // chiqaradi va o'rtadagi savollar jimgina tashlab ketilardi.
    setup([draft(51)], 70);
    await call("?after=50&size=10");

    expect(findArgs().where).toMatchObject({ order: { gt: 50 } });
    expect(findArgs().take).toBe(10);
    expect(findArgs().skip).toBeUndefined();
  });

  it("after berilmasa boshidan o'qiydi", async () => {
    setup([draft(0)]);
    await call();

    expect(findArgs().where.order).toBeUndefined();
    expect(findArgs().take).toBe(50);
  });

  it("size chegaralanadi va noto'g'ri qiymat standartga tushadi", async () => {
    setup([draft(0)]);
    await call("?size=9999");
    expect(findArgs().take).toBe(200);

    vi.clearAllMocks();
    transactionMock.mockResolvedValue([]);
    setup([draft(0)]);
    await call("?size=notogri");
    expect(findArgs().take).toBe(50);
  });

  it("qism to'lsa keyingi kursor qaytariladi", async () => {
    setup([draft(0), draft(1)], 5);

    const res = await call("?size=2");

    expect(res.headers.get("X-Import-Next-After")).toBe("1");
    expect(res.headers.get("X-Import-Total")).toBe("5");
  });

  it("qism to'lmasa kursor qaytarilmaydi — oxiri", async () => {
    setup([draft(0)], 1);

    expect((await call("?size=50")).headers.get("X-Import-Next-After")).toBeNull();
  });

  it("kursor SO'NGGI O'QILGAN qatordan olinadi, chatga chiqqanidan emas", async () => {
    // Oxiridagi kalit qatori tashlab yuborilsa ham kursor oldinga suriladi,
    // aks holda keyingi so'rov o'sha joyda aylanib qolardi.
    setup([draft(0), draft(1, { notQuestion: true })], 9);

    const res = await call("?size=2");

    expect(res.headers.get("X-Import-Next-After")).toBe("1");
  });

  it("tokenMap draft raw iga yoziladi, qolgan maydonlar saqlanadi", async () => {
    setup([draft(0, { images: [{ assetId: ID_A, url: "https://cdn.example/1.png" }], number: 1 })]);

    const text = await (await call()).text();

    expect(text).toContain("[[IMG1]]");
    expect(text).not.toContain("[[IMG:");

    const raw = updateDraftMock.mock.calls[0][0].data.raw as Record<string, unknown>;
    expect(raw.tokenMap).toEqual({ IMG1: `[[IMG:${ID_A}]]` });
    expect(raw.stage).toBe("BLOCK");
    expect(raw.number).toBe(1);
    expect(transactionMock).toHaveBeenCalledTimes(1);
  });

  it("?prompt=1 ko'rsatma qaytaradi va bazaga YOZMAYDI", async () => {
    setup([draft(0)]);

    const text = await (await call("?prompt=1")).text();

    expect(text).toContain("[[IMG1]]");
    expect(text).toContain("tr tilidan uz tiliga");
    expect(findDraftsMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("begona job 404 beradi va hech narsa o'qilmaydi", async () => {
    requireTeacherMock.mockResolvedValue({ user: { id: "u1" }, error: null });
    findTeacherMock.mockResolvedValue({ id: "t1" });
    findJobMock.mockResolvedValueOnce({ id: JOB, teacherId: "boshqa", status: "PARSING", pageCount: 1, blockCount: 1, pagesDone: [] });

    expect((await call()).status).toBe(404);
    expect(findDraftsMock).not.toHaveBeenCalled();
  });
});
