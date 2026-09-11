import { beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_SOURCE_PAGE } from "@/lib/import/constants";
import type { UploadGroup } from "@/lib/import/grouping";

const {
  requireTeacherMock,
  findTeacherMock,
  findJobMock,
  upsertDraftMock,
  countDraftMock,
  updateJobMock,
  executeRawMock,
  findAssetsMock,
  transactionMock,
} = vi.hoisted(() => ({
  requireTeacherMock: vi.fn(),
  findTeacherMock: vi.fn(),
  findJobMock: vi.fn(),
  upsertDraftMock: vi.fn(),
  countDraftMock: vi.fn(),
  updateJobMock: vi.fn(),
  executeRawMock: vi.fn(),
  findAssetsMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    teacher: { findUnique: (...a: unknown[]) => findTeacherMock(...a) },
    importJob: {
      findUnique: (...a: unknown[]) => findJobMock(...a),
      update: (...a: unknown[]) => updateJobMock(...a),
    },
    importAsset: { findMany: (...a: unknown[]) => findAssetsMock(...a) },
    importDraft: {
      upsert: (...a: unknown[]) => upsertDraftMock(...a),
      count: (...a: unknown[]) => countDraftMock(...a),
    },
    $executeRaw: (...a: unknown[]) => executeRawMock(...a),
    $transaction: (...a: unknown[]) => transactionMock(...a),
  },
}));
vi.mock("@/lib/api-auth", () => ({ requireTeacher: () => requireTeacherMock() }));

import { NextRequest, NextResponse } from "next/server";
import { POST } from "../route";

const BOX = { x: 40, y: 100, w: 300, h: 26 };
const IMG_BOX = { x: 60, y: 110, w: 80, h: 70 };

function group(order: number, extra: Partial<UploadGroup> = {}): UploadGroup {
  return {
    order,
    number: order + 1,
    text: `${order + 1}. Savol
A) 1. B) 2.`,
    startPage: 3,
    endPage: 3,
    regions: [{ page: 3, bbox: BOX }],
    images: [],
    ...extra,
  };
}

