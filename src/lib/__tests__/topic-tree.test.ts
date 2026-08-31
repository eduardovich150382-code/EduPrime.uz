import { describe, expect, it } from "vitest";
import { buildTopicTree, countItemsPerTopic, type FlatTopicNode } from "../topic-tree";

describe("buildTopicTree", () => {
  const nodes: FlatTopicNode[] = [
    { id: "t2", parentId: null, path: "optika", level: 0, nameUz: "Optika", order: 1 },
    { id: "t1", parentId: null, path: "mexanika", level: 0, nameUz: "Mexanika", order: 0 },
    { id: "t1b", parentId: "t1", path: "mexanika/dinamika", level: 1, nameUz: "Dinamika", order: 1 },
    { id: "t1a", parentId: "t1", path: "mexanika/kinematika", level: 1, nameUz: "Kinematika", order: 0 },
  ];

  it("ildiz tugunlarni order bo'yicha saralaydi", () => {
    const tree = buildTopicTree(nodes, {});
    expect(tree.map((n) => n.id)).toEqual(["t1", "t2"]);
  });

  it("bolalarni to'g'ri ota tuguniga joylashtiradi, ular ham order bo'yicha saralanadi", () => {
    const tree = buildTopicTree(nodes, {});
    const mexanika = tree.find((n) => n.id === "t1")!;
    expect(mexanika.children.map((c) => c.id)).toEqual(["t1a", "t1b"]);
  });

  it("counts'dagi qiymatlarni tugunga biriktiradi, topilmasa 0", () => {
    const tree = buildTopicTree(nodes, { t1: 10, t1a: 4 });
    const mexanika = tree.find((n) => n.id === "t1")!;
    expect(mexanika.count).toBe(10);
    expect(mexanika.children.find((c) => c.id === "t1a")!.count).toBe(4);
    expect(mexanika.children.find((c) => c.id === "t1b")!.count).toBe(0);
  });

  it("parentId ro'yxatda topilmasa, tugun ildiz sifatida qaraladi", () => {
    const orphan: FlatTopicNode[] = [
      { id: "x", parentId: "missing-parent", path: "x", level: 1, nameUz: "X", order: 0 },
    ];
    const tree = buildTopicTree(orphan, {});
    expect(tree.map((n) => n.id)).toEqual(["x"]);
  });

  it("bo'sh ro'yxat bilan ishlaydi", () => {
    expect(buildTopicTree([], {})).toEqual([]);
  });
});

describe("countItemsPerTopic", () => {
  const topics = [
    { id: "t1", path: "mexanika" },
    { id: "t1a", path: "mexanika/kinematika" },
    { id: "t2", path: "optika" },
  ];

  it("har topic uchun o'ziga yoki bola mavzusiga tegishli itemlarni sanaydi", () => {
    const candidates = [
      { id: "i1", topicPaths: ["mexanika/kinematika"] },
      { id: "i2", topicPaths: ["mexanika/dinamika"] },
      { id: "i3", topicPaths: ["optika"] },
      { id: "i4", topicPaths: [] },
    ];
    const counts = countItemsPerTopic(candidates, topics);
    expect(counts).toEqual({ t1: 2, t1a: 1, t2: 1 });
  });

  it("bir item bir nechta topic'ga tegishli bo'lsa, har birida alohida hisoblanadi", () => {
    const candidates = [{ id: "i1", topicPaths: ["mexanika", "optika"] }];
    const counts = countItemsPerTopic(candidates, topics);
    expect(counts).toEqual({ t1: 1, t1a: 0, t2: 1 });
  });

  it("nomzodlar bo'sh bo'lsa hammasi nol", () => {
    expect(countItemsPerTopic([], topics)).toEqual({ t1: 0, t1a: 0, t2: 0 });
  });
});
