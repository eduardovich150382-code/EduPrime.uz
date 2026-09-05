import { describe, expect, it } from "vitest";
import { groupSubjectsByName, subjectGroupKey, type SubjectRow } from "../subject-groups";

describe("subjectGroupKey", () => {
  it("katta-kichik harf va bo'shliqqa sezgir emas", () => {
    expect(subjectGroupKey("Matematika")).toBe(subjectGroupKey("  matematika  "));
    expect(subjectGroupKey("MATEMATIKA")).toBe("matematika");
  });
});

describe("groupSubjectsByName", () => {
  // Haqiqiy holat: "Matematika" 5 xil kategoriyada (DTM, SCHOOL, ...) 5 ta
  // alohida Subject qatoriga ega — savollarning aksariyati esa faqat
  // bittasiga (masalan DTM) bog'langan.
  const subjects: SubjectRow[] = [
    { id: "math-dtm", nameUz: "Matematika" },
    { id: "math-school", nameUz: "Matematika" },
    { id: "math-attestation", nameUz: "matematika" }, // registr farqi ham guruhlansin
    { id: "physics-dtm", nameUz: "Fizika" },
  ];

  it("bir xil nomdagi qatorlarni bitta guruhga birlashtiradi", () => {
    const groups = groupSubjectsByName(subjects);
    const math = groups.find((g) => g.name === "Matematika");
    expect(math?.ids.sort()).toEqual(["math-attestation", "math-dtm", "math-school"]);
  });

  it("turli nomdagi fanlarni aralashtirmaydi", () => {
    const groups = groupSubjectsByName(subjects);
    const physics = groups.find((g) => g.name === "Fizika");
    expect(physics?.ids).toEqual(["physics-dtm"]);
  });

  it("natija fan nomi bo'yicha alifbo tartibida", () => {
    const groups = groupSubjectsByName(subjects);
    expect(groups.map((g) => g.name)).toEqual(["Fizika", "Matematika"]);
  });

  it("ro'yxat bo'sh bo'lsa ham yiqilmaydi", () => {
    expect(groupSubjectsByName([])).toEqual([]);
  });
});