function post(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/teacher/import/job-1/blocks", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const params = Promise.resolve({ jobId: "job-1" });

function upsertCalls() {
  return upsertDraftMock.mock.calls.map((c) => c[0]);
}

describe("POST /api/teacher/import/[jobId]/blocks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireTeacherMock.mockReturnValue({ user: { id: "user-1", role: "TEACHER" }, error: null });
    findTeacherMock.mockResolvedValue({ id: "teacher-1" });
    findJobMock.mockResolvedValue({
      id: "job-1",
      teacherId: "teacher-1",
      status: "UPLOADED",
      pageCount: 2,
      blockCount: 0,
      pagesDone: [3, 4],
    });
    upsertDraftMock.mockImplementation((args) => Promise.resolve(args));
    transactionMock.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops));
    // Haqiqiy `findMany` kabi faqat so'ralgan id'larni qaytaradi.
    const stored = [
      { id: "asset-1", url: "https://utfs.io/f/fig.png" },
      { id: "page-3", url: "https://utfs.io/f/p3.png" },
      { id: "page-4", url: "https://utfs.io/f/p4.png" },
    ];
    findAssetsMock.mockImplementation((args: { where: { id: { in: string[] } } }) =>
      Promise.resolve(stored.filter((a) => args.where.id.in.includes(a.id))),
    );
    countDraftMock.mockResolvedValue(2);
    updateJobMock.mockResolvedValue({ blockCount: 2, status: "PARSING" });
  });

  it("o'qituvchi bo'lmaganlarga requireTeacher xatosini qaytaradi", async () => {
    requireTeacherMock.mockReturnValue({
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    });

    const response = await POST(post({ groups: [group(0)] }), { params });

    expect(response.status).toBe(403);
    expect(upsertDraftMock).not.toHaveBeenCalled();
  });

  it("begona job uchun 404 qaytaradi va hech narsa yozmaydi", async () => {
    findJobMock.mockResolvedValue({ id: "job-1", teacherId: "teacher-2", pageCount: 2, pagesDone: [3, 4] });

    const response = await POST(post({ groups: [group(0)] }), { params });

    expect(response.status).toBe(404);
    expect(upsertDraftMock).not.toHaveBeenCalled();
  });

  it("sahifalar tugamagan bo'lsa 409 qaytaradi va hech narsa yozmaydi", async () => {
    findJobMock.mockResolvedValue({ id: "job-1", teacherId: "teacher-1", pageCount: 2, pagesDone: [3] });

    const response = await POST(post({ groups: [group(0)] }), { params });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: "PAGES_PENDING" });
    expect(upsertDraftMock).not.toHaveBeenCalled();
  });

  it("pagesDone ga TEGMAYDI — u /pages/[page]/done ning ishi", async () => {
    await POST(post({ groups: [group(0)] }), { params });

    expect(executeRawMock).not.toHaveBeenCalled();
    expect(JSON.stringify(updateJobMock.mock.calls[0][0].data)).not.toContain("pagesDone");
  });

  it("har savolni o'z order'i bo'yicha bitta tranzaksiyada upsert qiladi", async () => {
    await POST(post({ groups: [group(10), group(11)] }), { params });

    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(transactionMock.mock.calls[0][0]).toHaveLength(2);
    expect(upsertCalls().map((c) => c.where.jobId_order.order)).toEqual([10, 11]);
  });

  it("takroriy chaqiruv aynan o'sha qatorlarni yangilaydi — dublikat yaratilmaydi", async () => {
    const body = { groups: [group(0), group(1)] };
    await POST(post(body), { params });
    const first = upsertCalls().map((c) => c.where);

    upsertDraftMock.mockClear();
    await POST(post(body), { params });

    expect(upsertCalls().map((c) => c.where)).toEqual(first);
  });

  it("raw ichiga bosqich belgisi va sahifa qamrovini yozadi", async () => {
    await POST(post({ groups: [group(0)] }), { params });

    const created = upsertCalls()[0].create;
    expect(created.raw).toMatchObject({
      stage: "BLOCK",
      number: 1,
      startPage: 3,
      endPage: 3,
      spansPages: false,
      regions: [{ page: 3, bbox: BOX }],
      images: [],
      pageImages: [],
    });
    expect(created.sourcePage).toBe(3);
    expect(created.sourceBbox).toEqual(BOX);
    expect(created.correctAnswer).toBe("");
    expect(created.options).toEqual([]);
    expect(created.text).toBe("1. Savol\nA) 1. B) 2.");
    expect(created.textOriginal).toBe(created.text);
  });

  it("ko'p sahifali savol: sourcePage — boshlangan sahifa, sahifa akslari — faqat qamralgan sahifalar", async () => {
    const spanning = group(0, {
      startPage: 3,
      endPage: 4,
      regions: [
        { page: 3, bbox: BOX },
        { page: 4, bbox: IMG_BOX },
      ],
    });
    const onlyPage4 = group(1, { startPage: 4, endPage: 4, regions: [{ page: 4, bbox: IMG_BOX }] });

    await POST(
      post({
        groups: [spanning, onlyPage4],
        pageImages: [
          { page: 3, assetId: "page-3" },
          { page: 4, assetId: "page-4" },
        ],
      }),
      { params },
    );

    const [first, second] = upsertCalls().map((c) => c.create);
    expect(first.sourcePage).toBe(3);
    expect(first.sourceBbox).toEqual(BOX);
    expect(first.raw).toMatchObject({ spansPages: true, startPage: 3, endPage: 4 });
    expect(first.raw.pageImages).toEqual([
      { page: 3, assetId: "page-3", url: "https://utfs.io/f/p3.png" },
      { page: 4, assetId: "page-4", url: "https://utfs.io/f/p4.png" },
    ]);
    expect(second.raw.pageImages).toEqual([{ page: 4, assetId: "page-4", url: "https://utfs.io/f/p4.png" }]);
  });

  it("raqamsiz (number: null) savolni qabul qiladi", async () => {
    const response = await POST(post({ groups: [group(0, { number: null })] }), { params });

    expect(response.status).toBe(200);
    expect(upsertCalls()[0].create.raw.number).toBeNull();
  });

  it("rasm va sahifa aksi url'ini klientdan emas, bazadan oladi", async () => {
    const images = [{ assetId: "asset-1", page: 3, bbox: IMG_BOX, url: "https://evil.example/x.png" }];
    await POST(post({ pageImages: [{ page: 3, assetId: "page-3" }], groups: [group(0, { images })] }), { params });

    expect(findAssetsMock.mock.calls[0][0].where).toEqual({
      jobId: "job-1",
      id: { in: ["asset-1", "page-3"] },
    });
    const raw = upsertCalls()[0].create.raw;
    expect(raw.images).toEqual([{ assetId: "asset-1", url: "https://utfs.io/f/fig.png", page: 3, bbox: IMG_BOX }]);
    expect(raw.pageImages).toEqual([{ page: 3, assetId: "page-3", url: "https://utfs.io/f/p3.png" }]);
  });

  it("begona yoki mavjud bo'lmagan assetId ni rad etadi va hech narsa yozmaydi", async () => {
    // findMany `jobId` bilan cheklangan — boshqa job'ning asseti topilmaydi.
    findAssetsMock.mockResolvedValue([]);

    const response = await POST(
      post({ groups: [group(0, { images: [{ assetId: "other-job-asset", page: 3, bbox: IMG_BOX }] })] }),
      { params },
    );

    expect(response.status).toBe(400);
    expect(upsertDraftMock).not.toHaveBeenCalled();
  });

  it("rasm yo'q bo'lsa bazaga asset so'rovi yubormaydi", async () => {
    await POST(post({ groups: [group(0)] }), { params });

    expect(findAssetsMock).not.toHaveBeenCalled();
  });

  it("blockCount ni qayta hisoblaydi, oshirmaydi; status PARSING", async () => {
    // `increment` bo'lsa qayta urinish hisoblagichni shishirar edi.
    const response = await POST(post({ groups: [group(0), group(1)] }), { params });

    expect(countDraftMock).toHaveBeenCalledWith({ where: { jobId: "job-1" } });
    const data = updateJobMock.mock.calls[0][0].data;
    expect(data).toEqual({ blockCount: 2, status: "PARSING" });
    await expect(response.json()).resolves.toEqual({ blockCount: 2, status: "PARSING" });
  });

  it("takrorlangan order'ni rad etadi", async () => {
    const response = await POST(post({ groups: [group(0), group(0)] }), { params });

    expect(response.status).toBe(400);
    expect(upsertDraftMock).not.toHaveBeenCalled();
  });

  it("shakli noto'g'ri savollarni rad etadi", async () => {
    const bad = [
      { order: "x" },
      group(0, { startPage: 5, endPage: 4 }),
      group(0, { regions: [] }),
      group(0, { startPage: MAX_SOURCE_PAGE + 1, endPage: MAX_SOURCE_PAGE + 1 }),
      group(0, { images: [{ assetId: "asset-1", bbox: IMG_BOX } as UploadGroup["images"][number]] }),
    ];
    for (const g of bad) {
      const response = await POST(post({ groups: [g] }), { params });
      expect(response.status).toBe(400);
    }
    expect(upsertDraftMock).not.toHaveBeenCalled();
  });

  it("noto'g'ri pageImages ni rad etadi", async () => {
    const response = await POST(post({ groups: [group(0)], pageImages: [{ page: 0, assetId: "page-3" }] }), { params });

    expect(response.status).toBe(400);
  });
});
