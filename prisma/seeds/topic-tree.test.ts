import { describe, expect, it } from "vitest";
import path from "path";
import {
  buildInsertStatement,
  computeStableId,
  escapeSqlString,
  flattenTree,
  formatIntArrayLiteral,
  generateTopicsSql,
  TopicNodeInput,
} from "./topic-tree";
import { loadSubjectFiles } from "./seed-topics";

describe("flattenTree", () => {
  it("ildiz tugun uchun level=0 va path=slug beradi", () => {
    const tree: TopicNodeInput[] = [{ nameUz: "Mexanika", slug: "mexanika" }];
    const rows = flattenTree("Fizika", tree);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      slug: "mexanika",
      path: "mexanika",
      level: 0,
      parentSlug: null,
    });
  });

  it("ichma-ich daraxt uchun path'ni ota-bola tartibida qo'shib boradi", () => {
    const tree: TopicNodeInput[] = [
      {
        nameUz: "Mexanika",
        slug: "mexanika",
        children: [
          {
            nameUz: "Kinematika",
            slug: "kinematika",
            children: [{ nameUz: "Erkin tushish", slug: "erkin-tushish" }],
          },
        ],
      },
    ];
    const rows = flattenTree("Fizika", tree);

    expect(rows.map((r) => r.path)).toEqual(["mexanika", "mexanika/kinematika", "mexanika/kinematika/erkin-tushish"]);
    expect(rows.map((r) => r.level)).toEqual([0, 1, 2]);
    expect(rows[2].parentSlug).toBe("kinematika");
  });

  it("ota tugun har doim bolasidan oldin keladi (DFS pre-order)", () => {
    const tree: TopicNodeInput[] = [
      {
        nameUz: "A",
        slug: "a",
        children: [{ nameUz: "A1", slug: "a1" }],
      },
      { nameUz: "B", slug: "b" },
    ];
    const rows = flattenTree("Fizika", tree);
    expect(rows.map((r) => r.slug)).toEqual(["a", "a1", "b"]);
  });

  it("order berilmasa massivdagi indeksni ishlatadi, berilsa o'shani", () => {
    const tree: TopicNodeInput[] = [
      { nameUz: "A", slug: "a" },
      { nameUz: "B", slug: "b", order: 99 },
    ];
    const rows = flattenTree("Fizika", tree);
    expect(rows[0].order).toBe(0);
    expect(rows[1].order).toBe(99);
  });

  it("grade/nameRu/nameEn berilmasa mos ravishda bo'sh massiv/null qo'yadi", () => {
    const rows = flattenTree("Fizika", [{ nameUz: "Mexanika", slug: "mexanika" }]);
    expect(rows[0].grade).toEqual([]);
    expect(rows[0].nameRu).toBeNull();
    expect(rows[0].nameEn).toBeNull();
  });

  it("fan ichida takrorlangan slug (turli ota ostida bo'lsa ham) xato beradi", () => {
    const tree: TopicNodeInput[] = [
      { nameUz: "A", slug: "x", children: [{ nameUz: "A1", slug: "dup" }] },
      { nameUz: "B", slug: "y", children: [{ nameUz: "B1", slug: "dup" }] },
    ];
    expect(() => flattenTree("Fizika", tree)).toThrow(/takrorlangan slug/);
  });

  it("noto'g'ri formatdagi slug (bo'sh joy, katta harf, apostrof) xato beradi", () => {
    expect(() => flattenTree("Fizika", [{ nameUz: "X", slug: "Erkin Tushish" }])).toThrow(/noto'g'ri slug/);
    expect(() => flattenTree("Fizika", [{ nameUz: "X", slug: "erkin_tushish" }])).toThrow(/noto'g'ri slug/);
    expect(() => flattenTree("Fizika", [{ nameUz: "X", slug: "o'zgarmas" }])).toThrow(/noto'g'ri slug/);
  });
});

describe("escapeSqlString", () => {
  it("yolg'iz qo'shtirnoqni ikkilangan qo'shtirnoqqa aylantiradi", () => {
    expect(escapeSqlString("O'zbekiston")).toBe("O''zbekiston");
    expect(escapeSqlString("hech narsa yo'q")).toBe("hech narsa yo''q");
    expect(escapeSqlString("belgisiz")).toBe("belgisiz");
  });
});

describe("formatIntArrayLiteral", () => {
  it("bo'sh massiv uchun bo'sh Postgres massiv literalini beradi", () => {
    expect(formatIntArrayLiteral([])).toBe("'{}'::integer[]");
  });

  it("to'ldirilgan massiv uchun ARRAY[...] literalini beradi", () => {
    expect(formatIntArrayLiteral([9, 10, 11])).toBe("ARRAY[9,10,11]::integer[]");
  });

  it("butun son bo'lmagan qiymatda xato beradi", () => {
    expect(() => formatIntArrayLiteral([9.5])).toThrow();
  });
});

describe("computeStableId", () => {
  it("bir xil fan+path uchun bir xil id qaytaradi (barqaror)", () => {
    const a = computeStableId("Fizika", "mexanika/kinematika");
    const b = computeStableId("Fizika", "mexanika/kinematika");
    expect(a).toBe(b);
  });

  it("boshqa path yoki fan uchun boshqa id qaytaradi", () => {
    const a = computeStableId("Fizika", "mexanika/kinematika");
    const b = computeStableId("Fizika", "mexanika/dinamika");
    const c = computeStableId("Matematika", "mexanika/kinematika");
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
  });
});

