import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireTeacherMock, findTeacherMock, findJobMock } = vi.hoisted(() => ({
  requireTeacherMock: vi.fn(),
  findTeacherMock: vi.fn(),
  findJobMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    teacher: { findUnique: (...a: unknown[]) => findTeacherMock(...a) },
    importJob: { findUnique: (...a: unknown[]) => findJobMock(...a) },
  },
}));
vi.mock("@/lib/api-auth", () => ({ requireTeacher: () => requireTeacherMock() }));

import { NextResponse } from "next/server";
import { GET } from "../route";

const params = Promise.resolve({ jobId: "job-1" });
const request = new Request("http://localhost/api/teacher/import/job-1");

describe("GET /api/teacher/import/[jobId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireTeacherMock.mockReturnValue({ user: { id: "user-1", role: "TEACHER" }, error: null });
    findTeacherMock.mockResolvedValue({ id: "teacher-1" });
    findJobMock.mockResolvedValue({
      id: "job-1",
      teacherId: "teacher-1",
      status: "PARSING",
      pageCount: 10,
      blockCount: 7,
      pagesDone: [1, 2, 3],
    });
  });

  it("o'qituvchi bo'lmaganlarga requireTeacher xatosini qaytaradi", async () => {
    requireTeacherMock.mockReturnValue({
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    });

    expect((await GET(request, { params })).status).toBe(403);
  });

  it("begona job uchun 404 qaytaradi", async () => {
    findJobMock.mockResolvedValue({ id: "job-1", teacherId: "teacher-2" });

    expect((await GET(request, { params })).status).toBe(404);
  });

  it("qayta ulanish uchun tugagan sahifalarni qaytaradi", async () => {
    const response = await GET(request, { params });

    await expect(response.json()).resolves.toEqual({
      jobId: "job-1",
      status: "PARSING",
      pageCount: 10,
      blockCount: 7,
      pagesDone: [1, 2, 3],
    });
  });

  it("buzuq pagesDone qiymatini bo'sh ro'yxatga aylantiradi", async () => {
    // Json ustun — shakl kafolatlanmagan, marshrut unga ishonmasligi kerak.
    findJobMock.mockResolvedValue({
      id: "job-1",
      teacherId: "teacher-1",
      status: "UPLOADED",
      pageCount: 5,
      blockCount: 0,
      pagesDone: { oops: true },
    });

    await expect((await GET(request, { params })).json()).resolves.toMatchObject({ pagesDone: [] });
  });
});
