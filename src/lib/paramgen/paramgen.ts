/**
 * EduPrime.uz — Parametrik savol generatori
 * ------------------------------------------
 * Bitta shablondan (template) yuzlab noyob, lekin pedagogik jihatdan
 * bir xil savol varianti hosil qiladi.
 *
 * Ishlatish:
 *   import { generateVariants } from "./paramgen";
 *   const variants = generateVariants(template, { count: 200, seed: 42 });
 *
 * Muhim: bu generator OFFLINE (build/seed skript) ishlaydi. Chiqqan
 * variantlar oddiy savol sifatida bazaga yoziladi — runtime'da hech qanday
 * hisob-kitob yo'q, ya'ni platformaning qolgan qismi umuman o'zgarmaydi.
 */

import { create, all } from "mathjs";

const math = create(all, { number: "number" });

/* ------------------------------------------------------------------ */
/*  Turlar                                                             */
/* ------------------------------------------------------------------ */

export type Lang = "uz" | "ru" | "en";
export type LocalizedText = Partial<Record<Lang, string>>;

export type ParamSpec =
  | { name: string; type: "int"; min: number; max: number; step?: number }
  | { name: string; type: "choice"; values: number[] }
  | { name: string; type: "const"; value: number }
  /** Bir nechta nomni bitta qatordan biriktiradi (masalan Pifagor uchliklari) */
  | { name: string; type: "set"; names: string[]; rows: number[][] };

export interface Distractor {
  /** Noto'g'ri javob formulasi — TIPIK XATO natijasi bo'lishi shart */
  expr: string;
  /** Qanday xato ekanini tushuntirish (natija sahifasida ko'rsatiladi) */
  why: LocalizedText;
}

export interface Template {
  id: string;
  subject: string;
  topic: string;
  subtopic?: string;
  grade?: number[];
  exams?: string[];
  /** 1=oson … 5=juda qiyin (keyin real ma'lumot bilan avtomatik kalibrlanadi) */
  difficulty: number;
  params: ParamSpec[];
  /** Ketma-ket hisoblanadigan yordamchi kattaliklar */
  derived?: Record<string, string>;
  /** Hammasi true bo'lgandagina variant qabul qilinadi */
  constraints?: string[];
  answer: { expr: string; unit?: string; round?: number };
  distractors: Distractor[];
  stem: LocalizedText;
  solution: LocalizedText;
  hints?: LocalizedText[];
  tags?: string[];
}

export interface Choice {
  key: string;
  text: string;
  correct: boolean;
  why?: LocalizedText;
}

export interface Variant {
  variantId: string;
  templateId: string;
  subject: string;
  topic: string;
  difficulty: number;
  lang: Lang;
  stem: string;
  choices: Choice[];
  answerValue: number;
  solution: string;
  hints: string[];
  scope: Record<string, number>;
}

/* ------------------------------------------------------------------ */
/*  Yordamchi funksiyalar                                              */
/* ------------------------------------------------------------------ */

