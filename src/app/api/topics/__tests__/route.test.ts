import { beforeEach, describe, expect, it, vi } from "vitest";

const { findManyTopicNodeMock, findManyItemMock, requireAuthMock } = vi.hoisted(() => ({
  findManyTopicNodeMock: vi.fn(),
  findManyItemMock: vi.fn(),
  requireAuthMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    topicNode: {
      findMany: (...args: unknown[]) => findManyTopicNodeMock(...args),
    },
    item: {
      findMany: (...args: unknown[]) => findManyItemMock(...args),
    },
  },
}));

vi.mock("@/lib/api-auth", () => ({
  requireAuth: () => requireAuthMock(),
}));

import { POST } from "../route";

async function callTopics(body: unknown) {
  const request = new Request("http://localhost/api/topics", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const response = await POST(request as any);
  return { status: response.status, data: await response.json() };
}

// Haqiqiy holat: "Matematika" DTM va SCHOOL kategoriyalarida ikkita alohida
// Subject qatoriga ega, mavzu daraxti ikkalasiga ham bir xil path bilan
// ekilgan — ItemBrowser ikkala subjectId'ni birga so'raganda tekis
// ro'yxatda har tugun ikki marta qaytadi.
function duplicatedTopicRows() {
  return [
    { id: "dtm-mex", parentId: null, path: "mexanika", level: 0, nameUz: "Mexanika", nameRu: null, nameEn: null, order: 0 },
    { id: "school-mex", parentId: null, path: "mexanika", level: 0, nameUz: "Mexanika", nameRu: null, nameEn: null, order: 0 },
  ];
}

describe("POST /api/topics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthMock.mockReturnValue({ user: { id: "user1" }, error: null });
    findManyTopicNodeMock.mockResolvedValue([]);
    findManyItemMock.mockResolvedValue([]);
  });

  it("subjectIds bo'sh bo'lsa DB'ga bormay bo'sh daraxt qaytaradi", async () => {
    const { status, data } = await callTopics({ subjectIds: [] });
    expect(status).toBe(200);
    expect(data.tree).toEqual([]);
    expect(findManyTopicNodeMock).not.toHaveBeenCalled();
  });

  it("dedupeByPath berilmasa (standart /build xatti-harakati) bir xil path'dagi tugunlar ALOHIDA qaytadi", async () => {
    findManyTopicNodeMock.mockResolvedValue(duplicatedTopicRows());

    const { data } = await callTopics({ subjectIds: ["math-dtm", "math-school"] });

    expect(data.tree).toHaveLength(2);
    expect(data.tree.map((n: { id: string }) => n.id).sort()).toEqual(["dtm-mex", "school-mex"]);
  });

  it("dedupeByPath:true bo'lsa bir xil path'dagi tugunlar BITTAGA yig'iladi (ItemBrowser)", async () => {
    findManyTopicNodeMock.mockResolvedValue(duplicatedTopicRows());

    const { data } = await callTopics({ subjectIds: ["math-dtm", "math-school"], dedupeByPath: true });

    expect(data.tree).toHaveLength(1);
    expect(data.tree[0].id).toBe("dtm-mex");
  });

  it("dedupeByPath:true bilan ham har ikki subjectId'ga tegishli itemlar birga sanaladi", async () => {
    findManyTopicNodeMock.mockResolvedValue(duplicatedTopicRows());
    findManyItemMock.mockResolvedValue([
      { id: "i1", topics: [{ topic: { path: "mexanika" } }] }, // DTM subject ostidagi item
      { id: "i2", topics: [{ topic: { path: "mexanika" } }] }, // SCHOOL subject ostidagi item
    ]);

    const { data } = await callTopics({ subjectIds: ["math-dtm", "math-school"], dedupeByPath: true });

    expect(data.tree[0].count).toBe(2);
  });
});
