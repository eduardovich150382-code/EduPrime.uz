import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireTeacherMock,
  findTeacherMock,
  findJobMock,
  findDraftsMock,
  countDraftMock,
  updateDraftMock,
  updateJobMock,
  executeRawMock,
  transactionMock,
  callerMock,
  infoMock,
  warnMock,
  errorMock,
} = vi.hoisted(() => ({
  requireTeacherMock: vi.fn(),
  findTeacherMock: vi.fn(),
  findJobMock: vi.fn(),
  findDraftsMock: vi.fn(),
  countDraftMock: vi.fn(),
  updateDraftMock: vi.fn(),
  updateJobMock: vi.fn(),
  executeRawMock: vi.fn(),
  transactionMock: vi.fn(),
  callerMock: vi.fn(),
  infoMock: vi.fn(),
  warnMock: vi.fn(),
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
    $executeRaw: (...a: unknown[]) => executeRawMock(...a),
    $transaction: (...a: unknown[]) => transactionMock(...a),
  },
}));
vi.mock("@/lib/api-auth", () => ({ requireTeacher: () => requireTeacherMock() }));
vi.mock("@/lib/logger", async (importOriginal) => {
  // `redactSecrets` haqiqiyligicha qoladi — `toLastError` aynan undan foydalanadi.
  const actual = await importOriginal<typeof import("@/lib/logger")>();
  return {
    ...actual,
    logger: {
      info: (...a: unknown[]) => infoMock(...a),
      warn: (...a: unknown[]) => warnMock(...a),
      error: (...a: unknown[]) => errorMock(...a),
    },
  };
});
vi.mock("@/lib/import/structure-model", () => ({
  STRUCTURE_MODEL: "gemini-test",
  createGeminiCaller: () => callerMock,
}));

import { NextRequest } from "next/server";
import { POST } from "../route";

const JOB = "job-1";

interface DraftRow {
  id: string;
  order: number;
  textOriginal: string;
  raw: Record<string, unknown>;
  issues: string[];
}

function draft(order: number, raw: Record<string, unknown> = {}, issues: string[] = []): DraftRow {
  return {
    id: `d${order}`,
    order,
    textOriginal: `${order + 1}. Savol matni`,
    raw: {
      stage: "BLOCK",
      number: order + 1,
      images: [],
      pageImages: [{ page: 3, url: "https://cdn.example/p3.jpg" }],
      regions: [{ page: 3, bbox: { x: 40, y: 100, w: 300, h: 80 } }],
      answerKey: null,
      notQuestion: false,
      ...raw,
    },
    issues,
  };
}

const modelAnswer = {
  text: "Strukturalangan savol",
  options: [{ label: "A", text: "1" }],
  correctAnswer: "A",
  type: "MULTIPLE_CHOICE",
  notQuestion: false,
};

function call(): Promise<Response> {
  const request = new NextRequest("http://localhost/api/teacher/import/job-1/structure", { method: "POST" });
  return POST(request, { params: Promise.resolve({ jobId: JOB }) }) as unknown as Promise<Response>;
}

/** `pending` — birinchi so'rovda tanlanadigan qatorlar, `remaining` — yozgandan keyin qolgani. */
function setup(options: { total: number; pending: DraftRow[]; remaining: number; status?: string }) {
  requireTeacherMock.mockResolvedValue({ user: { id: "u1" }, error: null });
  findTeacherMock.mockResolvedValue({ id: "t1" });
  findJobMock
    .mockResolvedValueOnce({
      id: JOB,
      teacherId: "t1",
      status: options.status ?? "PARSING",
      pageCount: 2,
      blockCount: options.total,
      pagesDone: [1, 2],
    })
    .mockResolvedValueOnce({ sourceLang: "uz", subject: { nameUz: "Fizika" } });
  countDraftMock.mockResolvedValueOnce(options.total).mockResolvedValueOnce(options.remaining);
  findDraftsMock.mockResolvedValue(options.pending);
}

beforeEach(() => {
  vi.clearAllMocks();
  updateDraftMock.mockImplementation((args: unknown) => args);
  updateJobMock.mockResolvedValue({});
  transactionMock.mockResolvedValue([]);
  executeRawMock.mockResolvedValue(1);
  callerMock.mockResolvedValue({ json: modelAnswer, tokens: 120 });
});

