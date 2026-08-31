import { describe, expect, it } from "vitest";
import { resolveSolutionVisibility } from "../solution-visibility";

describe("resolveSolutionVisibility", () => {
  it("yechim umuman yo'q bo'lsa — hamma narsa null, unlocked true", () => {
    const r = resolveSolutionVisibility({
      explanation: null,
      explanationImages: [],
      videoUrl: null,
      writtenUnlocked: false,
      videoUnlocked: false,
    });
    expect(r).toEqual({
      explanation: null,
      explanationImages: [],
      videoUrl: null,
      solutionKind: "none",
      unlocked: true,
    });
  });

  it("yozma yechim bor, ochilmagan — explanation null qaytadi", () => {
    const r = resolveSolutionVisibility({
      explanation: "Yechim matni",
      explanationImages: ["img1"],
      videoUrl: null,
      writtenUnlocked: false,
      videoUnlocked: false,
    });
    expect(r.explanation).toBeNull();
    expect(r.explanationImages).toEqual([]);
    expect(r.solutionKind).toBe("written");
    expect(r.unlocked).toBe(false);
  });

  it("yozma yechim bor, ochilgan — to'liq qaytadi", () => {
    const r = resolveSolutionVisibility({
      explanation: "Yechim matni",
      explanationImages: ["img1"],
      videoUrl: null,
      writtenUnlocked: true,
      videoUnlocked: false,
    });
    expect(r.explanation).toBe("Yechim matni");
    expect(r.explanationImages).toEqual(["img1"]);
    expect(r.unlocked).toBe(true);
  });

  it("video bor, Premium emas — videoUrl null, lekin solutionKind 'video'", () => {
    const r = resolveSolutionVisibility({
      explanation: null,
      explanationImages: [],
      videoUrl: "https://youtube.com/watch?v=x",
      writtenUnlocked: true,
      videoUnlocked: false,
    });
    expect(r.videoUrl).toBeNull();
    expect(r.solutionKind).toBe("video");
    expect(r.unlocked).toBe(false);
  });

  it("video bor, Premium — videoUrl to'liq qaytadi", () => {
    const r = resolveSolutionVisibility({
      explanation: null,
      explanationImages: [],
      videoUrl: "https://youtube.com/watch?v=x",
      writtenUnlocked: false,
      videoUnlocked: true,
    });
    expect(r.videoUrl).toBe("https://youtube.com/watch?v=x");
    expect(r.unlocked).toBe(true);
  });

  it("HAM video, HAM yozma yechim mavjud — yozma yechim yashiriladi, faqat video ko'rsatiladi (Premium bo'lsa)", () => {
    const r = resolveSolutionVisibility({
      explanation: "Yechim matni",
      explanationImages: ["img1"],
      videoUrl: "https://youtube.com/watch?v=x",
      writtenUnlocked: true, // yozma yechim ochilgan bo'lsa ham...
      videoUnlocked: true,
    });
    expect(r.explanation).toBeNull(); // ...video mavjudligi sababli baribir ko'rsatilmaydi
    expect(r.explanationImages).toEqual([]);
    expect(r.videoUrl).toBe("https://youtube.com/watch?v=x");
    expect(r.solutionKind).toBe("video");
  });
});
