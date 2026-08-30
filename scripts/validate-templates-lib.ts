/**
 * `scripts/validate-templates.ts` (CLI) uchun sof tekshiruv mantig'i —
 * bazaga ulanmaydi, faqat `Template`/`Variant` obyektlari ustida ishlaydi,
 * shuning uchun `validate-templates-lib.test.ts` uni to'g'ridan-to'g'ri,
 * qo'lda tuzilgan (ataylab buzilgan) obyektlar bilan sinaydi.
 *
 * `src/lib/paramgen/qa.ts` — shablonlarni ko'zdan kechirish uchun yumshoq,
 * inson o'qiydigan hisobot (to'yinganlik, javob takrorlanishi kabi SIFAT
 * ogohlantirishlari, hech qachon CI'ni to'xtatmaydi). Bu fayl esa QAT'IY:
 * har bir topilgan muammo — bazaga yozilishdan oldin tuzatilishi SHART
 * bo'lgan xato, CI shu ro'yxat bo'sh bo'lmasa qizil bo'ladi.
 */
import { create, all } from "mathjs";
import { generateVariants, paramSpaceSize, type LocalizedText, type Template, type Variant } from "../src/lib/paramgen/paramgen";

const math = create(all, { number: "number" });

export const VARIANTS_PER_TEMPLATE = 50;
/** Sobit seed — validatsiya natijasi ishga tushirishlar orasida bir xil bo'lsin */
export const VALIDATION_SEED = 999;

export interface ValidationIssue {
  templateId: string;
  check: string;
  message: string;
  variantId?: string;
  variantIndex?: number;
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function hasLocalizedText(lt: LocalizedText | undefined): boolean {
  if (!lt) return false;
  return Object.values(lt).some((v) => typeof v === "string" && v.trim().length > 0);
}

/**
 * Shablon metama'lumotlarini tekshiradi — variant generatsiya qilmasdan.
 * `grade`/`exams` `Template`da ixtiyoriy (`?`) deb e'lon qilingan, lekin
 * bazaga yozilgan har bir haqiqiy shablonda to'ldirilgan bo'lishi shart —
 * bo'lmasa savol filtrlarda (sinf, imtihon turi) ko'rinmay qoladi.
 */
export function validateTemplateMeta(t: Template): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const push = (check: string, message: string) => issues.push({ templateId: t.id, check, message });

  if (!t.topic || !t.topic.trim()) push("topic", "topic bo'sh yoki berilmagan");
  if (t.difficulty === undefined || t.difficulty === null || !Number.isFinite(t.difficulty)) {
    push("difficulty", "difficulty berilmagan yoki son emas");
  }
  if (!t.grade || t.grade.length === 0) push("grade", "grade bo'sh yoki berilmagan");
  if (!t.exams || t.exams.length === 0) push("exams", "exams bo'sh yoki berilmagan");

  if (Array.isArray(t.distractors)) {
    t.distractors.forEach((d, i) => {
      if (!hasLocalizedText(d.why)) {
        push(
          "distractor-why",
          `distractors[${i}].why bo'sh — raqamli (expr asosidagi) shablonda har distraktor uchun izoh majburiy`
        );
      }
    });
  }

  return issues;
}

/**
 * Berilgan (allaqachon generatsiya qilingan) variantlar ro'yxatini
 * tekshiradi. Generatsiyadan ajratilgan — shu bilan testlar `generateVariants`
 * ichki mustahkamligiga (masalan `used` to'plami) qaram bo'lmay, qo'lda
 * tuzilgan buzilgan `Variant` obyektlari bilan har bir tekshiruvni alohida
 * sinay oladi.
 */
