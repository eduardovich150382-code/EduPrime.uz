import { describe, expect, it } from "vitest";
import {
  computeLockedLessonIds,
  isLessonSatisfied,
  type LessonProgressState,
  type LockableLesson,
} from "../course-lock";

const video = (id: string): LockableLesson => ({ id, type: "VIDEO", minPassPercent: null });
const quiz = (id: string, minPassPercent: number | null): LockableLesson => ({
  id,
  type: "QUIZ",
  minPassPercent,
});

describe("isLessonSatisfied", () => {
  it("progress yo'q bo'lsa qanoatlantirilmagan deb hisoblanadi", () => {
    expect(isLessonSatisfied(video("l1"), undefined)).toBe(false);
  });

  it("completed=false bo'lsa qanoatlantirilmagan", () => {
    const progress: LessonProgressState = { completed: false, bestScorePercent: 100 };
    expect(isLessonSatisfied(video("l1"), progress)).toBe(false);
  });

  it("VIDEO/TEXT/PDF dars uchun completed=true kifoya (ball talab qilinmaydi)", () => {
    const progress: LessonProgressState = { completed: true, bestScorePercent: null };
    expect(isLessonSatisfied(video("l1"), progress)).toBe(true);
  });

  it("QUIZ dars, minPassPercent belgilanmagan bo'lsa faqat completed kifoya", () => {
    const progress: LessonProgressState = { completed: true, bestScorePercent: 0 };
    expect(isLessonSatisfied(quiz("l1", null), progress)).toBe(true);
  });

  it("QUIZ dars, ball chegaradan past bo'lsa qanoatlantirilmagan", () => {
    const progress: LessonProgressState = { completed: true, bestScorePercent: 59 };
    expect(isLessonSatisfied(quiz("l1", 60), progress)).toBe(false);
  });

  it("QUIZ dars, ball chegaraga teng yoki undan yuqori bo'lsa qanoatlantirilgan", () => {
    const exact: LessonProgressState = { completed: true, bestScorePercent: 60 };
    const above: LessonProgressState = { completed: true, bestScorePercent: 90 };
    expect(isLessonSatisfied(quiz("l1", 60), exact)).toBe(true);
    expect(isLessonSatisfied(quiz("l1", 60), above)).toBe(true);
  });
});

describe("computeLockedLessonIds", () => {
  it("sequentialUnlock o'chirilgan bo'lsa hech narsa qulflanmaydi", () => {
    const lessons = [video("l1"), video("l2"), video("l3")];
    const locked = computeLockedLessonIds(lessons, new Map(), false);
    expect(locked.size).toBe(0);
  });

  it("sequentialUnlock yoqilgan, birinchi dars tugallanmagan bo'lsa qolganlari qulflanadi", () => {
    const lessons = [video("l1"), video("l2"), video("l3")];
    const progress = new Map<string, LessonProgressState>();
    const locked = computeLockedLessonIds(lessons, progress, true);

    expect(locked.has("l1")).toBe(false); // birinchi dars hech qachon qulflanmaydi
    expect(locked.has("l2")).toBe(true);
    expect(locked.has("l3")).toBe(true);
  });

  it("barcha oldingi darslar tugallangan bo'lsa hech narsa qulflanmaydi", () => {
    const lessons = [video("l1"), video("l2"), video("l3")];
    const progress = new Map<string, LessonProgressState>([
      ["l1", { completed: true, bestScorePercent: null }],
      ["l2", { completed: true, bestScorePercent: null }],
      ["l3", { completed: true, bestScorePercent: null }],
    ]);
    const locked = computeLockedLessonIds(lessons, progress, true);
    expect(locked.size).toBe(0);
  });

  it("QUIZ darsda minPassPercent talabi bajarilmasa keyingi darslar qulflanadi", () => {
    const lessons = [video("l1"), quiz("l2", 70), video("l3")];
    const progress = new Map<string, LessonProgressState>([
      ["l1", { completed: true, bestScorePercent: null }],
      ["l2", { completed: true, bestScorePercent: 50 }], // 70 dan past
    ]);
    const locked = computeLockedLessonIds(lessons, progress, true);

    expect(locked.has("l1")).toBe(false);
    expect(locked.has("l2")).toBe(false); // o'zi qulflanmaydi, faqat keyingilarni qulflaydi
    expect(locked.has("l3")).toBe(true);
  });

  it("QUIZ darsda minPassPercent talabi bajarilsa keyingi darslar ochiladi", () => {
    const lessons = [video("l1"), quiz("l2", 70), video("l3")];
    const progress = new Map<string, LessonProgressState>([
      ["l1", { completed: true, bestScorePercent: null }],
      ["l2", { completed: true, bestScorePercent: 85 }],
    ]);
    const locked = computeLockedLessonIds(lessons, progress, true);
    expect(locked.size).toBe(0);
  });

  it("o'rtadagi tugallanmagan dars o'zi qulflanmaydi, lekin undan keyingi barchasini qulflaydi (hatto DB'da completed=true bo'lsa ham)", () => {
    const lessons = [video("l1"), video("l2"), video("l3"), video("l4")];
    const progress = new Map<string, LessonProgressState>([
      ["l1", { completed: true, bestScorePercent: null }],
      ["l2", { completed: false, bestScorePercent: null }],
      ["l3", { completed: true, bestScorePercent: null }], // avvaldan completed, lekin l2 tugallanmagan
      ["l4", { completed: true, bestScorePercent: null }],
    ]);
    const locked = computeLockedLessonIds(lessons, progress, true);

    expect(locked.has("l1")).toBe(false);
    expect(locked.has("l2")).toBe(false); // navbatdagi ochiq dars — o'zi qulf emas, tugallanishi kerak
    expect(locked.has("l3")).toBe(true);
    expect(locked.has("l4")).toBe(true);
  });
});