/** Deterministik RNG — bir xil seed = bir xil variantlar (qayta tiklanuvchan) */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash32(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Suzuvchi nuqtali chiqindini tozalab, chiroyli ko'rinishga keltiradi */
export function fmt(n: number, digits = 3): string {
  if (!Number.isFinite(n)) return "—";
  const r = Number(n.toFixed(digits));
  return String(r);
}

function pick<T>(rnd: () => number, arr: T[]): T {
  return arr[Math.floor(rnd() * arr.length)];
}

function interpolate(tpl: string, scope: Record<string, number>): string {
  return tpl.replace(/\{(\w+)(?::(\d+))?\}/g, (_m, key: string, d?: string) => {
    const v = scope[key];
    if (v === undefined) return `{${key}}`;
    return d !== undefined ? v.toFixed(Number(d)) : fmt(v);
  });
}

function evalExpr(expr: string, scope: Record<string, number>): number | boolean {
  return math.evaluate(expr, { ...scope }) as number | boolean;
}

/* ------------------------------------------------------------------ */
/*  Asosiy generator                                                   */
/* ------------------------------------------------------------------ */

export interface GenOptions {
  count?: number;
  seed?: number;
  lang?: Lang;
  /** Bitta variant uchun urinishlar chegarasi (rejection sampling) */
  maxTries?: number;
  /** Chalg'ituvchi javoblar soni (jami variantlar = shu + 1) */
  optionCount?: number;
}

export function generateVariants(
  t: Template,
  opts: GenOptions = {}
): Variant[] {
  const {
    count = 100,
    seed = 1,
    lang = "uz",
    maxTries = 400,
    optionCount = 4,
  } = opts;

  const rnd = mulberry32(hash32(t.id) ^ seed);
  const out: Variant[] = [];
  const seenSignatures = new Set<string>();
  const roundTo = t.answer.round ?? 2;

  let tries = 0;
  while (out.length < count && tries < count * maxTries) {
    tries++;

    // 1) Parametrlarni tanlash
    const scope: Record<string, number> = {};
    for (const p of t.params) {
      if (p.type === "const") scope[p.name] = p.value;
      else if (p.type === "choice") scope[p.name] = pick(rnd, p.values);
      else if (p.type === "int") {
        const step = p.step ?? 1;
        const n = Math.floor((p.max - p.min) / step) + 1;
        scope[p.name] = p.min + step * Math.floor(rnd() * n);
      } else if (p.type === "set") {
        const row = pick(rnd, p.rows);
        p.names.forEach((nm, i) => (scope[nm] = row[i]));
      }
    }

    // 2) Hosilaviy kattaliklar
    let ok = true;
    if (t.derived) {
      for (const [k, expr] of Object.entries(t.derived)) {
        try {
          const v = evalExpr(expr, scope);
          if (typeof v !== "number" || !Number.isFinite(v)) { ok = false; break; }
          scope[k] = v;
        } catch { ok = false; break; }
      }
    }
    if (!ok) continue;

    // 3) Cheklovlar (chiroyli javob, fizik ma'noga egalik va h.k.)
    if (t.constraints) {
      for (const c of t.constraints) {
        try {
          if (evalExpr(c, scope) !== true) { ok = false; break; }
        } catch { ok = false; break; }
      }
    }
    if (!ok) continue;

    // 4) Takrorlanmaslik
    const signature = t.params
      .flatMap((p) => (p.type === "set" ? p.names : [p.name]))
      .map((n) => `${n}=${scope[n]}`)
      .join("|");
    if (seenSignatures.has(signature)) continue;

    // 5) To'g'ri javob
    let ans: number;
    try {
      const raw = evalExpr(t.answer.expr, scope);
      if (typeof raw !== "number") throw new Error("javob ifodasi son emas");
      ans = Number(raw.toFixed(roundTo));
    } catch { continue; }
    if (!Number.isFinite(ans)) continue;
    scope["ans"] = ans;

    // 6) Chalg'ituvchilar — takrorlanmasin va javobga teng bo'lmasin
    const used = new Set<number>([ans]);
    const wrong: { value: number; why: LocalizedText }[] = [];
    for (const d of t.distractors) {
      if (wrong.length >= optionCount - 1) break;
      let v: number;
      try {
        const raw = evalExpr(d.expr, scope);
        if (typeof raw !== "number") throw new Error("chalg'ituvchi ifoda son emas");
        v = Number(raw.toFixed(roundTo));
      } catch { continue; }
      if (!Number.isFinite(v) || used.has(v)) continue;
      used.add(v);
      wrong.push({ value: v, why: d.why });
    }
    // Yetmasa — javobga yaqin "shovqin" bilan to'ldiramiz (oxirgi chora)
    let guard = 0;
    while (wrong.length < optionCount - 1 && guard++ < 50) {
      const k = [1.5, 0.5, 2, 0.25, 3][wrong.length % 5];
      const v = Number((ans * k).toFixed(roundTo));
      if (Number.isFinite(v) && !used.has(v) && v !== 0) {
        used.add(v);
        wrong.push({ value: v, why: {} });
      } else guard += 5;
    }
    if (wrong.length < optionCount - 1) continue;

    // 7) Variantlarni aralashtirish
    const unit = t.answer.unit ? ` ${t.answer.unit}` : "";
    const pool: Choice[] = [
      { key: "", text: fmt(ans) + unit, correct: true },
      ...wrong.map((w) => ({
        key: "",
        text: fmt(w.value) + unit,
        correct: false,
        why: w.why,
      })),
    ];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    pool.forEach((c, i) => (c.key = "ABCD"[i]));

    seenSignatures.add(signature);
    out.push({
      variantId: `${t.id}#${hash32(signature).toString(36)}`,
      templateId: t.id,
      subject: t.subject,
      topic: t.topic,
      difficulty: t.difficulty,
      lang,
      stem: interpolate(t.stem[lang] ?? t.stem.uz ?? "", scope),
      choices: pool,
      answerValue: ans,
      solution: interpolate(t.solution[lang] ?? t.solution.uz ?? "", scope),
      hints: (t.hints ?? []).map((h) => interpolate(h[lang] ?? h.uz ?? "", scope)),
      scope,
    });
  }

  return out;
}

/* ------------------------------------------------------------------ */
/*  Sifat nazorati — shablonni bazaga qo'shishdan OLDIN majburiy       */
/* ------------------------------------------------------------------ */

/** Shablon nazariy jihatdan nechta har xil parametr to'plami bera oladi */
export function paramSpaceSize(t: Template): number {
  return t.params.reduce((acc, p) => {
    if (p.type === "const") return acc;
    if (p.type === "choice") return acc * p.values.length;
    if (p.type === "set") return acc * p.rows.length;
    const step = p.step ?? 1;
    return acc * (Math.floor((p.max - p.min) / step) + 1);
  }, 1);
}

export interface QaReport {
  templateId: string;
  requested: number;
  produced: number;
  spaceSize: number;
  /** Cheklovlardan o'tgan variantlar ulushi */
  saturation: number;
  uniqueAnswers: number;
  answerCollisionRate: number;
  problems: string[];
  sample?: Variant;
}

export function qaTemplate(t: Template, count = 200): QaReport {
  const vs = generateVariants(t, { count, seed: 7 });
  const problems: string[] = [];
  const answers = new Set(vs.map((v) => v.answerValue));
  const space = paramSpaceSize(t);
  const reachable = Math.min(count, space);

  if (vs.length < reachable * 0.6)
    problems.push(`Cheklovlar juda qattiq: ${space} ta kombinatsiyadan faqat ${vs.length} tasi o'tdi`);
  if (space < 40)
    problems.push(`Parametr fazosi kichik (${space}) — diapazonni kengaytiring yoki shablonni bo'ling`);
  if (answers.size < vs.length * 0.4)
    problems.push(`Javoblar tez-tez takrorlanyapti (${answers.size} noyob) — variantlar sun'iy ko'rinadi`);
  for (const v of vs) {
    if (v.choices.some((c) => c.text.length > 14))
      { problems.push(`Xunuk son: ${v.choices.map((c) => c.text).join(", ")}`); break; }
    if (v.stem.includes("{"))
      { problems.push(`Stem'da to'ldirilmagan o'zgaruvchi: ${v.stem}`); break; }
    if (v.choices.filter((c) => c.correct).length !== 1)
      { problems.push("To'g'ri javob soni 1 emas"); break; }
  }

  return {
    templateId: t.id,
    requested: count,
    produced: vs.length,
    spaceSize: space,
    saturation: Number((vs.length / Math.max(reachable, 1)).toFixed(2)),
    uniqueAnswers: answers.size,
    answerCollisionRate: Number((1 - answers.size / Math.max(vs.length, 1)).toFixed(2)),
    problems,
    sample: vs[0],
  };
}