describe("buildInsertStatement", () => {
  const rootRow = flattenTree("Fizika", [{ nameUz: "Mexanika", slug: "mexanika", grade: [9] }])[0];
  const childRow = flattenTree("Fizika", [
    { nameUz: "Mexanika", slug: "mexanika", children: [{ nameUz: "Kinematika", slug: "kinematika" }] },
  ])[1];

  it("ildiz qator uchun parentId NULL bo'ladi", () => {
    const sql = buildInsertStatement(rootRow);
    expect(sql).toContain("NULL::text");
  });

  it("bola qator uchun parentId ota slug bo'yicha subquery bo'ladi", () => {
    const sql = buildInsertStatement(childRow);
    expect(sql).toContain(`"slug" = 'mexanika'`);
    expect(sql).toContain(`SELECT "id" FROM "TopicNode"`);
  });

  it("subjectId'ni DTM kategoriyasi ichidan Subject+TestCategory JOIN orqali topadi", () => {
    const sql = buildInsertStatement(rootRow);
    expect(sql).toContain(`FROM "Subject" subj`);
    expect(sql).toContain(`JOIN "TestCategory" cat`);
    expect(sql).toContain(`cat."type" = 'DTM'`);
    expect(sql).toContain(`subj."nameUz" = 'Fizika'`);
  });

  it("ON CONFLICT (subjectId, slug) DO UPDATE bilan idempotent", () => {
    const sql = buildInsertStatement(rootRow);
    expect(sql).toContain(`ON CONFLICT ("subjectId", "slug") DO UPDATE SET`);
  });

  it("hech qanday DROP buyrug'ini o'z ichiga olmaydi", () => {
    expect(buildInsertStatement(rootRow).toUpperCase()).not.toContain("DROP");
  });
});

describe("generateTopicsSql", () => {
  it("bo'sh tree'li fanlar uchun INSERT chiqarmaydi", () => {
    const sql = generateTopicsSql([{ subject: "Kimyo", tree: [] }]);
    expect(sql).not.toContain("INSERT INTO");
  });

  it("bir nechta fan uchun har birining INSERT'larini chiqaradi", () => {
    const sql = generateTopicsSql([
      { subject: "Fizika", tree: [{ nameUz: "Mexanika", slug: "mexanika" }] },
      { subject: "Matematika", tree: [{ nameUz: "Algebra", slug: "algebra" }] },
    ]);
    expect((sql.match(/INSERT INTO "TopicNode"/g) || []).length).toBe(2);
    expect(sql).toContain("'Fizika'");
    expect(sql).toContain("'Matematika'");
  });

  it("bitta tranzaksiyaga o'ralgan (BEGIN...COMMIT) va DROP yo'q", () => {
    const sql = generateTopicsSql([{ subject: "Fizika", tree: [{ nameUz: "Mexanika", slug: "mexanika" }] }]);
    expect(sql).toContain("BEGIN;");
    expect(sql).toContain("COMMIT;");
    expect(sql.toUpperCase()).not.toContain("DROP");
  });

  it("ikki marta chaqirilganda bir xil kirish uchun bayt-baytiga bir xil natija beradi (idempotent generatsiya)", () => {
    const input = [
      {
        subject: "Fizika",
        tree: [
          {
            nameUz: "Mexanika",
            slug: "mexanika",
            grade: [9],
            children: [{ nameUz: "Kinematika", slug: "kinematika", grade: [9] }],
          },
        ],
      },
    ];
    const first = generateTopicsSql(input);
    const second = generateTopicsSql(input);
    expect(first).toBe(second);
  });
});

describe("haqiqiy JSON fayllar (prisma/seeds/topics)", () => {
  const TOPICS_DIR = path.join(__dirname, "topics");
  const subjectsData = loadSubjectFiles(TOPICS_DIR);

  it("barcha fayllarni xatosiz o'qiydi", () => {
    expect(subjectsData.length).toBeGreaterThan(0);
  });

  it("fizika va matematika to'liq daraxtga ega, qolganlari bo'sh shablon", () => {
    const full = subjectsData.filter((s) => s.tree.length > 0).map((s) => s.subject);
    expect(full.sort()).toEqual(["Fizika", "Matematika"]);
  });

  it("fizika va matematika uchun har birida 5-8 bo'lim, har bo'limda 4-10 mavzu bor", () => {
    for (const subject of ["Fizika", "Matematika"]) {
      const data = subjectsData.find((s) => s.subject === subject)!;
      expect(data.tree.length).toBeGreaterThanOrEqual(5);
      expect(data.tree.length).toBeLessThanOrEqual(8);

      for (const section of data.tree) {
        const topicCount = section.children?.length ?? 0;
        expect(topicCount, `${subject} / ${section.nameUz}`).toBeGreaterThanOrEqual(4);
        expect(topicCount, `${subject} / ${section.nameUz}`).toBeLessThanOrEqual(10);
      }
    }
  });

  it("flattenTree xatosiz ishlaydi (slug format va noyoblik) va SQL DROP'siz hosil bo'ladi", () => {
    for (const { subject, tree } of subjectsData) {
      if (tree.length === 0) continue;
      expect(() => flattenTree(subject, tree)).not.toThrow();
    }

    const sql = generateTopicsSql(subjectsData);
    expect(sql.toUpperCase()).not.toContain("DROP");
    expect(sql).toContain("ON CONFLICT");
  });

  it("ikki marta yuklab generatsiya qilinganda ham natija bir xil", () => {
    const again = loadSubjectFiles(TOPICS_DIR);
    expect(generateTopicsSql(subjectsData)).toBe(generateTopicsSql(again));
  });
});
