import { beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_IMPORT_PAGES } from "@/lib/import/constants";

const {
  requireTeacherMock,
  applyRateLimitMock,
  findTeacherMock,
  findSubjectMock,
  createJobMock,
  checkImportQuotaMock,
} = vi.hoisted(() => ({
  requireTeacherMock: vi.fn(),
  applyRateLimitMock: vi.fn(),
  findTeacherMock: vi.fn(),
  findSubjectMock: vi.fn(),
  createJobMock: vi.fn(),
  checkImportQuotaMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    teacher: { findUnique: (...a: unknown[]) => findTeacherMock(...a) },
    subject: { findUnique: (...a: unknown[]) => findSubjectMock(...a) },
    importJob: { create: (...a: unknown[]) => createJobMock(...a) },
  },
}));
vi.mock("@/lib/api-auth", () => ({
  requireTeacher: () => requireTeacherMock(),
  applyRateLimit: (...a: unknown[]) => applyRateLimitMock(...a),
}));
vi.mock("@/lib/quota", () => ({
  checkImportQuota: (...a: unknown[]) => checkImportQuotaMock(...a),
}));

import { NextRequest, NextResponse } from "next/server";
import { POST } from "../route";

function post(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/teacher/import", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const VALID = {
  subjectId: "subject-1",
  fileName: "dtm-2026.pdf",
  fileUrl: "https://utfs.io/f/manifest.json",
  sourceLang: "uz",
  targetLang: "uz",
  pageCount: 12,
};

describe("POST /api/teacher/import", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireTeacherMock.mockReturnValue({ user: { id: "user-1", role: "TEACHER" }, error: null });
    applyRateLimitMock.mockReturnValue(null);
    findTeacherMock.mockResolvedValue({ id: "teacher-1" });
    findSubjectMock.mockResolvedValue({ id: "subject-1" });
    checkImportQuotaMock.mockResolvedValue({ allowed: true, usedToday: 0, limit: 2 });
    createJobMock.mockResolvedValue({ id: "job-1" });
  });

  it("o'qituvchi bo'lmaganlarga requireTeacher xatosini to'g'ridan-to'g'ri qaytaradi", async () => {
    requireTeacherMock.mockReturnValue({
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    });

    const response = await POST(post(VALID));

    expect(response.status).toBe(403);
    expect(createJobMock).not.toHaveBeenCalled();
  });

  it("ustoz profili yo'q foydalanuvchini 403 bilan rad etadi", async () => {
    findTeacherMock.mockResolvedValue(null);

    const response = await POST(post(VALID));

    expect(response.status).toBe(403);
    expect(createJobMock).not.toHaveBeenCalled();
  });

  it("to'g'ri so'rovda job yaratadi va jobId qaytaradi", async () => {
    const response = await POST(post(VALID));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ jobId: "job-1", pagesDone: [] });
    expect(createJobMock).toHaveBeenCalledTimes(1);
  });

  it(`${MAX_IMPORT_PAGES} sahifadan katta faylni rad etadi`, async () => {
    // Klientdagi tekshiruvni chetlab o'tish oson — chegara serverda ham bor.
    const response = await POST(post({ ...VALID, pageCount: MAX_IMPORT_PAGES + 1 }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: "TOO_MANY_PAGES" });
    expect(createJobMock).not.toHaveBeenCalled();
  });

  it("kvota tugaganda 429 qaytaradi va job yaratmaydi", async () => {
    checkImportQuotaMock.mockResolvedValue({ allowed: false, usedToday: 2, limit: 2 });

    const response = await POST(post(VALID));

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toMatchObject({ code: "QUOTA_EXCEEDED", limit: 2 });
    expect(createJobMock).not.toHaveBeenCalled();
  });

  it("kvota ustoz id'si bo'yicha tekshiriladi, user id'si bo'yicha emas", async () => {
    // ImportJob.teacherId — Teacher.id; ikkalasini almashtirish jimgina
    // noto'g'ri hisobga olib kelardi.
    await POST(post(VALID));

    expect(checkImportQuotaMock).toHaveBeenCalledWith("user-1", "teacher-1", "TEACHER");
  });

  it("rol SESSIYADAN uzatiladi — so'rov tanasidagi role e'tiborga olinmaydi", async () => {
    // Aks holda har qanday ustoz `role: 'ADMIN'` yuborib kvotadan qutulardi.
    await POST(post({ ...VALID, role: "ADMIN" }));

    expect(checkImportQuotaMock).toHaveBeenCalledWith("user-1", "teacher-1", "TEACHER");
  });

  it("ADMIN sessiyasining roli kvota tekshiruviga o'tadi", async () => {
    requireTeacherMock.mockReturnValue({ user: { id: "user-1", role: "ADMIN" }, error: null });

    await POST(post(VALID));

    expect(checkImportQuotaMock).toHaveBeenCalledWith("user-1", "teacher-1", "ADMIN");
  });

  it("http/https bo'lmagan fileUrl ni rad etadi", async () => {
    const response = await POST(post({ ...VALID, fileUrl: "file:///etc/passwd" }));

    expect(response.status).toBe(400);
    expect(createJobMock).not.toHaveBeenCalled();
  });

  it("noma'lum fanni rad etadi", async () => {
    findSubjectMock.mockResolvedValue(null);

    const response = await POST(post(VALID));

    expect(response.status).toBe(400);
    expect(createJobMock).not.toHaveBeenCalled();
  });

  it("qo'llab-quvvatlanmaydigan asl tilni rad etadi", async () => {
    const response = await POST(post({ ...VALID, sourceLang: "de" }));

    expect(response.status).toBe(400);
    expect(createJobMock).not.toHaveBeenCalled();
  });

  it("turkcha manbani qabul qiladi va maqsad tilni ustoz tanlaganidek saqlaydi", async () => {
    const response = await POST(post({ ...VALID, sourceLang: "tr", targetLang: "uz" }));

    expect(response.status).toBe(200);
    expect(createJobMock.mock.calls[0][0].data).toMatchObject({ sourceLang: "tr", targetLang: "uz" });
  });

  it("maqsad tilni asl tilga tenglab qo'ymaydi — inglizcha test inglizcha qoladi", async () => {
    await POST(post({ ...VALID, sourceLang: "en", targetLang: "en" }));
    expect(createJobMock.mock.calls[0][0].data.targetLang).toBe("en");

    createJobMock.mockClear();
    await POST(post({ ...VALID, sourceLang: "en", targetLang: "uz" }));
    expect(createJobMock.mock.calls[0][0].data.targetLang).toBe("uz");
  });

  it("maqsad til yo'q yoki noma'lum bo'lsa rad etadi", async () => {
    for (const targetLang of [undefined, "tr", "de"]) {
      const response = await POST(post({ ...VALID, targetLang }));
      expect(response.status).toBe(400);
    }
    expect(createJobMock).not.toHaveBeenCalled();
  });

  it("manba turini ZIP deb belgilaydi", async () => {
    await POST(post(VALID));

    expect(createJobMock.mock.calls[0][0].data.fileKind).toBe("ZIP");
  });

  it("so'rovlar limiti oshganda javobni o'zgartirmasdan qaytaradi", async () => {
    applyRateLimitMock.mockReturnValue(NextResponse.json({ error: "rate" }, { status: 429 }));

    const response = await POST(post(VALID));

    expect(response.status).toBe(429);
    expect(createJobMock).not.toHaveBeenCalled();
  });
});
