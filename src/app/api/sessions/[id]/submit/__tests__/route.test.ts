import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `db` va `requireAuth`ni mock qilamiz — real baza/sessiya kerak emas.
 * Naqsh `courses/[id]/learn/__tests__/route.test.ts` bilan bir xil.
 * `@/lib/gemini`ni ham mock qilamiz — FILL_BLANK/OPEN_ENDED aniq mos
 * kelmagan holatda gradeSubmission (lib/grading.ts) shu funksiyaga
 * murojaat qiladi, lekin quyidagi testlar buni sinamaydi (aniq mos
 * kelgan javoblardan foydalanadi), shuning uchun har doim false qaytaradi.
 */
const {
  findUniqueSessionMock,
  findManyItemMock,
  createResultMock,
  updateSessionMock,
  transactionMock,
  requireAuthMock,
  checkOpenEndedEquivalenceMock,
  dailyUsageUpdateManyMock,
} = vi.hoisted(() => ({
  findUniqueSessionMock: vi.fn(),
  findManyItemMock: vi.fn(),
  createResultMock: vi.fn(),
  updateSessionMock: vi.fn(),
  transactionMock: vi.fn(),
  requireAuthMock: vi.fn(),
  checkOpenEndedEquivalenceMock: vi.fn(),
  dailyUsageUpdateManyMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    testSession: {
      findUnique: (...args: unknown[]) => findUniqueSessionMock(...args),
      update: (...args: unknown[]) => updateSessionMock(...args),
    },
    item: { findMany: (...args: unknown[]) => findManyItemMock(...args) },
    testResult: { create: (...args: unknown[]) => createResultMock(...args) },
    // refundBuiltTest (lib/quota.ts) — javobsiz tashlangan sessiyada chaqiriladi.
    dailyUsage: { updateMany: (...args: unknown[]) => dailyUsageUpdateManyMock(...args) },
    $transaction: (ops: unknown[]) => transactionMock(ops),
  },
}));

vi.mock("@/lib/api-auth", () => ({
  requireAuth: () => requireAuthMock(),
}));

vi.mock("@/lib/gemini", () => ({
  checkOpenEndedEquivalence: (...args: unknown[]) => checkOpenEndedEquivalenceMock(...args),
}));

import { POST } from "../route";
import { generateSeed, shuffleArray } from "@/lib/shuffle";

const NOW = new Date("2026-08-31T10:00:00.000Z");
const LABELS = ["A", "B", "C", "D", "E"];

function buildSession(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "session1",
    userId: "user1",
    title: "Konstruktor testi",
    itemIds: ["item1"],
    seed: generateSeed("user1", "session1"),
    mode: "FIXED",
    durationMin: 30,
    startedAt: new Date(NOW.getTime() - 5 * 60_000),
    expiresAt: new Date(NOW.getTime() + 25 * 60_000),
    submittedAt: null,
    ...overrides,
  };
}

function buildItem(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "item1",
    text: "2+2=?",
    images: [] as string[],
    options: [
      { label: "A", text: "3", image: null },
      { label: "B", text: "4", image: null },
      { label: "C", text: "5", image: null },
      { label: "D", text: "6", image: null },
    ],
    correctAnswer: "B",
    type: "MULTIPLE_CHOICE",
    explanation: null,
    explanationImages: [] as string[],
    videoUrl: null,
    subject: { nameUz: "Matematika", nameRu: "Математика", nameEn: "Math" },
    ...overrides,
  };
}

