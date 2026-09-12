import { beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_SOURCE_PAGE } from "@/lib/import/constants";

const { requireTeacherMock, findTeacherMock, findJobMock, updateJobMock, executeRawMock } = vi.hoisted(() => ({
  requireTeacherMock: vi.fn(),
  findTeacherMock: vi.fn(),
  findJobMock: vi.fn(),
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
    $executeRaw: (...a: unknown[]) => executeRawMock(...a),
  },
}));
vi.mock("@/lib/api-auth", () => ({ requireTeacher: () => requireTeacherMock() }));

import { NextResponse } from "next/server";
import { POST } from "../route";

const JOB = { id: "job-1", teacherId: "teacher-1", status: "UPLOADED", pageCount: 2, blockCount: 0, pagesDone: [] };

function call(page: string) {
  const request = new Request(`http://localhost/api/teacher/import/job-1/pages/${page}/done`, { method: "POST" });
  return POST(request, { params: Promise.resolve({ jobId: "job-1", page }) });
}

/** Birinchi findUnique — requireOwnedJob, ikkinchisi — yangilangan `pagesDone`. */
function jobThenPages(pagesDone: unknown) {
  findJobMock.mockResolvedValueOnce(JOB).mockResolvedValueOnce({ pagesDone });
}

describe("POST /api/teacher/import/[jobId]/pages/[page]/done", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireTeacherMock.mockReturnValue({ user: { id: "user-1", role: "TEACHER" }, error: null });
    findTeacherMock.mockResolvedValue({ id: "teacher-1" });
    executeRawMock.mockResolvedValue(1);
  });

  it("o'qituvchi bo'lmaganlarga requireTeacher xatosini qaytaradi", async () => {
    requireTeacherMock.mockReturnValue({ error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) });

    expect((await call("23")).status).toBe(403);
    expect(executeRawMock).not.toHaveBeenCalled();
  });

  it("begona job uchun 404 qaytaradi va hech narsa yozmaydi", async () => {
    findJobMock.mockResolvedValue({ ...JOB, teacherId: "teacher-2" });

    expect((await call("23")).status).toBe(404);
    expect(executeRawMock).not.toHaveBeenCalled();
  });

  it("MAX_SOURCE_PAGE dan katta, nol yoki butun bo'lmagan sahifani rad etadi", async () => {
    for (const page of [String(MAX_SOURCE_PAGE + 1), "0", "2.5", "abc"]) {
      findJobMock.mockResolvedValueOnce(JOB);
      expect((await call(page)).status).toBe(400);
    }
    expect(executeRawMock).not.toHaveBeenCalled();
  });

  it("pagesDone ni bitta atomik SQL bilan yangilaydi, takroriy qo'shilishdan CASE himoya qiladi", async () => {
    jobThenPages([23]);

    await call("23");

    expect(executeRawMock).toHaveBeenCalledTimes(1);
    const [strings, ...values] = executeRawMock.mock.calls[0];
    const sql = (strings as string[]).join("?");
    expect(sql).toContain('UPDATE "ImportJob"');
    expect(sql).toContain('"pagesDone" @>');
    expect(sql).toContain("CASE");
    expect(values).toContain(23);
    expect(values).toContain("job-1");
    // O'qib-keyin-yozish yo'q: Prisma update umuman chaqirilmaydi.
    expect(updateJobMock).not.toHaveBeenCalled();
  });

  it("javobda hozirgi pagesDone uzunligini qaytaradi", async () => {
    jobThenPages([23]);

    await expect((await call("23")).json()).resolves.toEqual({ pagesDoneCount: 1, complete: false });
  });

  it("takroriy chaqiruvda uzunlik o'smaydi, oxirgi sahifada complete true", async () => {
    // SQL takrorni qo'shmaydi — baza shu holatni qaytaradi.
    jobThenPages([23, 24]);
    const first = await (await call("24")).json();
    jobThenPages([23, 24]);
    const second = await (await call("24")).json();

    expect(first).toEqual({ pagesDoneCount: 2, complete: true });
    expect(second).toEqual(first);
  });

  it("asl PDF sahifa raqami pageCount dan katta bo'lsa ham qabul qiladi", async () => {
    jobThenPages([99]);

    expect((await call("99")).status).toBe(200);
  });
});
