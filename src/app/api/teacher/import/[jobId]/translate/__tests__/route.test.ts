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
      warn: vi.fn(),
      error: (...a: unknown[]) => errorMock(...a),
    },
  };
});
vi.mock("@/lib/import/translate-model", () => ({ createTranslateCaller: () => callerMock }));

import { NextRequest } from "next/server";
import { POST } from "../route";

const JOB = "job-1";

interface DraftRow {
  id: string;
  order: number;
  text: string;
  textOriginal: string;
  options: unknown;
  optionsOriginal: unknown;
  raw: Record<string, unknown>;
  issues: string[];
}

function draft(order: number, raw: Record<string, unknown> = {}): DraftRow {
  const options = [
    { label: "A", text: "2", imageToken: null },
    { label: "B", text: "3", imageToken: null },
  ];
  return {
    id: `d${order}`,
    order,
    text: "Bir cismin hizi kactir?",
    textOriginal: "Bir cismin hizi kactir?",
    options,
    optionsOriginal: options,
    raw: { stage: "STRUCTURED", ...raw },
    issues: [],
  };
}

/** Modelning bir guruh uchun javobi — `TRANSLATE_SCHEMA` dagi shakl. */
function answer(orders: number[]) {
  return {
    json: {
      results: orders.map((order) => ({
        order,
        text: "Jismning tezligi nechaga teng?",
        options: [
          { label: "A", text: "2" },
          { label: "B", text: "3" },
        ],
        issues: [],
        confidence: 0.9,
      })),
    },
    tokens: 100,
  };
}

function call(query = ""): Promise<Response> {
  const request = new NextRequest(`http://localhost/api/teacher/import/job-1/translate${query}`, {
    method: "POST",
  });
  return POST(request, { params: Promise.resolve({ jobId: JOB }) }) as unknown as Promise<Response>;
}

/**
 * `remaining` — yozgandan keyin `STRUCTURED` bo'lib qolganlari, `done` —
 * `TRANSLATED` yoki `READY` bo'lganlari.
 */
function setup(options: {
  total: number;
  pending: DraftRow[];
  remaining: number;
  done?: number;
  stuck?: number;
  sameLang?: boolean;
}) {
  requireTeacherMock.mockResolvedValue({ user: { id: "u1" }, error: null });
  findTeacherMock.mockResolvedValue({ id: "t1" });
  findJobMock
    .mockResolvedValueOnce({
      id: JOB,
      teacherId: "t1",
      status: "STRUCTURING",
      pageCount: 1,
      blockCount: options.total,
      pagesDone: [1],
    })
    .mockResolvedValueOnce({
      sourceLang: options.sameLang ? "uz" : "tr",
      targetLang: "uz",
      subject: { nameUz: "Fizika" },
    });

  countDraftMock.mockResolvedValueOnce(options.total);
  if (options.sameLang) {
    countDraftMock.mockResolvedValueOnce(options.done ?? options.total);
  } else {
    countDraftMock
      .mockResolvedValueOnce(options.remaining)
      .mockResolvedValueOnce(options.done ?? options.total - options.remaining)
      .mockResolvedValueOnce(options.stuck ?? 0);
  }
  findDraftsMock.mockResolvedValue(options.pending);
}

/** `$executeRaw` chaqiruvlarining SQL matni — teglangan shablonning bo'laklari. */
function rawSql(): string[] {
  return executeRawMock.mock.calls.map(([strings]) => (strings as string[]).join("?"));
}

beforeEach(() => {
  vi.clearAllMocks();
  updateDraftMock.mockImplementation((args: unknown) => args);
  updateJobMock.mockResolvedValue({});
  transactionMock.mockResolvedValue([]);
  executeRawMock.mockResolvedValue(1);
  callerMock.mockResolvedValue(answer([0, 1]));
});

describe("POST /api/teacher/import/[jobId]/translate — yakuniy READY bosqichi", () => {
  it("navbat bo'shaganda TRANSLATED draftlar READY ga o'tkaziladi", async () => {
    setup({ total: 2, pending: [draft(0), draft(1)], remaining: 0, done: 2 });

    const body = await (await call()).json();

    expect(body).toMatchObject({ done: 2, total: 2, hasMore: false, translated: 2 });

    const promote = rawSql().find((sql) => sql.includes(`'"READY"'`));
    expect(promote).toBeDefined();
    expect(promote).toContain(`"raw"->>'stage' = 'TRANSLATED'`);
    expect(updateJobMock).toHaveBeenCalledWith(expect.objectContaining({ data: { status: "REVIEW" } }));
  });

  it("navbat bo'shamasa READY ga o'tkazilmaydi", async () => {
    setup({ total: 5, pending: [draft(0), draft(1)], remaining: 3, done: 2 });

    const body = await (await call()).json();

    expect(body.hasMore).toBe(true);
    expect(rawSql().some((sql) => sql.includes(`'"READY"'`))).toBe(false);
    expect(updateJobMock).not.toHaveBeenCalledWith(expect.objectContaining({ data: { status: "REVIEW" } }));
  });

  it("done hisobi TRANSLATED va READY ni birga sanaydi", async () => {
    // Promotion'dan keyin hammasi READY bo'ladi — faqat TRANSLATED sanalsa
    // ekranda hisob "2/2" dan "0/2" ga tushib qolardi.
    setup({ total: 2, pending: [draft(0), draft(1)], remaining: 0, done: 2 });
    await call();

    const doneWhere = countDraftMock.mock.calls[2][0].where;
    expect(doneWhere.OR).toEqual([
      { raw: { path: ["stage"], equals: "TRANSLATED" } },
      { raw: { path: ["stage"], equals: "READY" } },
    ]);
  });

  it("tillar teng bo'lsa Gemini chaqirilmaydi va bosqich READY gacha boradi", async () => {
    setup({ total: 2, pending: [], remaining: 0, done: 2, sameLang: true });

    const body = await (await call()).json();

    expect(body).toMatchObject({ skippedSameLang: true, done: 2, hasMore: false });
    expect(callerMock).not.toHaveBeenCalled();

    const sql = rawSql();
    expect(sql.some((s) => s.includes(`'"TRANSLATED"'`))).toBe(true);
    expect(sql.some((s) => s.includes(`'"READY"'`))).toBe(true);
    expect(updateJobMock).toHaveBeenCalledWith(expect.objectContaining({ data: { status: "REVIEW" } }));
  });

  it("bloklar yozilmagan bo'lsa 409", async () => {
    setup({ total: 0, pending: [], remaining: 0 });

    const res = await call();

    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("NO_BLOCKS");
  });
});
