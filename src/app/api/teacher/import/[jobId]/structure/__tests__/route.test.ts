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
// Zanjirning o'rniga bitta soxta chaqiruvchi: marshrut uchun zanjir
// shaffof — u faqat `ModelCaller` ni ko'radi.
vi.mock("@/lib/import/structure-model", () => ({
  createGeminiCaller: () => callerMock,
}));

import { NextRequest } from "next/server";
import { RateLimitedError, STRUCTURE_BATCH, STRUCTURE_CONCURRENCY } from "@/lib/import/structure-error";
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

function call(query = ""): Promise<Response> {
  const request = new NextRequest(`http://localhost/api/teacher/import/job-1/structure${query}`, {
    method: "POST",
  });
  return POST(request, { params: Promise.resolve({ jobId: JOB }) }) as unknown as Promise<Response>;
}

/**
 * `pending` — birinchi so'rovda tanlanadigan qatorlar, `remaining` — yozgandan
 * keyin `BLOCK` bo'lib qolgani, `done` — `STRUCTURED` bo'lganlari (berilmasa
 * yiqilgan blok yo'q deb hisoblanadi).
 */
function setup(options: {
  total: number;
  pending: DraftRow[];
  remaining: number;
  done?: number;
  /** Terminal yiqilgan bloklar soni — javobdagi `stuck`. */
  stuck?: number;
  status?: string;
}) {
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
  countDraftMock
    .mockResolvedValueOnce(options.total)
    .mockResolvedValueOnce(options.remaining)
    .mockResolvedValueOnce(options.done ?? options.total - options.remaining)
    .mockResolvedValueOnce(options.stuck ?? 0);
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

  it("25 blok → birinchi so'rovda paket hajmicha, hasMore: true", async () => {
    const pending = Array.from({ length: STRUCTURE_BATCH }, (_, i) => draft(i));
    setup({ total: 25, pending, remaining: 25 - STRUCTURE_BATCH });

    const body = await (await call()).json();

    expect(findDraftsMock).toHaveBeenCalledWith(expect.objectContaining({ take: STRUCTURE_BATCH }));
    expect(callerMock).toHaveBeenCalledTimes(STRUCTURE_BATCH);
    expect(body).toMatchObject({ done: STRUCTURE_BATCH, total: 25, hasMore: true, failed: 0 });
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

    // Ikkinchi argument — chaqiruvning `AbortSignal` i (vaqt chegarasi).
    expect(callerMock).toHaveBeenCalledWith(expect.objectContaining({ givenKey: key }), expect.any(AbortSignal));
    const [[args]] = updateDraftMock.mock.calls as [{ data: Record<string, unknown> }][];
    expect(args.data.correctAnswer).toBe("C");
    expect((args.data.raw as Record<string, unknown>).answerMismatch).toBe(true);
  });

  it("kalit topilmagan blokda kod saqlanadi va model yechimi qoladi", async () => {
    setup({ total: 1, pending: [draft(0, {}, ["NO_KEY_FOUND"])], remaining: 0 });
    callerMock.mockResolvedValue({ json: { ...modelAnswer, correctAnswer: "B" }, tokens: 10 });

    await call();

    expect(callerMock).toHaveBeenCalledWith(
      expect.objectContaining({ keyIssue: "NO_KEY_FOUND" }),
      expect.any(AbortSignal),
    );
    const [[args]] = updateDraftMock.mock.calls as [{ data: Record<string, unknown> }][];
    expect(args.data.correctAnswer).toBe("B");
    expect(args.data.issues).toContain("NO_KEY_FOUND");
  });

  // -------------------------------------------------------------------------
  // Vaqt byudjeti
  // -------------------------------------------------------------------------

  /**
   * Chaqiruvni soat siljitadigan qilib almashtiradi.
   *
   * Soxta taymerlar bilan `Date.now()` ham siljiydi — marshrut byudjetni aynan
   * shu bilan hisoblaydi. `await` SHART: usiz birinchi chaqiruv soatni
   * qolganlari byudjet tekshiruvidan o'tishidan OLDIN siljitib yuborardi.
   */
  function slowCaller(ms: number): void {
    callerMock.mockImplementation(async () => {
      await Promise.resolve();
      vi.advanceTimersByTime(ms);
      return { json: modelAnswer, tokens: 10 };
    });
  }

  it("muddat oshganda qolgan bloklarga TEGILMAYDI va hasMore: true", async () => {
    vi.useFakeTimers();
    try {
      // Bir to'lqin (STRUCTURE_CONCURRENCY) sig'adi, keyingisiga vaqt qolmaydi.
      const pending = Array.from({ length: STRUCTURE_CONCURRENCY + 2 }, (_, i) => draft(i));
      setup({ total: 30, pending, remaining: 30 - STRUCTURE_CONCURRENCY });
      slowCaller(45000);

      const body = await (await call()).json();

      expect(callerMock).toHaveBeenCalledTimes(STRUCTURE_CONCURRENCY);
      expect(updateDraftMock).toHaveBeenCalledTimes(STRUCTURE_CONCURRENCY);
      expect(body).toMatchObject({ hasMore: true, deadlineHit: true, batches: 1, stalled: false });
      // Tegilmagan bloklar — na yiqilgan, na urinish soni oshgan.
      expect(body.failed).toBe(0);
      expect(updateJobMock).not.toHaveBeenCalledWith(expect.objectContaining({ data: { status: "REVIEW" } }));
    } finally {
      vi.useRealTimers();
    }
  });

  it("vaqt yetmagani STRUCTURE_FAILED emas — blok tegilmay qoladi", async () => {
    vi.useFakeTimers();
    try {
      setup({ total: 2, pending: [draft(0), draft(1)], remaining: 1, done: 1 });
      // Birinchi chaqiruvning o'zi butun byudjetni yeydi: qolganiga `deferred`.
      let first = true;
      callerMock.mockImplementation(async () => {
        await Promise.resolve();
        if (first) {
          first = false;
          vi.advanceTimersByTime(60000);
          throw Object.assign(new Error("unavailable"), { status: 503 });
        }
        return { json: modelAnswer, tokens: 10 };
      });

      const body = await (await call()).json();

      // 503 qayta urinishga arziydi, lekin kutishga vaqt yo'q: blok
      // TEGILMAY qoladi — `attempts` oshmaydi, `STRUCTURE_FAILED` yozilmaydi.
      const written = updateDraftMock.mock.calls.map(([args]) => (args as { where: { id: string } }).where.id);
      expect(written).toEqual(["d1"]);
      expect(body).toMatchObject({ failed: 0, hasMore: true, stalled: false });
      expect(errorMock).not.toHaveBeenCalled();
      expect(warnMock).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("bitta ham blok yozilmasa stalled: true", async () => {
    vi.useFakeTimers();
    try {
      setup({ total: 1, pending: [draft(0)], remaining: 1, done: 0 });
      callerMock.mockImplementation(async () => {
        await Promise.resolve();
        vi.advanceTimersByTime(60000);
        throw Object.assign(new Error("unavailable"), { status: 503 });
      });

      const body = await (await call()).json();

      expect(body.stalled).toBe(true);
      expect(body.done).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("kvota tugagani STRUCTURE_FAILED emas — attempts oshmaydi, RATE_LIMITED qo'yiladi", async () => {
    setup({ total: 2, pending: [draft(0, { attempts: 1 }), draft(1)], remaining: 2, done: 0 });
    callerMock.mockRejectedValue(new RateLimitedError());

    const body = await (await call()).json();

    const written = updateDraftMock.mock.calls.map(([args]) => args as { data: Record<string, unknown> });
    expect(written).toHaveLength(2);
    for (const update of written) {
      const raw = update.data.raw as Record<string, unknown>;
      // Blok `BLOCK` da qoladi va urinish sarflanmaydi: kvota ertaga tiklanadi.
      expect(raw.stage).toBe("BLOCK");
      expect(update.data.issues).toEqual(["RATE_LIMITED"]);
      // Sabab yozilgan — nima uchun to'xtaganini keyin ko'rish uchun.
      expect(raw.lastError).toMatchObject({ name: "RateLimitedError" });
    }
    expect((written[0].data.raw as { attempts?: number }).attempts).toBe(1);
    // Kvota yozuvi ILGARILASH emas: klient siklni to'xtatishi kerak.
    expect(body).toMatchObject({ rateLimited: 2, failed: 0, stalled: true, hasMore: true });
    expect(errorMock).not.toHaveBeenCalled();
  });

  it("retryFailed=1 terminal bloklarni BLOCK ga qaytaradi", async () => {
    setup({ total: 2, pending: [draft(0)], remaining: 0, done: 1 });
    // Birinchi `findMany` — tiklanadigan terminal bloklar, ikkinchisi — navbat.
    findDraftsMock.mockReset();
    findDraftsMock
      .mockResolvedValueOnce([
        {
          id: "d9",
          raw: { stage: "STRUCTURE_FAILED", attempts: 3, lastError: { message: "quota", name: "Error", at: "x" } },
          issues: ["KEY_AMBIGUOUS", "STRUCTURE_FAILED", "RATE_LIMITED"],
        },
      ])
      .mockResolvedValueOnce([draft(0)]);

    await call("?retryFailed=1");

    expect(findDraftsMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { jobId: JOB, raw: { path: ["stage"], equals: "STRUCTURE_FAILED" } } }),
    );
    const restore = updateDraftMock.mock.calls
      .map(([args]) => args as { where: { id: string }; data: Record<string, unknown> })
      .find((u) => u.where.id === "d9")!;
    const raw = restore.data.raw as Record<string, unknown>;
    expect(raw.stage).toBe("BLOCK");
    // Urinishlar nolga tushadi, aks holda blok bitta urinishdayoq yana terminal bo'lardi.
    expect(raw.attempts).toBe(0);
    expect(raw.lastError).toBeUndefined();
    // Blok bosqichidagi kalit muammosi saqlanadi — u strukturaga aloqador.
    expect(restore.data.issues).toEqual(["KEY_AMBIGUOUS"]);
  });

  it("retryFailed berilmasa terminal bloklarga tegilmaydi", async () => {
    setup({ total: 2, pending: [draft(0)], remaining: 0, done: 1 });

    await call();

    expect(findDraftsMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { jobId: JOB, raw: { path: ["stage"], equals: "STRUCTURE_FAILED" } } }),
    );
  });

  it("javob bergan model draftga ham, jobga ham yoziladi", async () => {
    setup({ total: 1, pending: [draft(0)], remaining: 0, done: 1, stuck: 2 });
    callerMock.mockResolvedValue({ json: modelAnswer, tokens: 120, model: "b-flash" });

    const body = await (await call()).json();

    const [[update]] = updateDraftMock.mock.calls as [[{ data: { raw: Record<string, unknown> } }]];
    // Qaysi savol qaysi model bilan tuzilganini bilmasak, sifatni taqqoslab bo'lmaydi.
    expect(update.data.raw.model).toBe("b-flash");
    expect(executeRawMock).toHaveBeenCalledTimes(1);
    expect(executeRawMock.mock.calls[0].slice(1)).toContain("b-flash");
    // Terminal yiqilganlar soni javobda — UI tugmani shunga qarab ko'rsatadi.
    expect(body.stuck).toBe(2);
  });

  it("done faqat STRUCTURED bloklarni sanaydi, total esa butun jobni", async () => {
    // Uch blokdan biri oldingi so'rovlarda butunlay yiqilgan: u `BLOCK` ham
    // emas, `STRUCTURED` ham emas — shuning uchun `done` `total` ga yetmaydi.
    setup({ total: 3, pending: [draft(0)], remaining: 0, done: 2 });

    const body = await (await call()).json();

    expect(body).toMatchObject({ done: 2, total: 3, hasMore: false });
    expect(countDraftMock).toHaveBeenCalledWith({
      where: { jobId: JOB, raw: { path: ["stage"], equals: "STRUCTURED" } },
    });
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
