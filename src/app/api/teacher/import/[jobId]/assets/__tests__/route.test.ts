import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireTeacherMock,
  findTeacherMock,
  findJobMock,
  findAssetMock,
  createAssetMock,
  uploadFilesMock,
} = vi.hoisted(() => ({
  requireTeacherMock: vi.fn(),
  findTeacherMock: vi.fn(),
  findJobMock: vi.fn(),
  findAssetMock: vi.fn(),
  createAssetMock: vi.fn(),
  uploadFilesMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    teacher: { findUnique: (...a: unknown[]) => findTeacherMock(...a) },
    importJob: { findUnique: (...a: unknown[]) => findJobMock(...a) },
    importAsset: {
      findFirst: (...a: unknown[]) => findAssetMock(...a),
      create: (...a: unknown[]) => createAssetMock(...a),
    },
  },
}));
vi.mock("@/lib/api-auth", () => ({ requireTeacher: () => requireTeacherMock() }));
vi.mock("uploadthing/server", () => ({
  UTApi: class {
    uploadFiles = (...a: unknown[]) => uploadFilesMock(...a);
  },
}));

import { NextRequest, NextResponse } from "next/server";
import { POST } from "../route";

const PNG_BYTES: Uint8Array<ArrayBuffer> = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3,
]);

/**
 * Bir xil baytdan har safar bir xil `File` — server sha256 ni o'zi
 * hisoblagani uchun "bir xil rasm" aynan shu orqali ifodalanadi.
 */
function pngFile(bytes: Uint8Array<ArrayBuffer> = PNG_BYTES): File {
  return new File([bytes], "figure.png", { type: "image/png" });
}

function post(file: File | null, over: Record<string, string> = {}): NextRequest {
  const form = new FormData();
  if (file) form.set("file", file);
  form.set("page", "3");
  form.set("bbox", JSON.stringify({ x: 10, y: 20, w: 100, h: 80 }));
  form.set("widthPx", "417");
  form.set("heightPx", "333");
  form.set("kind", "FIGURE");
  for (const [k, v] of Object.entries(over)) form.set(k, v);
  return new NextRequest("http://localhost/api/teacher/import/job-1/assets", {
    method: "POST",
    body: form,
  });
}

const params = Promise.resolve({ jobId: "job-1" });

describe("POST /api/teacher/import/[jobId]/assets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireTeacherMock.mockReturnValue({ user: { id: "user-1", role: "TEACHER" }, error: null });
    findTeacherMock.mockResolvedValue({ id: "teacher-1" });
    findJobMock.mockResolvedValue({
      id: "job-1",
      teacherId: "teacher-1",
      status: "PARSING",
      pageCount: 10,
      blockCount: 0,
      pagesDone: [],
    });
    findAssetMock.mockResolvedValue(null);
    uploadFilesMock.mockResolvedValue({ data: { url: "https://utfs.io/f/new.png" }, error: null });
    createAssetMock.mockResolvedValue({ id: "asset-1", url: "https://utfs.io/f/new.png" });
  });

  it("o'qituvchi bo'lmaganlarga requireTeacher xatosini qaytaradi", async () => {
    requireTeacherMock.mockReturnValue({
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    });

    const response = await POST(post(pngFile()), { params });

    expect(response.status).toBe(403);
    expect(uploadFilesMock).not.toHaveBeenCalled();
  });

  it("begona job uchun 404 qaytaradi va hech narsa yozmaydi", async () => {
    findJobMock.mockResolvedValue({ id: "job-1", teacherId: "teacher-2", pageCount: 10 });

    const response = await POST(post(pngFile()), { params });

    expect(response.status).toBe(404);
    expect(uploadFilesMock).not.toHaveBeenCalled();
    expect(createAssetMock).not.toHaveBeenCalled();
  });

  it("mavjud bo'lmagan job uchun ham aynan 404 qaytaradi", async () => {
    // Begona job bilan bir xil javob — 403/404 farqi "bunday id bor" degan
    // ma'lumotni oshkor qilardi.
    findJobMock.mockResolvedValue(null);

    const response = await POST(post(pngFile()), { params });

    expect(response.status).toBe(404);
  });

  it("yangi rasmni yuklaydi va qator yaratadi", async () => {
    const response = await POST(post(pngFile()), { params });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ assetId: "asset-1", deduped: false });
    expect(uploadFilesMock).toHaveBeenCalledTimes(1);
  });

  it("bir xil bayt ikkinchi marta kelganda UploadThing'ga umuman tegmaydi", async () => {
    // Birinchi so'rov qatorni yaratdi; ikkinchisida u topiladi.
    findAssetMock.mockResolvedValue({ id: "asset-1", url: "https://utfs.io/f/new.png" });

    const response = await POST(post(pngFile()), { params });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ assetId: "asset-1", deduped: true });
    expect(uploadFilesMock).not.toHaveBeenCalled();
    expect(createAssetMock).not.toHaveBeenCalled();
  });

  it("sha256 ni server hisoblaydi — klient yuborgani e'tiborga olinmaydi", async () => {
    await POST(post(pngFile(), { sha256: "0".repeat(64) }), { params });

    const where = findAssetMock.mock.calls[0][0].where;
    expect(where.sha256).not.toBe("0".repeat(64));
    expect(where.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(where).toMatchObject({ jobId: "job-1", page: 3 });
  });

  it("har xil bayt har xil hash beradi", async () => {
    await POST(post(pngFile()), { params });
    const first = findAssetMock.mock.calls[0][0].where.sha256;

    vi.clearAllMocks();
    findAssetMock.mockResolvedValue(null);
    await POST(post(pngFile(new Uint8Array([9, 9, 9, 9]) as Uint8Array<ArrayBuffer>)), { params });
    const second = findAssetMock.mock.calls[0][0].where.sha256;

    expect(first).not.toBe(second);
  });

  it("poyga shartida (P2002) mavjud qatorni qaytaradi, xato bermaydi", async () => {
    // Parallel so'rov qidiruvdan keyin yozib ulgurgan — unique indeks aynan
    // shu holat uchun qo'yilgan.
    createAssetMock.mockRejectedValue({ code: "P2002" });
    findAssetMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "asset-race", url: "https://utfs.io/f/race.png" });

    const response = await POST(post(pngFile()), { params });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ assetId: "asset-race", deduped: true });
  });

  it("PNG bo'lmagan faylni rad etadi", async () => {
    const jpeg = new File([PNG_BYTES], "x.jpg", { type: "image/jpeg" });

    const response = await POST(post(jpeg), { params });

    expect(response.status).toBe(400);
    expect(uploadFilesMock).not.toHaveBeenCalled();
  });

  it("2 MB dan katta rasmni rad etadi", async () => {
    const big = new File([new ArrayBuffer(2 * 1024 * 1024 + 1)], "big.png", { type: "image/png" });

    const response = await POST(post(big), { params });

    expect(response.status).toBe(400);
    expect(uploadFilesMock).not.toHaveBeenCalled();
  });

  it("noto'g'ri bbox ni rad etadi", async () => {
    const response = await POST(post(pngFile(), { bbox: "{\"x\":1}" }), { params });

    expect(response.status).toBe(400);
    expect(uploadFilesMock).not.toHaveBeenCalled();
  });

  it("fayl umuman bo'lmasa 400 qaytaradi", async () => {
    const response = await POST(post(null), { params });

    expect(response.status).toBe(400);
  });
});
