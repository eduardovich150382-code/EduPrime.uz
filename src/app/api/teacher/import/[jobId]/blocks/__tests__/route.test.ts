import { beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_SOURCE_PAGE } from "@/lib/import/constants";
import type { UploadGroup } from "@/lib/import/manifest";

const {
  requireTeacherMock,
  findTeacherMock,
  findJobMock,
  upsertDraftMock,
  countDraftMock,
  updateJobMock,
  executeRawMock,
  findAssetsMock,
} = vi.hoisted(() => ({
  requireTeacherMock: vi.fn(),
  findTeacherMock: vi.fn(),
  findJobMock: vi.fn(),
  upsertDraftMock: vi.fn(),
  countDraftMock: vi.fn(),
  updateJobMock: vi.fn(),
  executeRawMock: vi.fn(),
  findAssetsMock: vi.fn(),
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
  },
}));
vi.mock("@/lib/api-auth", () => ({ requireTeacher: () => requireTeacherMock() }));

import { NextRequest, NextResponse } from "next/server";
import { POST } from "../route";

function group(order: number, images: UploadGroup["images"] = []): UploadGroup {
  const y = 100 + order * 50;
  return {
    order,
    number: order + 1,
    text: `${order + 1}. Savol
A) 1. B) 2.`,
    bbox: { x: 40, y, w: 300, h: 26 },
    images,
  };
}

const IMG_BOX = { x: 60, y: 110, w: 80, h: 70 };

