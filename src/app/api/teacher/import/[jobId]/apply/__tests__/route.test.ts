import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireTeacherMock,
  findTeacherMock,
  findJobMock,
  findDraftsMock,
  countDraftMock,
  updateDraftMock,
  updateJobMock,
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
  updateJobMock: vi.fn(),
  transactionMock: vi.fn(),
  infoMock: vi.fn(),
  errorMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    teacher: { findUnique: (...a: unknown[]) => findTeacherMock(...a) },
    importJob: {
      findUnique: (...a: unknown[]) => findJobMock(...a),
      update: (...a: unknown[]) => updateJobMock(...a),
    },
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
  return {
    ...actual,
    logger: {
      info: (...a: unknown[]) => infoMock(...a),
      warn: vi.fn(),
      error: (...a: unknown[]) => errorMock(...a),
    },
  };
});

import { NextRequest } from "next/server";
import { POST } from "../route";

const JOB = "job-1";
const TOKEN = "[[IMG:cmu2gfe670005lc0438g6uky5]]";

interface DraftRow {
  id: string;
  order: number;
  textOriginal: string;
  optionsOriginal: unknown;
  raw: Record<string, unknown>;
  issues: string[];
}

function draft(order: number, raw: Record<string, unknown> = {}, issues: string[] = []): DraftRow {
  return {
    id: `d${order}`,
    order,
    textOriginal: `${order + 1}. Savol matni`,
    optionsOriginal: [],
    raw: { stage: "BLOCK", number: order + 1, images: [], notQuestion: false, ...raw },
    issues,
  };
}

function item(order: number, overrides: Record<string, unknown> = {}) {
  return { order, text: "Savol matni", options: ["bir", "ikki", "uch"], answer: "B", ...overrides };
}

