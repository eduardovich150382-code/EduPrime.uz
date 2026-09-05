import { describe, expect, it } from "vitest";
import { resolveSubjectGroup, subjectGroupKey, type SubjectRow } from "../subject-groups";

describe("subjectGroupKey", () => {
  it("katta-kichik harf va bo'shliqqa sezgir emas", () => {
    expect(subjectGroupKey("Matematika")).toBe(subjectGroupKey("  matematika  "));
    expect(subjectGroupKey("MATEMATIKA")).toBe("matematika");
  });
});

describe("resolveSubjectGroup", () => {
  // Haqiqiy holat: "Matematika" 5 xil kategoriyada (DTM, SCHOOL, ...) 5 ta
  // alohida Subject qatoriga ega — savollarning aksariyati faqat bittasiga
  // (masalan DTM) bog'langan.
  const subjects: SubjectRow[] = [
    { id: "math-dtm", nameUz: "Matematika" },
    { id: "math-school", nameUz: "Matematika" },
    { id: "math-attestation", nameUz: "matematika" }, // registr farqi ham guruhlansin
    { id: "physics-dtm", nameUz: "Fizika" },
  ];

  it("berilgan subjectId'ning fan nomiga mos BARCHA id'larni qaytaradi", () => {
    const group = resolveSubjectGroup(subjects, "math-school");
    expect(group.name).toBe("Matematika");
    expect(group.ids.sort()).toEqual(["math-attestation", "math-dtm", "math-school"]);
  });

  it("bir xil nomga ega bo'lmagan fanni guruhga qo'shmaydi", () => {
    const group = resolveSubjectGroup(subjects, "physics-dtm");
    expect(group.ids).toEqual(["physics-dtm"]);
  });

  it("subjectId ro'yxatda topilmasa, faqat o'zini xavfsiz qaytaradi", () => {
    const group = resolveSubjectGroup(subjects, "unknown-id");
    expect(group).toEqual({ name: "", ids: ["unknown-id"] });
  });

  it("ro'yxat bo'sh bo'lsa ham yiqilmaydi", () => {
    expect(resolveSubjectGroup([], "any-id")).toEqual({ name: "", ids: ["any-id"] });
  });
});
