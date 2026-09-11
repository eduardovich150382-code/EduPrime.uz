import { beforeEach, describe, expect, it, vi } from "vitest";
import { draftOrder } from "@/lib/import/pipeline";
import type { Block } from "@/lib/import/types";

const {
  requireTeacherMock,
  findTeacherMock,
  findJobMock,
  upsertDraftMock,
  countDraftMock,
  updateJobMock,
  executeRawMock,
} = vi.hoisted(() => ({
  requireTeacherMock: vi.fn(),
  findTeacherMock: vi.fn(),
  findJobMock: vi.fn(),
  upsertDraftMock: vi.fn(),
  countDraftMock: vi.fn(),
  updateJobMock: vi.fn(),
  executeRawMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    teacher: { findUnique: (...a: unknown[]) => findTeacherMock(...a) },
    importJob: {
      findUnique: (...a: unknown[]) => findJobMock(...a),
      update: (...a: unknown[]) => updateJobMock(...a),
    },
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

function block(index: number, number: number | null = index + 1): Block {
  const y = 100 + index * 50;
  return {
    index,
    number,
    page: 3,
    rows: [
      { y, height: 12, items: [{ str: `${number}.`, x: 40, y, w: 20, h: 12 }], text: `${number}. Savol` },
      {
        y: y + 14,
        height: 12,
        items: [{ str: "davomi", x: 40, y: y + 14, w: 40, h: 12 }],
        text: "davomi",
      },
    ],
    bbox: { x: 40, y, w: 300, h: 26 },
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
    countDraftMock.mockResolvedValue(2);
    executeRawMock.mockResolvedValue(1);
    updateJobMock.mockResolvedValue({ pagesDone: [3], blockCount: 2, status: "PARSING" });
  });

  it("o'qituvchi bo'lmaganlarga requireTeacher xatosini qaytaradi", async () => {
    requireTeacherMock.mockReturnValue({
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    });

    const response = await POST(post({ page: 3, blocks: [block(0)] }), { params });

    expect(response.status).toBe(403);
    expect(upsertDraftMock).not.toHaveBeenCalled();
  });

  it("begona job uchun 404 qaytaradi va hech narsa yozmaydi", async () => {
    findJobMock.mockResolvedValue({ id: "job-1", teacherId: "teacher-2", pageCount: 10 });

    const response = await POST(post({ page: 3, blocks: [block(0)] }), { params });

    expect(response.status).toBe(404);
    expect(upsertDraftMock).not.toHaveBeenCalled();
    expect(executeRawMock).not.toHaveBeenCalled();
  });

  it("har blokni draftOrder bo'yicha upsert qiladi", async () => {
    await POST(post({ page: 3, blocks: [block(0), block(1)] }), { params });

    expect(upsertDraftMock).toHaveBeenCalledTimes(2);
    const orders = upsertDraftMock.mock.calls.map((c) => c[0].where.jobId_order.order);
    expect(orders).toEqual([draftOrder(3, 0), draftOrder(3, 1)]);
  });

  it("raw ichiga bosqich belgisini yozadi", async () => {
    // `raw.stage` keyingi bosqichga "bu draft strukturalanganmi?" degan
    // savolga aniq javob beradi — ImportJob.status ga tayanib bo'lmaydi.
    await POST(post({ page: 3, blocks: [block(0)] }), { params });

    const created = upsertDraftMock.mock.calls[0][0].create;
    expect(created.raw).toMatchObject({ stage: "BLOCK" });
    expect(created.raw.block.index).toBe(0);
    expect(created.sourcePage).toBe(3);
    expect(created.correctAnswer).toBe("");
    expect(created.options).toEqual([]);
  });

  it("blok matnini qatorlardan yig'adi", async () => {
    await POST(post({ page: 3, blocks: [block(0)] }), { params });

    const created = upsertDraftMock.mock.calls[0][0].create;
    expect(created.text).toBe("1. Savol\ndavomi");
    expect(created.textOriginal).toBe(created.text);
  });

  it("takroriy yuborishda order o'zgarmaydi — dublikat yaratilmaydi", async () => {
    // Sahifa qayta ishlansa ham `order` sahifa raqamidan hisoblanadi,
    // o'suvchi hisoblagichdan emas, shuning uchun aynan o'sha qator yangilanadi.
    await POST(post({ page: 3, blocks: [block(0)] }), { params });
    const first = upsertDraftMock.mock.calls[0][0].where.jobId_order.order;

    upsertDraftMock.mockClear();
    await POST(post({ page: 3, blocks: [block(0)] }), { params });
    const second = upsertDraftMock.mock.calls[0][0].where.jobId_order.order;

    expect(second).toBe(first);
  });

  it("blockCount ni qayta hisoblaydi, oshirmaydi", async () => {
    // `increment` bo'lsa qayta urinish hisoblagichni shishirar edi.
    await POST(post({ page: 3, blocks: [block(0), block(1)] }), { params });

    expect(countDraftMock).toHaveBeenCalledWith({ where: { jobId: "job-1" } });
    const data = updateJobMock.mock.calls[0][0].data;
    expect(data.blockCount).toBe(2);
    expect(JSON.stringify(data)).not.toContain("increment");
  });

  it("pagesDone ni atomik SQL bilan yangilaydi, o'qib-keyin-yozmaydi", async () => {
    await POST(post({ page: 3, blocks: [block(0)] }), { params });

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

    const response = await POST(post({ page: 10, blocks: [block(0)] }), { params });

    expect(updateJobMock.mock.calls[0][0].data.status).toBe("PARSING");
    await expect(response.json()).resolves.toMatchObject({ status: "PARSING", complete: true });
  });

  it("sahifalar tugamaganda complete false bo'ladi", async () => {
    const response = await POST(post({ page: 3, blocks: [block(0)] }), { params });

    await expect(response.json()).resolves.toMatchObject({ complete: false, pagesDone: [3] });
  });

  it("pageCount dan katta sahifa raqamini rad etadi", async () => {
    const response = await POST(post({ page: 99, blocks: [block(0)] }), { params });

    expect(response.status).toBe(400);
    expect(upsertDraftMock).not.toHaveBeenCalled();
  });

  it("shakli noto'g'ri bloklarni rad etadi", async () => {
    const response = await POST(post({ page: 3, blocks: [{ index: "x" }] }), { params });

    expect(response.status).toBe(400);
    expect(upsertDraftMock).not.toHaveBeenCalled();
  });

  it("bo'sh sahifani qabul qiladi — bloksiz sahifa ham tugagan deb belgilanadi", async () => {
    // Aks holda savoli yo'q sahifa har qayta ulanishda qaytadan ishlanardi.
    updateJobMock.mockResolvedValue({ pagesDone: [4], blockCount: 0, status: "PARSING" });

    const response = await POST(post({ page: 4, blocks: [] }), { params });

    expect(response.status).toBe(200);
    expect(executeRawMock).toHaveBeenCalledTimes(1);
    expect(upsertDraftMock).not.toHaveBeenCalled();
  });
});
