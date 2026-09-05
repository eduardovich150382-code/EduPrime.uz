import { describe, expect, it } from "vitest";
import { buildTopicTree, countItemsPerTopic, dedupeTopicsByPath, resolveTopicName, type FlatTopicNode } from "../topic-tree";

describe("resolveTopicName", () => {
  const node = { nameUz: "Mexanika", nameRu: "Механика", nameEn: null };

  it("uz uchun nameUz'ni qaytaradi", () => {
    expect(resolveTopicName(node, "uz")).toBe("Mexanika");
  });

  it("ru uchun nameRu'ni qaytaradi", () => {
    expect(resolveTopicName(node, "ru")).toBe("Механика");
  });

  it("en uchun nameEn bo'sh (null) bo'lsa nameUz'ga tushadi", () => {
    expect(resolveTopicName(node, "en")).toBe("Mexanika");
  });

  it("tanilmagan locale uchun ham nameUz'ga tushadi", () => {
    expect(resolveTopicName(node, "fr")).toBe("Mexanika");
  });

  it("nameRu bo'sh qator bo'lsa ham (null emas) nameUz'ga tushadi", () => {
    expect(resolveTopicName({ ...node, nameRu: "" }, "ru")).toBe("Mexanika");
  });
});

describe("buildTopicTree", () => {
  const nodes: FlatTopicNode[] = [
    { id: "t2", parentId: null, path: "optika", level: 0, nameUz: "Optika", nameRu: null, nameEn: null, order: 1 },
    { id: "t1", parentId: null, path: "mexanika", level: 0, nameUz: "Mexanika", nameRu: "Механика", nameEn: null, order: 0 },
    { id: "t1b", parentId: "t1", path: "mexanika/dinamika", level: 1, nameUz: "Dinamika", nameRu: null, nameEn: null, order: 1 },
    { id: "t1a", parentId: "t1", path: "mexanika/kinematika", level: 1, nameUz: "Kinematika", nameRu: null, nameEn: null, order: 0 },
  ];

  it("ildiz tugunlarni order bo'yicha saralaydi", () => {
    const tree = buildTopicTree(nodes, {}, "uz");
    expect(tree.map((n) => n.id)).toEqual(["t1", "t2"]);
  });

  it("bolalarni to'g'ri ota tuguniga joylashtiradi, ular ham order bo'yicha saralanadi", () => {
    const tree = buildTopicTree(nodes, {}, "uz");
    const mexanika = tree.find((n) => n.id === "t1")!;
    expect(mexanika.children.map((c) => c.id)).toEqual(["t1a", "t1b"]);
  });

  it("counts'dagi qiymatlarni tugunga biriktiradi, topilmasa 0", () => {
    const tree = buildTopicTree(nodes, { t1: 10, t1a: 4 }, "uz");
    const mexanika = tree.find((n) => n.id === "t1")!;
    expect(mexanika.count).toBe(10);
    expect(mexanika.children.find((c) => c.id === "t1a")!.count).toBe(4);
    expect(mexanika.children.find((c) => c.id === "t1b")!.count).toBe(0);
  });

  it("nomni berilgan locale bo'yicha hal qiladi", () => {
    const treeUz = buildTopicTree(nodes, {}, "uz");
    expect(treeUz.find((n) => n.id === "t1")!.name).toBe("Mexanika");

    const treeRu = buildTopicTree(nodes, {}, "ru");
    expect(treeRu.find((n) => n.id === "t1")!.name).toBe("Механика");
    // nameRu yo'q tugun uchun ru so'ralganda ham nameUz'ga tushadi
    expect(treeRu.find((n) => n.id === "t2")!.name).toBe("Optika");
  });

  it("parentId ro'yxatda topilmasa, tugun ildiz sifatida qaraladi", () => {
    const orphan: FlatTopicNode[] = [
      { id: "x", parentId: "missing-parent", path: "x", level: 1, nameUz: "X", nameRu: null, nameEn: null, order: 0 },
    ];
    const tree = buildTopicTree(orphan, {}, "uz");
    expect(tree.map((n) => n.id)).toEqual(["x"]);
  });

  it("bo'sh ro'yxat bilan ishlaydi", () => {
    expect(buildTopicTree([], {}, "uz")).toEqual([]);
  });
});

describe("dedupeTopicsByPath", () => {
  // Bir xil "Matematika" fani ikkita kategoriyada (DTM va SCHOOL) ikkita
  // alohida Subject qatoriga ega — daraxt ikkalasiga ham bir xil path bilan
  // ekilgan, shuning uchun tekis ro'yxatda har tugun ikki marta keladi.
  const dtmNodes: FlatTopicNode[] = [
    { id: "dtm-mex", parentId: null, path: "mexanika", level: 0, nameUz: "Mexanika", nameRu: null, nameEn: null, order: 0 },
    { id: "dtm-kin", parentId: "dtm-mex", path: "mexanika/kinematika", level: 1, nameUz: "Kinematika", nameRu: null, nameEn: null, order: 0 },
  ];
  const schoolNodes: FlatTopicNode[] = [
    { id: "school-mex", parentId: null, path: "mexanika", level: 0, nameUz: "Mexanika", nameRu: null, nameEn: null, order: 0 },
    { id: "school-kin", parentId: "school-mex", path: "mexanika/kinematika", level: 1, nameUz: "Kinematika", nameRu: null, nameEn: null, order: 0 },
  ];

  it("bir xil path'dagi tugunlarni bittaga tushiradi, birinchi uchraganini vakil qiladi", () => {
    const deduped = dedupeTopicsByPath([...dtmNodes, ...schoolNodes]);
    expect(deduped.map((n) => n.id)).toEqual(["dtm-mex", "dtm-kin"]);
  });

  it("vakil tugunning parentId'sini vakillar orasidagi path'ga qarab qayta hisoblaydi", () => {
    const deduped = dedupeTopicsByPath([...dtmNodes, ...schoolNodes]);
    const kinematika = deduped.find((n) => n.path === "mexanika/kinematika")!;
    expect(kinematika.parentId).toBe("dtm-mex"); // school-mex EMAS — vakil sifatida birinchi (dtm-mex) tanlangan
  });

  it("ota path ro'yxatda topilmasa parentId null bo'ladi", () => {
    const orphan: FlatTopicNode[] = [
      { id: "x", parentId: "boshqa-fan-tuguni", path: "mexanika/kinematika", level: 1, nameUz: "Kinematika", nameRu: null, nameEn: null, order: 0 },
    ];
    expect(dedupeTopicsByPath(orphan)[0].parentId).toBeNull();
  });

  it("dublikat bo'lmasa ro'yxat o'zgarishsiz qaytadi (parentId qayta hisoblanadi, lekin qiymati bir xil)", () => {
    expect(dedupeTopicsByPath(dtmNodes)).toEqual(dtmNodes);
  });

  it("natijani buildTopicTree'ga uzatilganda takrorlanmagan, to'g'ri joylashgan daraxt hosil bo'ladi", () => {
    const deduped = dedupeTopicsByPath([...dtmNodes, ...schoolNodes]);
    const tree = buildTopicTree(deduped, {}, "uz");
    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe("dtm-mex");
    expect(tree[0].children.map((c) => c.id)).toEqual(["dtm-kin"]);
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