function post(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/teacher/import/job-1/blocks", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const params = Promise.resolve({ jobId: "job-1" });

describe("POST /api/teacher/import/[jobId]/blocks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireTeacherMock.mockReturnValue({ user: { id: "user-1", role: "TEACHER" }, error: null });
    findTeacherMock.mockResolvedValue({ id: "teacher-1" });
    findJobMock.mockResolvedValue({
      id: "job-1",
      teacherId: "teacher-1",
      status: "UPLOADED",
      pageCount: 10,
      blockCount: 0,
      pagesDone: [],
    });
    upsertDraftMock.mockResolvedValue({});
    findAssetsMock.mockResolvedValue([
      { id: "asset-1", url: "https://utfs.io/f/fig.png" },
      { id: "page-1", url: "https://utfs.io/f/page.png" },
    ]);
    countDraftMock.mockResolvedValue(2);
    executeRawMock.mockResolvedValue(1);
    updateJobMock.mockResolvedValue({ pagesDone: [3], blockCount: 2, status: "PARSING" });
  });

  it("o'qituvchi bo'lmaganlarga requireTeacher xatosini qaytaradi", async () => {
    requireTeacherMock.mockReturnValue({
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    });

    const response = await POST(post({ page: 3, groups: [group(0)] }), { params });

    expect(response.status).toBe(403);
    expect(upsertDraftMock).not.toHaveBeenCalled();
  });

  it("begona job uchun 404 qaytaradi va hech narsa yozmaydi", async () => {
    findJobMock.mockResolvedValue({ id: "job-1", teacherId: "teacher-2", pageCount: 10 });

    const response = await POST(post({ page: 3, groups: [group(0)] }), { params });

    expect(response.status).toBe(404);
    expect(upsertDraftMock).not.toHaveBeenCalled();
    expect(executeRawMock).not.toHaveBeenCalled();
  });

  it("har guruhni o'z order'i bo'yicha upsert qiladi", async () => {
    // `order` manifestdan global hisoblanadi (planManifest) — marshrut uni
    // o'zgartirmaydi, aks holda qayta ulanishda boshqa qator yangilanardi.
    await POST(post({ page: 3, groups: [group(10), group(11)] }), { params });

    expect(upsertDraftMock).toHaveBeenCalledTimes(2);
    const orders = upsertDraftMock.mock.calls.map((c) => c[0].where.jobId_order.order);
    expect(orders).toEqual([10, 11]);
  });

  it("raw ichiga bosqich belgisini yozadi", async () => {
    // `raw.stage` keyingi bosqichga "bu draft strukturalanganmi?" degan
    // savolga aniq javob beradi — ImportJob.status ga tayanib bo'lmaydi.
    await POST(post({ page: 3, groups: [group(0)] }), { params });

    const created = upsertDraftMock.mock.calls[0][0].create;
    expect(created.raw).toMatchObject({ stage: "BLOCK", page: 3, number: 1, images: [], pageImage: null });
    expect(created.sourcePage).toBe(3);
    expect(created.sourceBbox).toEqual(group(0).bbox);
    expect(created.correctAnswer).toBe("");
    expect(created.options).toEqual([]);
  });

  it("guruh matnini text va textOriginal ga yozadi", async () => {
    await POST(post({ page: 3, groups: [group(0)] }), { params });

    const created = upsertDraftMock.mock.calls[0][0].create;
    expect(created.text).toBe("1. Savol\nA) 1. B) 2.");
    expect(created.textOriginal).toBe(created.text);
  });

  it("rasm va sahifa aksi url'ini klientdan emas, bazadan oladi", async () => {
    const images = [{ assetId: "asset-1", bbox: IMG_BOX, url: "https://evil.example/x.png" }];
    await POST(post({ page: 3, pageImageAssetId: "page-1", groups: [group(0, images)] }), { params });

    expect(findAssetsMock.mock.calls[0][0].where).toEqual({
      jobId: "job-1",
      id: { in: ["asset-1", "page-1"] },
    });
    const raw = upsertDraftMock.mock.calls[0][0].create.raw;
    expect(raw.images).toEqual([{ assetId: "asset-1", url: "https://utfs.io/f/fig.png", bbox: IMG_BOX }]);
    expect(raw.pageImage).toEqual({ assetId: "page-1", url: "https://utfs.io/f/page.png" });
  });

  it("begona yoki mavjud bo'lmagan assetId ni rad etadi va hech narsa yozmaydi", async () => {
    // findMany `jobId` bilan cheklangan — boshqa job'ning asseti topilmaydi.
    findAssetsMock.mockResolvedValue([]);

    const response = await POST(
      post({ page: 3, groups: [group(0, [{ assetId: "other-job-asset", bbox: IMG_BOX }])] }),
      { params },
    );

    expect(response.status).toBe(400);
    expect(upsertDraftMock).not.toHaveBeenCalled();
    expect(executeRawMock).not.toHaveBeenCalled();
  });

  it("rasm yo'q bo'lsa bazaga asset so'rovi yubormaydi", async () => {
    await POST(post({ page: 3, groups: [group(0)] }), { params });

    expect(findAssetsMock).not.toHaveBeenCalled();
  });

  it("takroriy yuborishda order o'zgarmaydi — dublikat yaratilmaydi", async () => {
    // `order` manifestdan deterministik hisoblanadi, o'suvchi
    // hisoblagichdan emas, shuning uchun aynan o'sha qator yangilanadi.
    await POST(post({ page: 3, groups: [group(0)] }), { params });
    const first = upsertDraftMock.mock.calls[0][0].where.jobId_order.order;

    upsertDraftMock.mockClear();
    await POST(post({ page: 3, groups: [group(0)] }), { params });
    const second = upsertDraftMock.mock.calls[0][0].where.jobId_order.order;

    expect(second).toBe(first);
  });

  it("blockCount ni qayta hisoblaydi, oshirmaydi", async () => {
    // `increment` bo'lsa qayta urinish hisoblagichni shishirar edi.
    await POST(post({ page: 3, groups: [group(0), group(1)] }), { params });

    expect(countDraftMock).toHaveBeenCalledWith({ where: { jobId: "job-1" } });
    const data = updateJobMock.mock.calls[0][0].data;
    expect(data.blockCount).toBe(2);
    expect(JSON.stringify(data)).not.toContain("increment");
  });

  it("pagesDone ni atomik SQL bilan yangilaydi, o'qib-keyin-yozmaydi", async () => {
    await POST(post({ page: 3, groups: [group(0)] }), { params });

    expect(executeRawMock).toHaveBeenCalledTimes(1);
    const sql = executeRawMock.mock.calls[0][0].join("?");
    expect(sql).toContain("UPDATE \"ImportJob\"");
    expect(sql).toContain("pagesDone");
    // Takroriy qo'shilishdan CASE himoya qiladi.
    expect(sql).toContain("CASE");
    const data = updateJobMock.mock.calls[0][0].data;
    expect(data.pagesDone).toBeUndefined();
  });

  it("oxirgi sahifadan keyin ham status PARSING da qoladi", async () => {
    // REVIEW — ustoz draftlarni ko'rayotgan holat; draftlar hali
    // strukturalanmagan, shuning uchun bu bosqichda unga o'tilmaydi.
    updateJobMock.mockResolvedValue({
      pagesDone: Array.from({ length: 10 }, (_, i) => i + 1),
      blockCount: 2,
      status: "PARSING",
    });

    const response = await POST(post({ page: 10, groups: [group(0)] }), { params });

    expect(updateJobMock.mock.calls[0][0].data.status).toBe("PARSING");
    await expect(response.json()).resolves.toMatchObject({ status: "PARSING", complete: true });
  });

  it("sahifalar tugamaganda complete false bo'ladi", async () => {
    const response = await POST(post({ page: 3, groups: [group(0)] }), { params });

    await expect(response.json()).resolves.toMatchObject({ complete: false, pagesDone: [3] });
  });

  it("asl PDF sahifa raqami pageCount dan katta bo'lsa ham qabul qiladi", async () => {
    // Skript 23-betni kesib olsa pageCount kichik, page esa 23.
    const response = await POST(post({ page: 99, groups: [group(0)] }), { params });

    expect(response.status).toBe(200);
    expect(upsertDraftMock.mock.calls[0][0].create.sourcePage).toBe(99);
  });

  it("MAX_SOURCE_PAGE dan katta yoki butun bo'lmagan sahifa raqamini rad etadi", async () => {
    for (const page of [MAX_SOURCE_PAGE + 1, 0, 2.5]) {
      const response = await POST(post({ page, groups: [group(0)] }), { params });
      expect(response.status).toBe(400);
    }
    expect(upsertDraftMock).not.toHaveBeenCalled();
  });

  it("shakli noto'g'ri guruhlarni rad etadi", async () => {
    const response = await POST(post({ page: 3, groups: [{ order: "x" }] }), { params });

    expect(response.status).toBe(400);
    expect(upsertDraftMock).not.toHaveBeenCalled();
  });

  it("bo'sh sahifani qabul qiladi — savolsiz (skan) sahifa ham tugagan deb belgilanadi", async () => {
    // Aks holda savoli yo'q sahifa har qayta ulanishda qaytadan ishlanardi.
    updateJobMock.mockResolvedValue({ pagesDone: [4], blockCount: 0, status: "PARSING" });

    const response = await POST(post({ page: 4, groups: [] }), { params });

    expect(response.status).toBe(200);
    expect(executeRawMock).toHaveBeenCalledTimes(1);
    expect(upsertDraftMock).not.toHaveBeenCalled();
  });
});