function call(body: unknown): Promise<Response> {
  const request = new NextRequest("http://localhost/api/teacher/import/job-1/apply", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return POST(request, { params: Promise.resolve({ jobId: JOB }) }) as unknown as Promise<Response>;
}

/**
 * `total` — jobdagi hamma draft, `ready` — yakuniy bosqichdagilar. Ikkalasi
 * javobdan keyingi ikkita `count` chaqiruviga to'g'ri keladi.
 */
function setup(rows: DraftRow[], counts: { total: number; ready: number }) {
  requireTeacherMock.mockResolvedValue({ user: { id: "u1" }, error: null });
  findTeacherMock.mockResolvedValue({ id: "t1" });
  findJobMock.mockResolvedValue({
    id: JOB,
    teacherId: "t1",
    status: "PARSING",
    pageCount: 1,
    blockCount: counts.total,
    pagesDone: [1],
  });
  findDraftsMock.mockResolvedValue(rows);
  countDraftMock.mockResolvedValueOnce(counts.total).mockResolvedValueOnce(counts.ready);
}

/** Yozilgan `update` argumentlari — `order` bo'yicha. */
function written(order: number): { data: Record<string, unknown> } | undefined {
  return updateDraftMock.mock.calls
    .map(([args]) => args as { where: { id: string }; data: Record<string, unknown> })
    .find((w) => w.where.id === `d${order}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  updateDraftMock.mockImplementation((args: unknown) => args);
  updateJobMock.mockResolvedValue({});
  transactionMock.mockResolvedValue([]);
});

describe("POST /api/teacher/import/[jobId]/apply", () => {
  it("savolni yozadi va READY bosqichiga o'tkazadi", async () => {
    setup([draft(0)], { total: 1, ready: 1 });

    const body = await (await call([item(0)])).json();

    expect(body).toMatchObject({ applied: 1, skipped: 0, problems: [] });
    const data = written(0)!.data;
    expect(data.text).toBe("Savol matni");
    expect(data.correctAnswer).toBe("B");
    expect(data.options).toEqual([
      { label: "A", text: "bir", imageToken: null },
      { label: "B", text: "ikki", imageToken: null },
      { label: "C", text: "uch", imageToken: null },
    ]);
    expect((data.raw as Record<string, unknown>).stage).toBe("READY");
  });

  it("textOriginal va optionsOriginal HECH QACHON yozilmaydi", async () => {
    setup([draft(0)], { total: 1, ready: 1 });
    await call([item(0)]);

    expect(written(0)!.data).not.toHaveProperty("textOriginal");
    expect(written(0)!.data).not.toHaveProperty("optionsOriginal");
  });

  it("noma'lum order tashlanadi, qolgani baribir yoziladi", async () => {
    setup([draft(0)], { total: 2, ready: 1 });

    const body = await (await call([item(0), item(99)])).json();

    expect(body.applied).toBe(1);
    expect(body.skipped).toBe(1);
    expect(body.problems).toContainEqual({ order: 99, code: "UNKNOWN_ORDER" });
    expect(written(0)).toBeDefined();
  });

  it("allaqachon tarjima qilingan savol ustidan YOZILMAYDI", async () => {
    // `TRANSLATED` — avtomatik yo'l muvaffaqiyatli tugatgan savol. Chat javobi
    // uni bosib ketmasligi kerak.
    setup([draft(0, { stage: "TRANSLATED" })], { total: 1, ready: 0 });

    const body = await (await call([item(0)])).json();

    expect(body).toMatchObject({ applied: 0, skipped: 1 });
    expect(body.problems).toContainEqual({ order: 0, code: "UNKNOWN_ORDER" });
    expect(updateDraftMock).not.toHaveBeenCalled();
  });

  it("READY draftga qayta qo'llash IDEMPOTENT — bir xil natija", async () => {
    setup([draft(0, { stage: "READY", tokenMap: { IMG1: TOKEN } })], { total: 1, ready: 1 });

    const body = await (await call([item(0, { text: "Savol matni [[IMG1]]" })])).json();

    expect(body).toMatchObject({ applied: 1, skipped: 0 });
    expect(written(0)!.data.text).toBe(`Savol matni ${TOKEN}`);
    expect((written(0)!.data.raw as Record<string, unknown>).stage).toBe("READY");
  });

  it("bitta order ikki marta kelsa ikkinchisi tashlanadi", async () => {
    setup([draft(0)], { total: 1, ready: 1 });

    const body = await (await call([item(0), item(0, { answer: "C" })])).json();

    expect(body).toMatchObject({ applied: 1, skipped: 1 });
    expect(body.problems).toContainEqual({ order: 0, code: "ORDER_DUPLICATE" });
    expect(updateDraftMock).toHaveBeenCalledTimes(1);
  });

  it("yiqilgan savol qolganini to'xtatmaydi", async () => {
    setup([draft(0), draft(1)], { total: 2, ready: 1 });

    const body = await (await call([item(0, { options: ["bitta"] }), item(1)])).json();

    expect(body).toMatchObject({ applied: 1, skipped: 1 });
    expect(body.problems).toContainEqual({ order: 0, code: "OPTION_COUNT_INVALID" });
    expect(written(1)).toBeDefined();
    expect(written(0)).toBeUndefined();
  });

  it("bayroqlar issues ga va javobga tushadi, eski yiqilish kodlari o'chadi", async () => {
    setup([draft(0, { stage: "TRANSLATE_FAILED" }, ["TRANSLATE_FAILED", "NO_KEY_FOUND"])], {
      total: 1,
      ready: 1,
    });

    const body = await (await call([item(0, { text: "Savol matni $x" })])).json();

    expect(body.problems).toContainEqual({ order: 0, code: "LATEX_UNBALANCED" });
    expect(written(0)!.data.issues).toEqual(["NO_KEY_FOUND", "LATEX_UNBALANCED"]);
  });

  it("navbat bo'shaganda job REVIEW ga o'tadi", async () => {
    setup([draft(0)], { total: 1, ready: 1 });
    await call([item(0)]);

    expect(updateJobMock).toHaveBeenCalledWith(expect.objectContaining({ data: { status: "REVIEW" } }));
  });

  it("navbat bo'shamasa status o'zgarmaydi", async () => {
    setup([draft(0)], { total: 5, ready: 1 });
    await call([item(0)]);

    expect(updateJobMock).not.toHaveBeenCalled();
  });

  it("JSON massiv bo'lmasa muammo qaytariladi, yozuv yo'q", async () => {
    setup([], { total: 1, ready: 0 });

    const body = await (await call({ notogri: true })).json();

    expect(body).toMatchObject({ applied: 0, skipped: 0 });
    expect(body.problems).toContainEqual({ order: -1, code: "JSON_INVALID" });
    expect(updateDraftMock).not.toHaveBeenCalled();
  });

  it("begona job 404 beradi", async () => {
    requireTeacherMock.mockResolvedValue({ user: { id: "u1" }, error: null });
    findTeacherMock.mockResolvedValue({ id: "t1" });
    findJobMock.mockResolvedValue({
      id: JOB,
      teacherId: "boshqa",
      status: "PARSING",
      pageCount: 1,
      blockCount: 1,
      pagesDone: [],
    });

    expect((await call([item(0)])).status).toBe(404);
    expect(findDraftsMock).not.toHaveBeenCalled();
  });
});
