import { describe, expect, it } from "vitest";
import { ASSET_MIN_LONG_SIDE_PX, ASSET_SHRINK_STEP } from "../constants";
import { shrinkPlan } from "../image-budget";

describe("shrinkPlan", () => {
  it("birinchi qadam — asl o'lcham (faqat JPEG ga o'girish)", () => {
    expect(shrinkPlan(3000, 2000)[0]).toEqual({ width: 3000, height: 2000 });
  });

  it("har qadamda ASSET_SHRINK_STEP ga kichraytiradi", () => {
    const plan = shrinkPlan(3000, 2000);

    expect(plan[1].width).toBe(Math.round(3000 * ASSET_SHRINK_STEP));
    expect(plan[2].width).toBe(Math.round(3000 * ASSET_SHRINK_STEP ** 2));
  });

  it("eng uzun tomon chegaradan pastga tushmaydi, oxirgi qadam aynan chegarada", () => {
    for (const [w, h] of [[3000, 2000], [1240, 1754], [1300, 900]]) {
      const plan = shrinkPlan(w, h);
      const longSides = plan.map((s) => Math.max(s.width, s.height));

      expect(Math.min(...longSides)).toBe(ASSET_MIN_LONG_SIDE_PX);
      expect(longSides.at(-1)).toBe(ASSET_MIN_LONG_SIDE_PX);
    }
  });

  it("chegaradan kichik rasm kichraytirilmaydi", () => {
    expect(shrinkPlan(900, 700)).toEqual([{ width: 900, height: 700 }]);
  });

  it("nisbat saqlanadi", () => {
    const last = shrinkPlan(1240, 1754).at(-1)!;

    expect(last.width / last.height).toBeCloseTo(1240 / 1754, 2);
  });
});
