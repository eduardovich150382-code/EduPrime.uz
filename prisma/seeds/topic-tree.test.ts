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
  TopicRow,
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

  it("takrorlangan slug turli CHUQURLIKDA bo'lsa ham (level 0 vs level 2) xato beradi", () => {
    // seenSlugs butun fan bo'yicha global — faqat bir xil daraja yoki bir
    // xil ota ichida emas, chunki DB'dagi @@unique([subjectId, slug]) ham
    // darajadan qat'i nazar global.
    const tree: TopicNodeInput[] = [
      { nameUz: "Mexanika", slug: "mexanika" },
      {
        nameUz: "Boshqa bo'lim",
        slug: "boshqa-bolim",
        children: [
          {
            nameUz: "Bob",
            slug: "bob",
            children: [{ nameUz: "Chuqur mavzu", slug: "mexanika" }],
          },
        ],
      },
    ];
    expect(() => flattenTree("Fizika", tree)).toThrow(/takrorlangan slug/);
  });

  it("uch (yoki undan ortiq) darajali daraxtda level va path to'g'ri hisoblanadi (bo'lim → bob → mavzu)", () => {
    const tree: TopicNodeInput[] = [
      {
        nameUz: "Mexanika",
        slug: "mexanika",
        children: [
          {
            nameUz: "Kinematika",
            slug: "kinematika",
            children: [
              { nameUz: "Erkin tushish", slug: "erkin-tushish" },
              { nameUz: "Tekis harakat", slug: "tekis-harakat" },
            ],
          },
          {
            nameUz: "Dinamika",
            slug: "dinamika",
            children: [{ nameUz: "Nyuton qonunlari", slug: "nyuton-qonunlari" }],
          },
        ],
      },
    ];
    const rows = flattenTree("Fizika", tree);

    expect(rows).toHaveLength(6);
    expect(rows.map((r) => r.level)).toEqual([0, 1, 2, 2, 1, 2]);
    expect(rows.map((r) => r.path)).toEqual([
      "mexanika",
      "mexanika/kinematika",
      "mexanika/kinematika/erkin-tushish",
      "mexanika/kinematika/tekis-harakat",
      "mexanika/dinamika",
      "mexanika/dinamika/nyuton-qonunlari",
    ]);
    // Har qatorning path'i level+1 ta bo'lakdan iborat bo'lishi kerak.
    for (const row of rows) {
      expect(row.path.split("/")).toHaveLength(row.level + 1);
    }
  });

  it("chuqurlik ixtiyoriy — 4-darajali daraxtda ham level/path to'g'ri hisoblanadi", () => {
    const tree: TopicNodeInput[] = [
      {
        nameUz: "A",
        slug: "a",
        children: [
          {
            nameUz: "B",
            slug: "b",
            children: [
              {
                nameUz: "C",
                slug: "c",
                children: [{ nameUz: "D", slug: "d" }],
              },
            ],
          },
        ],
      },
    ];
    const rows = flattenTree("Fizika", tree);
    expect(rows.map((r) => r.level)).toEqual([0, 1, 2, 3]);
    expect(rows[3].path).toBe("a/b/c/d");
  });

  it("ota tugun har doim BARCHA bolalaridan oldin keladi — ixtiyoriy chuqurlikdagi daraxtda ham", () => {
    // Umumiy invariant tekshiruvi: har bir qator uchun uning parentSlug'i
    // (agar bo'lsa) massivda undan OLDINROQ, mos level'dagi biror qatorning
    // slug'i sifatida uchrashi kerak.
    const tree: TopicNodeInput[] = [
      {
        nameUz: "Mexanika",
        slug: "mexanika",
        children: [
          {
            nameUz: "Kinematika",
            slug: "kinematika",
            children: [
              { nameUz: "Erkin tushish", slug: "erkin-tushish" },
              { nameUz: "Tekis harakat", slug: "tekis-harakat" },
            ],
          },
          { nameUz: "Dinamika", slug: "dinamika" },
        ],
      },
      { nameUz: "Optika", slug: "optika" },
    ];
    const rows = flattenTree("Fizika", tree);

    rows.forEach((row, i) => {
      if (row.parentSlug === null) return;
      const parentIndex = rows.findIndex((r) => r.slug === row.parentSlug);
      expect(parentIndex).toBeGreaterThanOrEqual(0);
      expect(parentIndex).toBeLessThan(i);
    });
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
    expect(sql).toContain(`LOWER(subj."nameUz") = LOWER('Fizika')`);
  });

  it("fan nomini katta-kichik harfga sezgir emas solishtiradi (JSON'dagi \"fizika\" DB'dagi \"Fizika\" bilan mos kelishi kerak)", () => {
    const lowerCaseRow = flattenTree("fizika", [{ nameUz: "Mexanika", slug: "mexanika" }])[0];
    const sql = buildInsertStatement(lowerCaseRow);
    expect(sql).toContain(`LOWER(subj."nameUz") = LOWER('fizika')`);
    // Solishtiruv LOWER() ichida bo'lgani uchun DB'dagi "Fizika" (katta F)
    // bilan ham, JSON'dagi "fizika" (kichik f) bilan ham bir xil topiladi.
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
  // JSON'dagi "subject" maydoni registrga bog'liq emas (masalan "fizika" vs
  // "Fizika") — solishtirish har doim shu yordamchi orqali.
  const findSubject = (name: string) =>
    subjectsData.find((s) => s.subject.toLowerCase() === name.toLowerCase());

  function countNodes(nodes: TopicNodeInput[]): number {
    return nodes.reduce((sum, n) => sum + 1 + (n.children ? countNodes(n.children) : 0), 0);
  }

  function maxLevel(nodes: TopicNodeInput[], level = 0): number {
    return nodes.reduce(
      (m, n) => Math.max(m, n.children && n.children.length > 0 ? maxLevel(n.children, level + 1) : level),
      level
    );
  }

  it("barcha fayllarni xatosiz o'qiydi", () => {
    expect(subjectsData.length).toBeGreaterThan(0);
  });

  it("fizika va matematika to'liq daraxtga ega, qolganlari bo'sh shablon", () => {
    const full = subjectsData.filter((s) => s.tree.length > 0).map((s) => s.subject.toLowerCase());
    expect(full.sort()).toEqual(["fizika", "matematika"]);
  });

  it("fizika: 168 ta tugun, uch daraja (bo'lim → bob → mavzu), 5-8 bo'lim", () => {
    const fizika = findSubject("Fizika")!;
    expect(countNodes(fizika.tree)).toBe(168);
    expect(maxLevel(fizika.tree)).toBe(2);
    expect(fizika.tree.length).toBeGreaterThanOrEqual(5);
    expect(fizika.tree.length).toBeLessThanOrEqual(8);
  });

  it("matematika: 5-8 bo'lim, har bo'limda 4-10 mavzu (hali 2 darajali)", () => {
    const matematika = findSubject("Matematika")!;
    expect(matematika.tree.length).toBeGreaterThanOrEqual(5);
    expect(matematika.tree.length).toBeLessThanOrEqual(8);

    for (const section of matematika.tree) {
      const topicCount = section.children?.length ?? 0;
      expect(topicCount, section.nameUz).toBeGreaterThanOrEqual(4);
      expect(topicCount, section.nameUz).toBeLessThanOrEqual(10);
    }
  });

  it("flattenTree xatosiz ishlaydi (slug format va noyoblik, har qanday chuqurlikda)", () => {
    for (const { subject, tree } of subjectsData) {
      if (tree.length === 0) continue;
      expect(() => flattenTree(subject, tree)).not.toThrow();
    }
  });

  it("fizika uchun flattenTree aynan 168 ta qator beradi va ota har doim bolasidan oldin keladi", () => {
    const fizika = findSubject("Fizika")!;
    const rows = flattenTree(fizika.subject, fizika.tree);
    expect(rows).toHaveLength(168);

    rows.forEach((row, i) => {
      if (row.parentSlug === null) return;
      const parentIndex = rows.findIndex((r) => r.slug === row.parentSlug);
      expect(parentIndex, `"${row.slug}" ning otasi "${row.parentSlug}"`).toBeGreaterThanOrEqual(0);
      expect(parentIndex).toBeLessThan(i);
      expect(row.path.split("/")).toHaveLength(row.level + 1);
    });
  });

  it("generateTopicsSql fizika uchun aynan 168 ta INSERT chiqaradi, DROP yo'q, ON CONFLICT bor", () => {
    const sql = generateTopicsSql(subjectsData);
    expect(sql.toUpperCase()).not.toContain("DROP");
    expect(sql).toContain("ON CONFLICT");

    // Umumiy INSERT soni barcha to'ldirilgan fanlarning flattenTree
    // natijalari yig'indisiga aynan teng bo'lishi kerak — hech nima
    // yo'qolmagan yoki qo'shimcha chiqmagan.
    let totalExpected = 0;
    for (const { subject, tree } of subjectsData) {
      if (tree.length === 0) continue;
      totalExpected += flattenTree(subject, tree).length;
    }
    expect((sql.match(/INSERT INTO "TopicNode"/g) || []).length).toBe(totalExpected);

    // Fizika alohida — PR promptida tasdiqlangan aniq son (168).
    const fizikaSql = generateTopicsSql([findSubject("Fizika")!]);
    expect((fizikaSql.match(/INSERT INTO "TopicNode"/g) || []).length).toBe(168);
  });

  it("SQL matnida ota tugunning O'Z INSERT'i bolasinikidan OLDIN keladi (matn tartibi bo'yicha)", () => {
    const fizika = findSubject("Fizika")!;
    const rows = flattenTree(fizika.subject, fizika.tree);
    const sql = generateTopicsSql([fizika]);

    // Har qatorning id'si (computeStableId) fan+path'dan hosil bo'lgani
    // uchun butun faylda faqat shu qatorning O'Z INSERT bloki boshida
    // uchraydi — shuni anchor sifatida ishlatib, statement'ning matndagi
    // haqiqiy pozitsiyasini topamiz.
    const positionOf = (row: TopicRow) => {
      const id = computeStableId(row.subject, row.path);
      const index = sql.indexOf(`'${id}',`);
      expect(index, `"${row.path}" uchun INSERT topilmadi`).toBeGreaterThan(-1);
      return index;
    };

    for (const row of rows) {
      if (row.parentSlug === null) continue;
      const parentRow = rows.find((r) => r.slug === row.parentSlug)!;
      expect(positionOf(parentRow)).toBeLessThan(positionOf(row));
    }
  });

  it("ikki marta yuklab generatsiya qilinganda ham natija bir xil", () => {
    const again = loadSubjectFiles(TOPICS_DIR);
    expect(generateTopicsSql(subjectsData)).toBe(generateTopicsSql(again));
  });
});
