import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireTeacherMock,
  findTeacherMock,
  findJobMock,
  updateJobMock,
  findDraftsMock,
  updateDraftMock,
  transactionMock,
} = vi.hoisted(() => ({
  requireTeacherMock: vi.fn(),
  findTeacherMock: vi.fn(),
  findJobMock: vi.fn(),
  updateJobMock: vi.fn(),
  findDraftsMock: vi.fn(),
  updateDraftMock: vi.fn(),
  transactionMock: vi.fn(),
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
      update: (...a: unknown[]) => updateDraftMock(...a),
    },
    $transaction: (...a: unknown[]) => transactionMock(...a),
  },
}));
vi.mock("@/lib/api-auth", () => ({ requireTeacher: () => requireTeacherMock() }));
vi.mock("@/lib/logger", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/logger")>();
  return { ...actual, logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } };
});

import { NextRequest } from "next/server";
import { GET } from "../route";

const JOB = "job-1";

interface DraftRow {
  order: number;
  textOriginal: string;
  text: string;
  optionsOriginal: unknown;
  raw: unknown;
}

function draft(order: number, raw: unknown = {}, overrides: Partial<DraftRow> = {}): DraftRow {
  return {
    order,
    textOriginal: `Savol matni`,
    text: `Savol matni`,
    optionsOriginal: [],
    raw: raw === null ? null : { stage: "BLOCK", images: [], ...(raw as Record<string, unknown>) },
    ...overrides,
  };
}

interface Body {
  jobId: string;
  total: number;
  entries: { index: number; order: number; images: string[]; numbers: string[] }[];
}

async function call(): Promise<{ status: number; body: Body }> {
  const request = new NextRequest(`http://localhost/api/teacher/import/${JOB}/image-map`);
  const res = (await GET(request, { params: Promise.resolve({ jobId: JOB }) })) as unknown as Response;
  return { status: res.status, body: (await res.json()) as Body };
}

function setup(rows: DraftRow[]) {
  requireTeacherMock.mockResolvedValue({ user: { id: "u1" }, error: null });
  findTeacherMock.mockResolvedValue({ id: "t1" });
  findJobMock.mockResolvedValueOnce({ id: JOB, teacherId: "t1", status: "REVIEW", pageCount: 1, blockCount: rows.length, pagesDone: [1] });
  findDraftsMock.mockResolvedValue(rows);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/teacher/import/[jobId]/image-map", () => {
  it("hamma savol draftini tartib bilan beradi, rasmsizlarini ham", async () => {
    setup([
      draft(0),
      draft(4, { images: [{ assetId: "a1", url: "https://utfs.io/f/1.png" }] }),
      draft(7),
    ]);

    const { status, body } = await call();

    expect(status).toBe(200);
    expect(body.jobId).toBe(JOB);
    expect(body.total).toBe(3);
    expect(body.entries.map((e) => [e.index, e.order, e.images])).toEqual([
      [0, 0, []],
      [1, 4, ["https://utfs.io/f/1.png"]],
      [2, 7, []],
    ]);
  });

  it("notQuestion draft total ga kirmaydi va indekslar uzluksiz qoladi", async () => {
    setup([draft(0), draft(1, { notQuestion: true }), draft(2)]);

    const { body } = await call();

    expect(body.total).toBe(2);
    expect(body.entries.map((e) => [e.index, e.order])).toEqual([[0, 0], [1, 2]]);
  });

  it("buzuq raw yiqitmaydi — draft images: [] bilan qoladi", async () => {
    setup([
      draft(0, null),
      draft(1, { images: "massiv emas" }),
      draft(2, { images: [{ assetId: "x" }, null, { url: "" }, { url: "https://utfs.io/f/ok.png" }] }),
    ]);

    const { status, body } = await call();

    expect(status).toBe(200);
    expect(body.total).toBe(3);
    expect(body.entries.map((e) => e.images)).toEqual([[], [], ["https://utfs.io/f/ok.png"]]);
  });

  it("order asc bo'yicha, bosqich filtrisiz o'qiydi va bazaga YOZMAYDI", async () => {
    setup([draft(0)]);
    await call();

    const args = findDraftsMock.mock.calls[0][0];
    expect(args.where).toEqual({ jobId: JOB });
    expect(args.orderBy).toEqual({ order: "asc" });
    expect(updateDraftMock).not.toHaveBeenCalled();
    expect(updateJobMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("numbers: variantlar kiradi, rasm tokeni va savol raqami kirmaydi", async () => {
    setup([
      draft(
        0,
        { number: 8 },
        {
          textOriginal: "8. Kuch 8 N [[IMG:cmu2gfe670005lc0438g6uky5]] bo'lsa?",
          optionsOriginal: [{ label: "A", text: "0,6" }, { label: "B", text: "37" }],
        },
      ),
    ]);

    const { body } = await call();

    expect(body.entries[0].numbers).toEqual(["0.6", "37", "8"]);
  });

  it("textOriginal bo'sh bo'lsa text ishlatiladi", async () => {
    setup([draft(0, {}, { textOriginal: "", text: "Massa 12 kg" })]);

    const { body } = await call();

    expect(body.entries[0].numbers).toEqual(["12"]);
  });

  it("begona job 404 beradi va draftlar o'qilmaydi", async () => {
    requireTeacherMock.mockResolvedValue({ user: { id: "u1" }, error: null });
    findTeacherMock.mockResolvedValue({ id: "t1" });
    findJobMock.mockResolvedValueOnce({ id: JOB, teacherId: "boshqa", status: "REVIEW", pageCount: 1, blockCount: 1, pagesDone: [] });

    const request = new NextRequest(`http://localhost/api/teacher/import/${JOB}/image-map`);
    const res = (await GET(request, { params: Promise.resolve({ jobId: JOB }) })) as unknown as Response;

    expect(res.status).toBe(404);
    expect(findDraftsMock).not.toHaveBeenCalled();
  });
});
