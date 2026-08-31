import { describe, expect, it } from "vitest";
import { remainingSeconds } from "../remainingSeconds";

describe("remainingSeconds", () => {
  it("kelajakdagi expiresAt uchun to'g'ri qolgan soniyani hisoblaydi", () => {
    const now = new Date("2026-08-31T10:00:00.000Z");
    const expiresAt = new Date("2026-08-31T10:30:00.000Z"); // 30 daqiqa keyin
    expect(remainingSeconds(expiresAt, now)).toBe(30 * 60);
  });

  it("string ISO sana bilan ham ishlaydi", () => {
    const now = new Date("2026-08-31T10:00:00.000Z");
    expect(remainingSeconds("2026-08-31T10:01:00.000Z", now)).toBe(60);
  });

  it("muddati aynan hozir tugasa 0 qaytaradi", () => {
    const now = new Date("2026-08-31T10:00:00.000Z");
    expect(remainingSeconds(now, now)).toBe(0);
  });

  it("muddati allaqachon o'tgan bo'lsa manfiy emas, 0 qaytaradi", () => {
    const now = new Date("2026-08-31T10:00:00.000Z");
    const expiresAt = new Date("2026-08-31T09:00:00.000Z"); // 1 soat oldin tugagan
    expect(remainingSeconds(expiresAt, now)).toBe(0);
  });

  it("sahifa yangilanganda (masalan yarim vaqt o'tgach) qolgan aniq qiymatni beradi, to'liq davomiylikni emas", () => {
    const now = new Date("2026-08-31T10:20:00.000Z");
    const expiresAt = new Date("2026-08-31T10:30:00.000Z"); // 90 daqiqalik sessiyaning oxirgi 10 daqiqasi qoldi
    expect(remainingSeconds(expiresAt, now)).toBe(10 * 60);
  });
});
