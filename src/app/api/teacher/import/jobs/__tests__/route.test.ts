import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireTeacherMock, findTeacherMock, findJobsMock, updateJobMock } = vi.hoisted(() => ({
  requireTeacherMock: vi.fn(),
  findTeacherMock: vi.fn(),
  findJobsMock: vi.fn(),
  updateJobMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    teacher: { findUnique: (...a: unknown[]) => findTeacherMock(...a) },
    importJob: {
      findMany: (...a: unknown[]) => findJobsMock(...a),
      update: (...a: unknown[]) => updateJobMock(...a),
    },
  },
}));
vi.mock("@/lib/api-auth", () => ({ requireTeacher: () => requireTeacherMock() }));
vi.mock("@/lib/logger", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/logger")>();
  return { ...actual, logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } };
});

import { NextResponse } from "next/server";
import { GET } from "../route";

async function call(): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = (await GET()) as unknown as Response;
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/teacher/import/jobs", () => {
  it("faqat o'z joblarini, yangisidan boshlab 20 tasini so'raydi", async () => {
    requireTeacherMock.mockResolvedValue({ user: { id: "u1" }, error: null });
    findTeacherMock.mockResolvedValue({ id: "t1" });
    findJobsMock.mockResolvedValue([]);

    await call();

    const args = findJobsMock.mock.calls[0][0];
    expect(findTeacherMock.mock.calls[0][0].where).toEqual({ userId: "u1" });
    expect(args.where).toEqual({ teacherId: "t1" });
    expect(args.orderBy).toEqual({ createdAt: "desc" });
    expect(args.take).toBe(20);
  });

  it("_count.drafts ni drafts ga aylantiradi va bazaga yozmaydi", async () => {
    requireTeacherMock.mockResolvedValue({ user: { id: "u1" }, error: null });
    findTeacherMock.mockResolvedValue({ id: "t1" });
    findJobsMock.mockResolvedValue([
      { id: "j1", fileName: "fizika.pdf", createdAt: new Date("2026-09-01T10:00:00Z"), _count: { drafts: 52 } },
    ]);

    const { status, body } = await call();

    expect(status).toBe(200);
    expect(body.jobs).toEqual([
      { id: "j1", fileName: "fizika.pdf", createdAt: "2026-09-01T10:00:00.000Z", drafts: 52 },
    ]);
    expect(updateJobMock).not.toHaveBeenCalled();
  });

  it("avtorizatsiya xatosi qaytariladi va baza o'qilmaydi", async () => {
    requireTeacherMock.mockResolvedValue({
      user: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const { status } = await call();

    expect(status).toBe(401);
    expect(findTeacherMock).not.toHaveBeenCalled();
    expect(findJobsMock).not.toHaveBeenCalled();
  });

  it("ustoz profili yo'q bo'lsa 403 va joblar o'qilmaydi", async () => {
    requireTeacherMock.mockResolvedValue({ user: { id: "u1" }, error: null });
    findTeacherMock.mockResolvedValue(null);

    const { status, body } = await call();

    expect(status).toBe(403);
    expect(body.code).toBe("NO_TEACHER_PROFILE");
    expect(findJobsMock).not.toHaveBeenCalled();
  });

  it("baza xatosi 500 beradi", async () => {
    requireTeacherMock.mockResolvedValue({ user: { id: "u1" }, error: null });
    findTeacherMock.mockResolvedValue({ id: "t1" });
    findJobsMock.mockRejectedValue(new Error("down"));

    const { status } = await call();

    expect(status).toBe(500);
  });
});