describe("POST /api/teacher/import/[jobId]/structure", () => {
  it("bloklarni strukturalaydi va tokenlarni atomar qo'shadi", async () => {
    setup({ total: 2, pending: [draft(0), draft(1)], remaining: 0 });

    const res = await call();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(callerMock).toHaveBeenCalledTimes(2);
    expect(body).toMatchObject({ done: 2, total: 2, hasMore: false, failed: 0, failedSample: [] });

    const written = updateDraftMock.mock.calls.map(([args]) => args as { data: Record<string, unknown> });
    expect(written[0].data.text).toBe("Strukturalangan savol");
    expect((written[0].data.raw as Record<string, unknown>).stage).toBe("STRUCTURED");
    // `increment` emas: parallel so'rovlar bir-birini bosib ketmasin.
    expect(executeRawMock).toHaveBeenCalledTimes(1);
    expect(updateJobMock).toHaveBeenCalledWith(expect.objectContaining({ data: { status: "REVIEW" } }));
  });

  it("allaqachon strukturalangan qatorlar uchun Gemini CHAQIRILMAYDI", async () => {
    setup({ total: 5, pending: [], remaining: 0 });

    const body = await (await call()).json();

    expect(callerMock).not.toHaveBeenCalled();
    expect(executeRawMock).not.toHaveBeenCalled();
    expect(body).toMatchObject({ done: 5, total: 5, hasMore: false, failed: 0 });
    // Faqat `raw.stage === 'BLOCK'` qatorlar tanlanadi — idempotentlik shunda.
    expect(findDraftsMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { jobId: JOB, raw: { path: ["stage"], equals: "BLOCK" } } }),
    );
  });

  it("25 blok → birinchi so'rovda 20 ta, hasMore: true", async () => {
    const pending = Array.from({ length: 20 }, (_, i) => draft(i));
    setup({ total: 25, pending, remaining: 5 });

    const body = await (await call()).json();

    expect(findDraftsMock).toHaveBeenCalledWith(expect.objectContaining({ take: 20 }));
    expect(callerMock).toHaveBeenCalledTimes(20);
    expect(body).toMatchObject({ done: 20, total: 25, hasMore: true, failed: 0 });
    // Ish tugamagan — status REVIEW ga o'tmaydi.
    expect(updateJobMock).not.toHaveBeenCalledWith(expect.objectContaining({ data: { status: "REVIEW" } }));
  });

  it("notQuestion blok modelga yuborilmaydi, lekin draftda qoladi", async () => {
    setup({ total: 2, pending: [draft(0, { notQuestion: true }), draft(1)], remaining: 0 });

    const body = await (await call()).json();

    expect(callerMock).toHaveBeenCalledTimes(1);
    expect(body.done).toBe(2);
    const written = updateDraftMock.mock.calls.map(([args]) => args as { where: { id: string }; data: Record<string, unknown> });
    const keyRow = written.find((w) => w.where.id === "d0")!;
    expect((keyRow.data.raw as Record<string, unknown>).stage).toBe("STRUCTURED");
    expect((keyRow.data.raw as Record<string, unknown>).notQuestion).toBe(true);
    expect(keyRow.data.text).toBeUndefined();
  });

  it("paketdagi bitta chaqiruv yiqilsa qolgani yoziladi, yiqilgani qayta urinish uchun qoladi", async () => {
    setup({ total: 3, pending: [draft(0), draft(1), draft(2)], remaining: 1 });
    callerMock.mockImplementation(async (input: { order: number }) => {
      if (input.order === 1) throw Object.assign(new Error("model rad etdi"), { status: 400 });
      return { json: modelAnswer, tokens: 50 };
    });

    const body = await (await call()).json();

    expect(body).toMatchObject({ done: 2, total: 3, hasMore: true, failed: 1 });
    const written = updateDraftMock.mock.calls.map(([args]) => args as { where: { id: string }; data: Record<string, unknown> });
    const failedRow = written.find((w) => w.where.id === "d1")!;
    expect(failedRow.data.issues).toContain("STRUCTURE_FAILED");
    expect((failedRow.data.raw as Record<string, unknown>).stage).toBe("BLOCK");
    expect((failedRow.data.raw as Record<string, unknown>).attempts).toBe(1);
    // Yiqilmaganlar baribir yozilgan.
    expect(written.find((w) => w.where.id === "d2")!.data.text).toBe("Strukturalangan savol");
  });

  it("uchinchi urinishdan keyin blok terminal bo'ladi — klient sikli cheksiz aylanmaydi", async () => {
    setup({ total: 1, pending: [draft(0, { attempts: 2 })], remaining: 0 });
    callerMock.mockRejectedValue(Object.assign(new Error("model rad etdi"), { status: 400 }));

    await call();

    const [[args]] = updateDraftMock.mock.calls as [{ data: Record<string, unknown> }][];
    expect((args.data.raw as Record<string, unknown>).stage).toBe("STRUCTURE_FAILED");
    expect((args.data.raw as Record<string, unknown>).attempts).toBe(3);
  });

  it("yiqilish sababi raw.lastError ga yoziladi", async () => {
    setup({ total: 1, pending: [draft(0)], remaining: 1 });
    callerMock.mockRejectedValue(Object.assign(new Error("Invalid JSON payload"), { status: 400 }));

    const body = await (await call()).json();

    const [[args]] = updateDraftMock.mock.calls as [{ data: Record<string, unknown> }][];
    const raw = args.data.raw as Record<string, unknown>;
    // Sabab bazada qoladi: Vercel logi bepul tarifda yarim soatdan keyin
    // o'chadi, `issues` da esa faqat kod bor.
    expect(raw.lastError).toMatchObject({ message: "Invalid JSON payload", name: "Error", status: 400 });
    expect(typeof (raw.lastError as { at: string }).at).toBe("string");
    expect(body.failedSample).toEqual([{ order: 0, message: "Invalid JSON payload" }]);
  });

  it("lastError dagi maxfiy qiymat redaktsiya qilinadi", async () => {
    setup({ total: 1, pending: [draft(0)], remaining: 1 });
    callerMock.mockRejectedValue(
      new Error("POST https://generativelanguage.googleapis.com/v1?key=AIzaSyMAXFIY failed"),
    );

    await call();

    const [[args]] = updateDraftMock.mock.calls as [{ data: Record<string, unknown> }][];
    const message = ((args.data.raw as Record<string, unknown>).lastError as { message: string }).message;
    expect(message).not.toContain("AIzaSyMAXFIY");
    expect(message).toContain("key=[redacted]");
  });

  it("oraliq urinish warn, terminal urinish error darajasida hisobot beradi", async () => {
    const failure = Object.assign(new Error("rad etildi"), { status: 400 });

    setup({ total: 1, pending: [draft(0)], remaining: 1 });
    callerMock.mockRejectedValue(failure);
    await call();

    expect(errorMock).not.toHaveBeenCalled();
    expect(warnMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ report: true, tags: { jobId: JOB, order: 0, attempt: 1 } }),
    );

    vi.clearAllMocks();
    updateDraftMock.mockImplementation((args: unknown) => args);
    updateJobMock.mockResolvedValue({});
    transactionMock.mockResolvedValue([]);
    setup({ total: 1, pending: [draft(0, { attempts: 2 })], remaining: 1 });
    callerMock.mockRejectedValue(failure);
    await call();

    expect(errorMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ tags: { jobId: JOB, order: 0, attempt: 3 } }),
    );
  });

  it("javobda va log'da so'rov vaqti o'lchanadi", async () => {
    setup({ total: 1, pending: [draft(0)], remaining: 0 });

    const body = await (await call()).json();

    // Paket hajmi funksiya chegarasiga sig'adimi — o'lchov bilan hal qilinadi.
    expect(typeof body.elapsedMs).toBe("number");
    expect(infoMock).toHaveBeenCalledWith(
      "Struktura paketi",
      expect.objectContaining({ jobId: JOB, blocks: 1, failed: 0 }),
    );
  });

  it("uchtadan ortiq yiqilishda failedSample faqat birinchi uchtasini beradi", async () => {
    const pending = Array.from({ length: 5 }, (_, i) => draft(i));
    setup({ total: 5, pending, remaining: 5 });
    callerMock.mockRejectedValue(Object.assign(new Error("rad etildi"), { status: 400 }));

    const body = await (await call()).json();

    expect(body.failed).toBe(5);
    expect(body.failedSample).toHaveLength(3);
    expect(body.failedSample.map((f: { order: number }) => f.order)).toEqual([0, 1, 2]);
  });

  it("berilgan kalit modelga uzatiladi va javob kalitdan olinadi", async () => {
    const key = { letter: "C", source: { page: 3, kind: "table" } };
    setup({ total: 1, pending: [draft(0, { answerKey: key })], remaining: 0 });
    callerMock.mockResolvedValue({ json: { ...modelAnswer, correctAnswer: "A" }, tokens: 10 });

    await call();

    expect(callerMock).toHaveBeenCalledWith(expect.objectContaining({ givenKey: key }));
    const [[args]] = updateDraftMock.mock.calls as [{ data: Record<string, unknown> }][];
    expect(args.data.correctAnswer).toBe("C");
    expect((args.data.raw as Record<string, unknown>).answerMismatch).toBe(true);
  });

  it("kalit topilmagan blokda kod saqlanadi va model yechimi qoladi", async () => {
    setup({ total: 1, pending: [draft(0, {}, ["NO_KEY_FOUND"])], remaining: 0 });
    callerMock.mockResolvedValue({ json: { ...modelAnswer, correctAnswer: "B" }, tokens: 10 });

    await call();

    expect(callerMock).toHaveBeenCalledWith(expect.objectContaining({ keyIssue: "NO_KEY_FOUND" }));
    const [[args]] = updateDraftMock.mock.calls as [{ data: Record<string, unknown> }][];
    expect(args.data.correctAnswer).toBe("B");
    expect(args.data.issues).toContain("NO_KEY_FOUND");
  });

  it("bloklar hali yozilmagan bo'lsa 409", async () => {
    setup({ total: 0, pending: [], remaining: 0 });

    const res = await call();

    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("NO_BLOCKS");
    expect(callerMock).not.toHaveBeenCalled();
  });

  it("begona job — 404, hech narsa strukturalanmaydi", async () => {
    requireTeacherMock.mockResolvedValue({ user: { id: "u1" }, error: null });
    findTeacherMock.mockResolvedValue({ id: "t1" });
    findJobMock.mockResolvedValueOnce({ id: JOB, teacherId: "boshqa", status: "PARSING", pagesDone: [] });

    const res = await call();

    expect(res.status).toBe(404);
    expect(callerMock).not.toHaveBeenCalled();
  });
});