export function validateVariants(t: Template, variants: Variant[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const push = (check: string, message: string, v?: Variant, idx?: number) =>
    issues.push({ templateId: t.id, check, message, variantId: v?.variantId, variantIndex: idx });

  if (variants.length === 0) {
    push(
      "no-variants",
      `${VARIANTS_PER_TEMPLATE} ta so'ralgan, 0 ta chiqdi (parametr fazosi=${paramSpaceSize(t)}) — ` +
        `constraints juda qattiq yoki parametr diapazoni yaroqsiz`
    );
    return issues; // qolgan tekshiruvlarning ma'nosi yo'q
  }

  const ids = variants.map((v) => v.variantId);
  if (new Set(ids).size !== ids.length) {
    push("variant-sig-unique", `variantSig ${variants.length} variant ichida takrorlandi`);
  }

  variants.forEach((v, idx) => {
    // Javob har doim hisoblangan (NaN/Infinity/undefined bo'lmasin)
    const ans = v.answerValue;
    const answerOk = typeof ans === "number" ? Number.isFinite(ans) : typeof ans === "string" && ans.length > 0;
    if (!answerOk) push("answer-computed", `javob hisoblanmagan yoki yaroqsiz: ${String(ans)}`, v, idx);

    const correct = v.choices.filter((c) => c.correct);
    if (correct.length !== 1) {
      push("single-correct", `${correct.length} ta to'g'ri javob (aynan 1 ta bo'lishi kerak)`, v, idx);
    }
    const wrong = v.choices.filter((c) => !c.correct);
    const wrongTexts = wrong.map((c) => c.text);

    // Javob distraktorlarning birortasiga teng emas
    if (correct[0] && wrong.some((w) => w.text === correct[0].text)) {
      push("answer-not-distractor", `to'g'ri javob ("${correct[0].text}") distraktorlardan biriga teng`, v, idx);
    }

    // Distraktorlar o'zaro takrorlanmaydi
    if (new Set(wrongTexts).size !== wrongTexts.length) {
      push("distractors-unique", `distraktorlar o'zaro takrorlanadi: ${wrongTexts.join(", ")}`, v, idx);
    }

    // constraints — real generatsiya qilingan scope bilan qayta tekshiriladi
    if (t.constraints) {
      for (const c of t.constraints) {
        try {
          if (math.evaluate(c, { ...v.scope }) !== true) {
            push("constraints", `constraint bajarilmagan: "${c}" (scope: ${JSON.stringify(v.scope)})`, v, idx);
          }
        } catch (e) {
          push("constraints", `constraint hisoblanmadi: "${c}" — ${errMsg(e)}`, v, idx);
        }
      }
    }

    // stem/solution'da to'ldirilmagan {param} qolmagan
    if (v.stem.includes("{")) push("stem-unfilled", `stem'da to'ldirilmagan parametr qoldi: "${v.stem}"`, v, idx);
    if (v.solution.includes("{")) {
      push("solution-unfilled", `solution'da to'ldirilmagan parametr qoldi: "${v.solution}"`, v, idx);
    }

    // unit berilgan bo'lsa, javob matnida ko'rinishi kerak
    if ("expr" in t.answer && t.answer.unit && correct[0] && !correct[0].text.includes(t.answer.unit)) {
      push("unit-visible", `unit "${t.answer.unit}" javob matnida ko'rinmayapti: "${correct[0].text}"`, v, idx);
    }
  });

  return issues;
}

/** To'liq oqim: generatsiya + barcha tekshiruvlar. CLI aynan shu funksiyani chaqiradi. */
export function validateTemplate(
  t: Template,
  count = VARIANTS_PER_TEMPLATE,
  seed = VALIDATION_SEED
): ValidationIssue[] {
  const meta = validateTemplateMeta(t);

  let variants: Variant[];
  try {
    variants = generateVariants(t, { count, seed });
  } catch (e) {
    return [...meta, { templateId: t.id, check: "generate", message: `generateVariants xato berdi: ${errMsg(e)}` }];
  }

  return [...meta, ...validateVariants(t, variants)];
}

export function validateAllTemplates(
  templates: Template[],
  count = VARIANTS_PER_TEMPLATE,
  seed = VALIDATION_SEED
): ValidationIssue[] {
  return templates.flatMap((t) => validateTemplate(t, count, seed));
}
