import { beforeEach, describe, expect, it, vi } from "vitest";

const { findManyItemStatMock, requireTeacherMock } = vi.hoisted(() => ({
  findManyItemStatMock: vi.fn(),
  requireTeacherMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    itemStat: { findMany: (...args: unknown[]) => findManyItemStatMock(...args) },
  },
}));

vi.mock("@/lib/api-auth", () => ({
  requireTeacher: () => requireTeacherMock(),
}));

import { NextResponse } from "next/server";
import { GET } from "../route";

function buildStat(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    itemId: "item-1",
    attempts: 40,
    correct: 20,
    pValue: 0.5,
    discrimination: 0.5,
    avgTimeSec: 12,
    distractorHits: { B: 5, C: 2 },
    item: {
      id: "item-1",
      text: "2+2=?",
      type: "MULTIPLE_CHOICE",
      subject: { nameUz: "Matematika" },
    },
    ...overrides,
  };
}

describe("GET /api/teacher/item-quality", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireTeacherMock.mockReturnValue({ user: { id: "teacher1", role: "TEACHER" }, error: null });
  });

  it("o'qituvchi bo'lmaganlarga requireTeacher xatosini to'g'ridan-to'g'ri qaytaradi", async () => {
    requireTeacherMock.mockReturnValue({ error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) });
    const response = await GET();
    expect(response.status).toBe(403);
    expect(findManyItemStatMock).not.toHaveBeenCalled();
  });

  it("ikkita ro'yxatni (lowDiscrimination, extremeDifficulty) to'g'ri chegaralar bilan so'raydi", async () => {
    findManyItemStatMock.mockResolvedValue([]);
    await GET();

    expect(findManyItemStatMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { discrimination: { lt: 0.2 } }, orderBy: { discrimination: "asc" } })
    );
    expect(findManyItemStatMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { OR: [{ pValue: { gt: 0.95 } }, { pValue: { lt: 0.15 } }] },
        orderBy: { pValue: "asc" },
      })
    );
  });

  it("har qatorda savol matni, fan nomi, statistikasi va eng ko'p tanlangan noto'g'ri variantni qaytaradi", async () => {
    findManyItemStatMock.mockResolvedValue([buildStat()]);
    const response = await GET();
    const data = await response.json();

    const expectedRow = {
      itemId: "item-1",
      text: "2+2=?",
      subjectName: "Matematika",
      type: "MULTIPLE_CHOICE",
      pValue: 0.5,
      discrimination: 0.5,
      attempts: 40,
      topDistractor: { answer: "B", count: 5 },
    };
    expect(data.lowDiscrimination[0]).toEqual(expectedRow);
    expect(data.extremeDifficulty[0]).toEqual(expectedRow);
  });

  it("distractorHits bo'lmasa topDistractor null qaytaradi", async () => {
    findManyItemStatMock.mockResolvedValue([buildStat({ distractorHits: null })]);
    const response = await GET();
    const data = await response.json();
    expect(data.lowDiscrimination[0].topDistractor).toBeNull();
  });
});
