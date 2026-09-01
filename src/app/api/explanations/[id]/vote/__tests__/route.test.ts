import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * S20a — ovoz berish. `@@id([userId, explanationId])` bir foydalanuvchi bir
 * tushuntirishga faqat bir marta ovoz berishini bazada ham kafolatlaydi,
 * lekin bu yerda ASOSIY qoida sinaladi: xuddi shu ovoz qayta yuborilsa
 * sanoq ikki marta hisoblanmasin, ovoz o'zgartirilsa (👍→👎) ikkala
 * tomon ham to'g'ri (bitta ortadi, bittasi kamayadi) yangilansin.
 */
const {
  authMock,
  itemExplanationFindUniqueMock,
  itemExplanationFindUniqueOrThrowMock,
  itemExplanationUpdateMock,
  explanationVoteFindUniqueMock,
  explanationVoteCreateMock,
  explanationVoteUpdateMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  itemExplanationFindUniqueMock: vi.fn(),
  itemExplanationFindUniqueOrThrowMock: vi.fn(),
  itemExplanationUpdateMock: vi.fn(),
  explanationVoteFindUniqueMock: vi.fn(),
  explanationVoteCreateMock: vi.fn(),
  explanationVoteUpdateMock: vi.fn(),
}));

const tx = {
  itemExplanation: {
    findUniqueOrThrow: (...args: unknown[]) => itemExplanationFindUniqueOrThrowMock(...args),
    update: (...args: unknown[]) => itemExplanationUpdateMock(...args),
  },
  explanationVote: {
    findUnique: (...args: unknown[]) => explanationVoteFindUniqueMock(...args),
    create: (...args: unknown[]) => explanationVoteCreateMock(...args),
    update: (...args: unknown[]) => explanationVoteUpdateMock(...args),
  },
};

vi.mock("@/lib/db", () => ({
  db: {
    itemExplanation: {
      findUnique: (...args: unknown[]) => itemExplanationFindUniqueMock(...args),
    },
    $transaction: (fn: (tx: unknown) => unknown) => fn(tx),
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: () => authMock(),
}));

import { POST } from "../route";

async function callPost(value: unknown, id = "expl1") {
  const request = new Request(`http://localhost/api/explanations/${id}/vote`, {
    method: "POST",
    body: JSON.stringify({ value }),
  });
  const response = await POST(request as any, { params: Promise.resolve({ id }) });
  return { status: response.status, data: await response.json() };
}

describe("POST /api/explanations/[id]/vote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockReturnValue({ user: { id: "user1", role: "USER" } });
    itemExplanationFindUniqueMock.mockResolvedValue({ id: "expl1" });
  });

  it("avtorizatsiyasiz 401 qaytaradi", async () => {
    authMock.mockReturnValue(null);
    const { status } = await callPost(1);
    expect(status).toBe(401);
  });

  it("value +1/-1 bo'lmasa 400 qaytaradi", async () => {
    const { status } = await callPost(0);
    expect(status).toBe(400);
  });

  it("tushuntirish topilmasa 404 qaytaradi", async () => {
    itemExplanationFindUniqueMock.mockResolvedValue(null);
    const { status } = await callPost(1);
    expect(status).toBe(404);
  });

  it("birinchi ovoz — yaratiladi, mos hisoblagich +1", async () => {
    explanationVoteFindUniqueMock.mockResolvedValue(null);
    itemExplanationUpdateMock.mockResolvedValue({ upvotes: 1, downvotes: 0 });

    const { status, data } = await callPost(1);

    expect(status).toBe(200);
    expect(explanationVoteCreateMock).toHaveBeenCalledWith({
      data: { userId: "user1", explanationId: "expl1", value: 1 },
    });
    expect(itemExplanationUpdateMock).toHaveBeenCalledWith({
      where: { id: "expl1" },
      data: { upvotes: { increment: 1 }, downvotes: { increment: 0 } },
      select: { upvotes: true, downvotes: true },
    });
    expect(data).toEqual({ upvotes: 1, downvotes: 0, userVote: 1, changed: true });
  });

  it("xuddi shu ovoz qayta yuborilsa — sanoqqa tegilmaydi (rad etiladi)", async () => {
    explanationVoteFindUniqueMock.mockResolvedValue({ userId: "user1", explanationId: "expl1", value: 1 });
    itemExplanationFindUniqueOrThrowMock.mockResolvedValue({ upvotes: 3, downvotes: 1 });

    const { status, data } = await callPost(1);

    expect(status).toBe(200);
    expect(explanationVoteCreateMock).not.toHaveBeenCalled();
    expect(explanationVoteUpdateMock).not.toHaveBeenCalled();
    expect(itemExplanationUpdateMock).not.toHaveBeenCalled();
    expect(data).toEqual({ upvotes: 3, downvotes: 1, userVote: 1, changed: false });
  });

  it("ovoz o'zgartirilsa (👍 → 👎) — upvotes 1 kamayadi, downvotes 1 oshadi", async () => {
    explanationVoteFindUniqueMock.mockResolvedValue({ userId: "user1", explanationId: "expl1", value: 1 });
    itemExplanationUpdateMock.mockResolvedValue({ upvotes: 2, downvotes: 1 });

    const { status, data } = await callPost(-1);

    expect(status).toBe(200);
    expect(explanationVoteUpdateMock).toHaveBeenCalledWith({
      where: { userId_explanationId: { userId: "user1", explanationId: "expl1" } },
      data: { value: -1 },
    });
    expect(itemExplanationUpdateMock).toHaveBeenCalledWith({
      where: { id: "expl1" },
      data: { upvotes: { increment: -1 }, downvotes: { increment: 1 } },
      select: { upvotes: true, downvotes: true },
    });
    expect(data).toEqual({ upvotes: 2, downvotes: 1, userVote: -1, changed: true });
  });

  it("ovoz o'zgartirilsa (👎 → 👍) — downvotes 1 kamayadi, upvotes 1 oshadi", async () => {
    explanationVoteFindUniqueMock.mockResolvedValue({ userId: "user1", explanationId: "expl1", value: -1 });
    itemExplanationUpdateMock.mockResolvedValue({ upvotes: 1, downvotes: 0 });

    const { data } = await callPost(1);

    expect(itemExplanationUpdateMock).toHaveBeenCalledWith({
      where: { id: "expl1" },
      data: { upvotes: { increment: 1 }, downvotes: { increment: -1 } },
      select: { upvotes: true, downvotes: true },
    });
    expect(data).toEqual({ upvotes: 1, downvotes: 0, userVote: 1, changed: true });
  });
});