async function callSubmit(body: unknown) {
  const request = new Request("http://localhost/api/sessions/session1/submit", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const response = await POST(request as any, { params: Promise.resolve({ id: "session1" }) });
  return { status: response.status, data: await response.json() };
}

describe("POST /api/sessions/[id]/submit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(NOW);
    requireAuthMock.mockReturnValue({ user: { id: "user1", role: "USER" }, error: null });
    transactionMock.mockImplementation((ops: unknown[]) => Promise.all(ops));
    updateSessionMock.mockResolvedValue({});
    dailyUsageUpdateManyMock.mockResolvedValue({ count: 1 });
  });

  it("sessiya topilmasa 404 qaytaradi", async () => {
    findUniqueSessionMock.mockResolvedValue(null);
    const { status, data } = await callSubmit({ answers: [] });
    expect(status).toBe(404);
    expect(data.error).toBeTruthy();
  });

  it("boshqa foydalanuvchining sessiyasiga 403 qaytaradi", async () => {
    findUniqueSessionMock.mockResolvedValue(buildSession({ userId: "someone-else" }));
    const { status } = await callSubmit({ answers: [] });
    expect(status).toBe(403);
  });

  it("allaqachon topshirilgan sessiyaga 409 qaytaradi", async () => {
    findUniqueSessionMock.mockResolvedValue(buildSession({ submittedAt: new Date() }));
    const { status } = await callSubmit({ answers: [] });
    expect(status).toBe(409);
    expect(createResultMock).not.toHaveBeenCalled();
  });

  it("muddati tugagan sessiyaga 410 qaytaradi va javob qabul qilinmaydi", async () => {
    findUniqueSessionMock.mockResolvedValue(
      buildSession({ expiresAt: new Date(NOW.getTime() - 1000) })
    );
    const { status } = await callSubmit({ answers: [] });
    expect(status).toBe(410);
    expect(createResultMock).not.toHaveBeenCalled();
  });

  it("to'g'ri javobni baholaydi, TestResult.sessionId bilan yaratadi va sessiyani submittedAt bilan belgilaydi", async () => {
    const testSession = buildSession();
    findUniqueSessionMock.mockResolvedValue(testSession);
    findManyItemMock.mockResolvedValue([buildItem()]);
    createResultMock.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: "result1", ...data })
    );

    // Talaba GET orqali ko'rgan (session.seed bilan aralashtirilgan)
    // pozitsiyani submit qiladi — xuddi gradeSubmission ichidagi kabi.
    const optionSeed = testSession.seed + 0 + 1;
    const shuffled = shuffleArray(buildItem().options as any[], optionSeed);
    const studentPickedLabel = LABELS[shuffled.findIndex((o: any) => o.text === "4")];

    const { status, data } = await callSubmit({
      answers: [{ questionId: "item1", answer: studentPickedLabel, timeSpent: 12 }],
      timeSpent: 20,
    });

    expect(status).toBe(200);
    expect(data.result.score).toBe(1);
    expect(data.result.maxScore).toBe(1);
    expect(data.result.percentage).toBe(100);
    expect(data.result.answers[0].isCorrect).toBe(true);

    expect(createResultMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "user1", sessionId: "session1", score: 1 }),
      })
    );
    expect(updateSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "session1" }, data: expect.objectContaining({ submittedAt: expect.any(Date) }) })
    );
  });

  it("36 belgili UUID questionId (Item.id backfill formati) kesilmasdan saqlanadi", async () => {
    // Item.id backfill'da gen_random_uuid()::text bilan yaratilgan — 36
    // belgi. cuid (25 belgi) bilan sinalsa 30 belgigacha kesish regressiyasi
    // bilinmay qoladi (CLAUDE.md — javoblar "javob berilmagan" ko'rsatgan edi).
    const uuidItemId = "3f9a1c2e-7b44-4d5a-9e21-6f0c8a2b5d17";
    const testSession = buildSession({ itemIds: [uuidItemId] });
    findUniqueSessionMock.mockResolvedValue(testSession);
    findManyItemMock.mockResolvedValue([buildItem({ id: uuidItemId })]);
    createResultMock.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: "result1", ...data })
    );

    const optionSeed = testSession.seed + 0 + 1;
    const shuffled = shuffleArray(buildItem().options as any[], optionSeed);
    const studentPickedLabel = LABELS[shuffled.findIndex((o: any) => o.text === "4")];

    const { status, data } = await callSubmit({
      answers: [{ questionId: uuidItemId, answer: studentPickedLabel, timeSpent: 9 }],
      timeSpent: 15,
    });

    expect(status).toBe(200);
    expect(data.result.answers[0].answer).not.toBe("");
    expect(data.result.answers[0].isCorrect).toBe(true);
    expect(data.result.answers[0].timeSpent).toBe(9);
  });

  it("hech qanday javob berilmasdan (bo'sh javoblar bilan) topshirilsa, 2 daqiqa ichida bo'lgani uchun kvota qaytariladi", async () => {
    const testSession = buildSession({ startedAt: new Date(NOW.getTime() - 90_000) }); // 90s oldin boshlangan
    findUniqueSessionMock.mockResolvedValue(testSession);
    findManyItemMock.mockResolvedValue([buildItem()]);
    createResultMock.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: "result1", ...data })
    );

    const { status } = await callSubmit({
      answers: [{ questionId: "item1", answer: "", timeSpent: 5 }],
      timeSpent: 90,
    });

    expect(status).toBe(200);
    expect(dailyUsageUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "user1", builtTests: { gt: 0 } }),
        data: { builtTests: { decrement: 1 } },
      })
    );
  });

  it("javob berilgan bo'lsa kvota qaytarilmaydi", async () => {
    const testSession = buildSession({ startedAt: new Date(NOW.getTime() - 90_000) });
    findUniqueSessionMock.mockResolvedValue(testSession);
    findManyItemMock.mockResolvedValue([buildItem()]);
    createResultMock.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: "result1", ...data })
    );

    const optionSeed = testSession.seed + 0 + 1;
    const shuffled = shuffleArray(buildItem().options as any[], optionSeed);
    const studentPickedLabel = LABELS[shuffled.findIndex((o: any) => o.text === "4")];

    await callSubmit({
      answers: [{ questionId: "item1", answer: studentPickedLabel, timeSpent: 12 }],
      timeSpent: 20,
    });

    expect(dailyUsageUpdateManyMock).not.toHaveBeenCalled();
  });

  it("answers massiv bo'lmasa 400 qaytaradi", async () => {
    const { status } = await callSubmit({ answers: "not-an-array" });
    expect(status).toBe(400);
    expect(findUniqueSessionMock).not.toHaveBeenCalled();
  });
});
