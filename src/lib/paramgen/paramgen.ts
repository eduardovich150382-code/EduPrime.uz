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
  /**
   * Bir nechta nomni bitta qatordan biriktiradi (masalan Pifagor uchliklari).
   * Ustunlar matn ham bo'lishi mumkin (masalan sana, voqea nomi, toifa) —
   * lekin matnli ustunlar `derived` va `answer.expr` kabi mathjs
   * ifodalarida ISHLATILMAYDI (faqat sonli ustunlar ishlatiladi).
   */
  | { name: string; type: "set"; names: string[]; rows: (number | string)[][] };

export interface Distractor {
  /** Noto'g'ri javob formulasi — TIPIK XATO natijasi bo'lishi shart */
  expr: string;
  /** Qanday xato ekanini tushuntirish (natija sahifasida ko'rsatiladi) */
  why: LocalizedText;
}

/**
 * Matnli (tarix, ona tili va h.k.) shablonlar uchun: chalg'ituvchilar
 * shu `set` ustunining boshqa qatorlaridan olinadi — mathjs ifodasi shart
 * emas.
 */
export interface FromColumnDistractors {
  /** `set` parametridagi ustun nomi (ParamSpec.names ichidan biri) */
  fromColumn: string;
  /**
   * otherRows — boshqa qatorlardan tasodifiy;
   * nearest — son sifatida talqin qilib, to'g'ri javobga eng yaqinlari (sanalar uchun);
   * sameGroup — shu ustundagi noyob qiymatlardan, to'g'ri javobdan boshqasi (toifalar uchun)
   */
  strategy: "otherRows" | "nearest" | "sameGroup";
  /** Nechta chalg'ituvchi kerak — berilmasa optionCount-1 */
  count?: number;
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
  answer:
    | { expr: string; unit?: string; round?: number }
    /** Javob hisoblanmaydi — `set` parametrining shu ustunidan/qiymatidan to'g'ridan-to'g'ri olinadi */
    | { fromParam: string };
  distractors: Distractor[] | FromColumnDistractors;
  stem: LocalizedText;
  solution: LocalizedText;
  hints?: LocalizedText[];
  tags?: string[];
  /** Bazaga nechta variant seed qilinishi kerak — berilmasa seed.ts'dagi umumiy PER_TEMPLATE ishlatiladi. Kichikroq parametr fazosiga ega yangi mavzular uchun (masalan 20) — 30+ shablon bo'lganda har biridan minglab variant shart emas. */
  seedCount?: number;
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
  answerValue: number | string;
  solution: string;
  hints: string[];
  scope: Record<string, number | string>;
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

/** Fisher-Yates — array nusxasini aralashtirib qaytaradi (asl massivga tegmaydi) */
function shuffled<T>(arr: T[], rnd: () => number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function interpolate(tpl: string, scope: Record<string, number | string>): string {
  return tpl.replace(/\{(\w+)(?::(\d+))?\}/g, (_m, key: string, d?: string) => {
    const v = scope[key];
    if (v === undefined) return `{${key}}`;
    if (typeof v === "string") return v;
    return d !== undefined ? v.toFixed(Number(d)) : fmt(v);
  });
}

function evalExpr(expr: string, scope: Record<string, number | string>): number | boolean {
  return math.evaluate(expr, { ...scope }) as number | boolean;
}

/* ------------------------------------------------------------------ */
/*  Matnli parametrlar — mathjs ifodalariga tushmasligini tekshirish   */
/* ------------------------------------------------------------------ */

/** Shu shablondagi "set" parametrlarning qaysi ustunlari matn ekanini aniqlaydi */
function textColumnNames(t: Template): Set<string> {
  const names = new Set<string>();
  for (const p of t.params) {
    if (p.type !== "set") continue;
    p.names.forEach((nm, i) => {
      if (p.rows.some((row) => typeof row[i] === "string")) names.add(nm);
    });
  }
  return names;
}

function identifiersOf(expr: string): string[] {
  const ids: string[] = [];
  math.parse(expr).traverse((node) => {
    if (node.type === "SymbolNode") ids.push((node as unknown as { name: string }).name);
  });
  return ids;
}

/** `derived`/`answer.expr` kabi mathjs ifodalarida matnli parametr ishlatilsa, aniq xato beradi */
function assertNoTextInExpr(templateId: string, source: string, expr: string, textNames: Set<string>): void {
  if (textNames.size === 0) return;
  let ids: string[];
  try {
    ids = identifiersOf(expr);
  } catch {
    return; // sintaksis xatosi keyinroq evalExpr'da o'z holicha ushlanadi
  }
  const bad = ids.find((id) => textNames.has(id));
  if (bad) {
    throw new Error(
      `Shablon "${templateId}": matnli parametr "${bad}" "${source}" ifodasida ishlatilgan ("${expr}") — ` +
        `matnli parametrlar mathjs ifodalarida ishlatilmaydi, faqat stem/solution/hints matnida yoki ` +
        `answer.fromParam / distractors.fromColumn orqali ishlatilishi mumkin.`
    );
  }
}

/** Har bir mathjs ifodasi ishlatilishi mumkin bo'lgan joyni bir marta (variant sikli boshlanmasdan) tekshiradi */
function validateTemplateExprs(t: Template, textNames: Set<string>): void {
  if (textNames.size === 0) return;
  if (t.derived) {
    for (const [k, expr] of Object.entries(t.derived)) assertNoTextInExpr(t.id, `derived.${k}`, expr, textNames);
  }
  if (t.constraints) {
    t.constraints.forEach((c, i) => assertNoTextInExpr(t.id, `constraints[${i}]`, c, textNames));
  }
  if ("expr" in t.answer) assertNoTextInExpr(t.id, "answer.expr", t.answer.expr, textNames);
  if (Array.isArray(t.distractors)) {
    t.distractors.forEach((d, i) => assertNoTextInExpr(t.id, `distractors[${i}].expr`, d.expr, textNames));
  }
}

/** `set` parametridagi bitta ustunning barcha qatorlardagi qiymatlarini qaytaradi */
function setColumnValues(t: Template, columnName: string): (number | string)[] {
  for (const p of t.params) {
    if (p.type !== "set") continue;
    const idx = p.names.indexOf(columnName);
    if (idx !== -1) return p.rows.map((row) => row[idx]);
  }
  throw new Error(`Shablon "${t.id}": distractors.fromColumn="${columnName}" hech qanday "set" parametrida topilmadi`);
}

/**
 * `fromColumn` chalg'ituvchi strategiyasi uchun nomzodlar ro'yxati (to'g'ri
 * javobga teng qiymatlar chiqarib tashlangan). Tashqi kod bu ro'yxatdan
 * kerakli sonini `used` to'plamiga qarab tanlab oladi.
 */
function fromColumnCandidates(
  strategy: FromColumnDistractors["strategy"],
  columnValues: (number | string)[],
  ans: number | string,
  rnd: () => number
): (number | string)[] {
  const pool = columnValues.filter((v) => v !== ans);
  if (strategy === "sameGroup") return shuffled(Array.from(new Set(pool)), rnd);
  if (strategy === "nearest") {
    const ansNum = Number(ans);
    if (!Number.isFinite(ansNum)) return [];
    return pool
      .filter((v) => Number.isFinite(Number(v)))
      .sort((a, b) => Math.abs(Number(a) - ansNum) - Math.abs(Number(b) - ansNum));
  }
  return shuffled(pool, rnd); // otherRows
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

  // Matnli parametrlarning mathjs ifodalariga tushib ketishini bir marta,
  // sikldan oldin tekshiramiz — noto'g'ri shablon har bir urinishda emas,
  // darhol aniq xato bilan to'xtaydi.
  const textNames = textColumnNames(t);
  validateTemplateExprs(t, textNames);
  const distractorColumnValues = Array.isArray(t.distractors)
    ? null
    : setColumnValues(t, t.distractors.fromColumn);

  const rnd = mulberry32(hash32(t.id) ^ seed);
  const out: Variant[] = [];
  const seenSignatures = new Set<string>();
  const roundTo = "expr" in t.answer ? t.answer.round ?? 2 : 2;

  let tries = 0;
  while (out.length < count && tries < count * maxTries) {
    tries++;

    // 1) Parametrlarni tanlash
    const scope: Record<string, number | string> = {};
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
    let ans: number | string;
    if ("fromParam" in t.answer) {
      // Hisoblanmaydi — parametr qatoridan to'g'ridan-to'g'ri olinadi
      // (masalan sana yoki toifa nomi).
      const raw = scope[t.answer.fromParam];
      if (raw === undefined) continue;
      ans = raw;
    } else {
      let computed: number;
      try {
        const raw = evalExpr(t.answer.expr, scope);
        if (typeof raw !== "number") throw new Error("javob ifodasi son emas");
        computed = Number(raw.toFixed(roundTo));
      } catch { continue; }
      if (!Number.isFinite(computed)) continue;
      ans = computed;
    }
    scope["ans"] = ans;

    // 6) Chalg'ituvchilar — takrorlanmasin va javobga teng bo'lmasin
    const used = new Set<number | string>([ans]);
    const wrong: { value: number | string; why: LocalizedText }[] = [];
    if (Array.isArray(t.distractors)) {
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
    } else {
      const limit = t.distractors.count ?? optionCount - 1;
      const candidates = fromColumnCandidates(t.distractors.strategy, distractorColumnValues!, ans, rnd);
      for (const v of candidates) {
        if (wrong.length >= optionCount - 1 || wrong.length >= limit) break;
        if (used.has(v)) continue;
        used.add(v);
        wrong.push({ value: v, why: {} });
      }
    }
    // Yetmasa — javobga yaqin "shovqin" bilan to'ldiramiz (oxirgi chora,
    // faqat sonli javob uchun — matnli javobga sonli "shovqin" ma'nosiz)
    if (wrong.length < optionCount - 1 && typeof ans === "number") {
      let guard = 0;
      while (wrong.length < optionCount - 1 && guard++ < 50) {
        const k = [1.5, 0.5, 2, 0.25, 3][wrong.length % 5];
        const v = Number((ans * k).toFixed(roundTo));
        if (Number.isFinite(v) && !used.has(v) && v !== 0) {
          used.add(v);
          wrong.push({ value: v, why: {} });
        } else guard += 5;
      }
    }
    if (wrong.length < optionCount - 1) continue;

    // 7) Variantlarni aralashtirish
    const unit = "expr" in t.answer && t.answer.unit ? ` ${t.answer.unit}` : "";
    const toText = (v: number | string) => (typeof v === "number" ? fmt(v) + unit : String(v));
    const pool: Choice[] = [
      { key: "", text: toText(ans), correct: true },
      ...wrong.map((w) => ({
        key: "",
        text: toText(w.value),
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
