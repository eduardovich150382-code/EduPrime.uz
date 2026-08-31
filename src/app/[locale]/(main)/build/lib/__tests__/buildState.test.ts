import { describe, expect, it } from "vitest";
import {
  buildStateFromParams,
  buildStateToItemSpec,
  buildStateToParams,
  defaultBuildState,
  estimateDurationMin,
  PRESETS,
} from "../buildState";

describe("estimateDurationMin", () => {
  it("1 savolga 1.5 daqiqa hisoblaydi", () => {
    expect(estimateDurationMin(20)).toBe(30);
    expect(estimateDurationMin(90)).toBe(135);
  });

  it("kamida 10 daqiqa qaytaradi", () => {
    expect(estimateDurationMin(1)).toBe(10);
    expect(estimateDurationMin(0)).toBe(10);
  });
});

describe("buildStateToParams / buildStateFromParams — aylanma", () => {
  it("standart holat bo'sh URL beradi", () => {
    const params = buildStateToParams(defaultBuildState());
    expect(params.toString()).toBe('');
  });

  it("o'zgartirilgan holat URL'ga to'g'ri yoziladi va qayta o'qilganda AYNAN tiklanadi", () => {
    const state = {
      ...defaultBuildState(),
      exams: ['dtm'],
      subjectIds: ['s1', 's2'],
      grades: [9, 10],
      topicPaths: ['mexanika', 'optika/lazer'],
      difficultyMin: 2,
      difficultyMax: 4,
      questionCount: 30,
      durationMin: 50,
      durationManual: true,
      bloomLevels: ['BILISH'],
      types: ['MULTIPLE_CHOICE'],
      lang: ['uz', 'ru'],
    };
    const params = buildStateToParams(state);
    const restored = buildStateFromParams(params);
    expect(restored).toEqual(state);
  });

  it("bo'sh URL standart holatni beradi (nol majburiy tanlov)", () => {
    expect(buildStateFromParams(new URLSearchParams())).toEqual(defaultBuildState());
  });

  it("noto'g'ri/tanilmagan qiymatlar xato bermay standartga tushadi", () => {
    const params = new URLSearchParams('g=9,abc,999&n=not-a-number&dmin=99&dmax=-5');
    const state = buildStateFromParams(params);
    expect(state.grades).toEqual([9]); // 'abc' va 999 (ro'yxatda yo'q) chiqarib tashlanadi
    expect(state.questionCount).toBe(defaultBuildState().questionCount);
    // dmin/dmax chegaradan tashqari bo'lsa ham natija hech qachon teskari (min>max) bo'lmaydi
    expect(state.difficultyMin).toBeLessThanOrEqual(state.difficultyMax);
  });

  it("durationManual=false bo'lsa va durationMin standartdan farq qilmasa, 'd' parametri yozilmaydi", () => {
    const params = buildStateToParams(defaultBuildState());
    expect(params.has('d')).toBe(false);
    expect(params.has('dm')).toBe(false);
  });
});

describe("buildStateToItemSpec", () => {
  it("standart holat bo'sh spec beradi (nol majburiy tanlov => filtrsiz so'rov)", () => {
    expect(buildStateToItemSpec(defaultBuildState())).toEqual({});
  });

  it("tanlangan maydonlarni spec'ga o'tkazadi, standart qiymatlarni tushirib qoldiradi", () => {
    const state = { ...defaultBuildState(), subjectIds: ['s1'], grades: [9], difficultyMin: 2 };
    expect(buildStateToItemSpec(state)).toEqual({ subjectIds: ['s1'], grades: [9], difficultyMin: 2 });
  });

  it("onlyItemIds tashqaridan uzatilsa spec'ga qo'shiladi", () => {
    expect(buildStateToItemSpec(defaultBuildState(), ['a', 'b'])).toEqual({ onlyItemIds: ['a', 'b'] });
  });

  it("onlyItemIds bo'sh massiv bo'lsa spec'ga qo'shilmaydi", () => {
    expect(buildStateToItemSpec(defaultBuildState(), [])).toEqual({});
  });
});

describe("PRESETS", () => {
  it("har biri questionCount va durationMin'ni beradi", () => {
    for (const preset of PRESETS) {
      const override = preset.apply();
      expect(override.questionCount).toBeGreaterThan(0);
      expect(override.durationMin).toBeGreaterThan(0);
    }
  });

  it("'DTM 90' — 90 savol, exams=['dtm']", () => {
    const dtm90 = PRESETS.find((p) => p.id === 'dtm90')!.apply();
    expect(dtm90.questionCount).toBe(90);
    expect(dtm90.exams).toEqual(['dtm']);
  });

  it("'Zaif mavzularim' preset yo'q — bilim xaritasi hali Item bankiga bog'lanmagan", () => {
    expect(PRESETS.find((p) => p.label.toLowerCase().includes('zaif'))).toBeUndefined();
  });
});
