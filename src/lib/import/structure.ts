import type { ResponseSchema } from '@google/generative-ai';
import { SchemaType } from '@google/generative-ai';
import type { KeyIssue, ResolvedAnswer } from './answer-key';
import {
  RateLimitedError,
  RETRY_RESERVE_MS,
  STRUCTURE_CONCURRENCY,
  TimeBudgetError,
  withRetry,
  type RetryOptions,
} from './structure-error';
import type { BBox } from './types';

/**
 * Xom blokni strukturalangan savolga aylantirish — prompt, sxema va javobni
 * tekshirish.
 *
 * Tarmoq chaqiruvi bu yerda EMAS: model `ModelCaller` sifatida ineksiya
 * qilinadi (haqiqiy chaqiruvchi — ./structure-model). Shu sabab bu fayl va
 * uning testlari SDK'ni mock qilmasdan ishlaydi va `src/lib/import/` ning
 * sofligi buzilmaydi.
 *
 * Har blok ALOHIDA chaqiruv: bitta so'rovga ko'p savol tiqilganda javob
 * `maxOutputTokens` da kesiladi va butun paket yo'qoladi. Alohida chaqiruvda
 * bitta savol yiqiladi, qolgani saqlanadi.
 */

/** `lib/gemini.ts` dagi bilan bir xil ro'yxat — Bloom taksonomiyasi. */
const BLOOM_VALUES = ['BILISH', 'TUSHUNISH', 'QOLLASH', 'TAHLIL', 'BAHOLASH', 'YARATISH'];

/** Rasm tokeni: model matn ichida shu ko'rinishda ko'radi va qaytaradi. */
export function imageToken(assetId: string): string {
  return `[[IMG:${assetId}]]`;
}

const IMAGE_TOKEN = /\[\[IMG:[^\]]*\]\]/g;

/**
 * Matndagi hamma rasm tokenini qaytaradi.
 *
 * Regexning O'ZI eksport qilinmaydi: `g` bayrog'i bilan u holatli
 * (`lastIndex`) va ikki modul uni baham ko'rsa, biri ikkinchisining
 * qidiruvini jimgina yarmidan boshlab yuborardi. S5 (`translate.ts`) shu
 * funksiyani ishlatadi.
 */
export function imageTokensOf(text: string): string[] {
  return text.match(IMAGE_TOKEN) ?? [];
}

export interface StructureInput {
  order: number;
  number: number | null;
  /** Blokning xom matni (`ImportDraft.textOriginal`). */
  text: string;
  images: { assetId: string; url: string }[];
  /** Savol turgan sahifalarning to'liq aksi. */
  pageImages: { page: number; url: string }[];
  regions: { page: number; bbox: BBox }[];
  sourceLang: string;
  subject: string;
  /** Naqsh bilan topilgan kalit — model uni TEKSHIRISH uchun ko'radi. */
  givenKey: ResolvedAnswer | null;
  /** Kalit topilmagan bo'lsa sababi — natijaning `issues` ida qoladi. */
  keyIssue: KeyIssue | null;
}

export interface StructuredOption {
  label: string;
  text: string;
  imageToken: string | null;
}

export interface StructuredQuestion {
  text: string;
  options: StructuredOption[];
  correctAnswer: string;
  type: 'MULTIPLE_CHOICE' | 'OPEN_ENDED';
  explanation: string;
  topicGuess: string;
  bloomLevel: string;
  difficulty: number | null;
  confidence: number;
  answerMismatch: boolean;
  notQuestion: boolean;
  issues: string[];
}

export interface StructureOutcome {
  order: number;
  question: StructuredQuestion | null;
  tokens: number;
  failed: boolean;
  /** Javobni qaysi model bergani — marshrut uni `raw.model` ga yozadi. */
  model?: string;
  /** Yiqilish sababi — marshrut uni `raw.lastError` ga yozadi. */
  error?: unknown;
  /**
   * Vaqt yetmagani uchun bajarilmadi — bu YIQILISH EMAS.
   *
   * Marshrut bunday blokka umuman tegmaydi: u `BLOCK` bosqichida qoladi va
   * keyingi so'rovda yangidan uriniladi.
   */
  deferred?: boolean;
  /**
   * Zanjirdagi hamma modelning kunlik kvotasi tugagani uchun bajarilmadi.
   *
   * `deferred` ning bir turi: blok `BLOCK` da qoladi va `attempts` oshmaydi,
   * lekin marshrut sababni ko'rsatib qo'yadi (`raw.lastError`, `RATE_LIMITED`)
   * — ustozga "ertaga davom eting" deyish uchun shu farq kerak.
   */
  rateLimited?: boolean;
}

/** Paketning natijasi va uning vaqt o'lchovlari. */
export interface StructureBatchResult {
  outcomes: StructureOutcome[];
  /** Nechta to'lqin bajarildi — klient konsoliga chiqadigan o'lchov. */
  batches: number;
  /** Muddat tugagani uchun qolgan bloklarga tegilmadimi. */
  deadlineHit: boolean;
}

/**
 * Modelga bitta ish birligini yuboradigan chaqiruvchi.
 *
 * Generik, chunki bir xil infratuzilma (`withRetry`, `createChainedCaller`)
 * ikkala bosqichga ham xizmat qiladi: S4 da birlik — bitta blok
 * (`StructureInput`), S5 da — savollar guruhi. Ular orasidagi yagona farq
 * kirish turi, qolgan hammasi bir xil.
 */
export type Caller<TInput> = (
  input: TInput,
  signal?: AbortSignal,
) => Promise<{ json: unknown; tokens: number; model?: string }>;

/** S4 ning chaqiruvchisi — eski nom saqlanadi, mavjud kod tegilmaydi. */
export type ModelCaller = Caller<StructureInput>;

/**
 * Bitta paketdagi parallel chaqiruvlar soni.
 *
 * `IMPORT_STRUCTURE_CONCURRENCY` bilan boshqariladi (standart 6): tashqi
 * tezlik chegarasiga urilganda uni pasaytirish deploy'siz hal qiladi.
 */
export const STRUCTURE_BATCH_SIZE = STRUCTURE_CONCURRENCY;

// ---------------------------------------------------------------------------
// Chiqish sxemasi
// ---------------------------------------------------------------------------

/**
 * `responseSchema` — modelning javobi shu shaklda keladi.
 *
 * `lib/gemini.ts#parseImportResponse` dagi "javobdan regex bilan JSON qidirish"
 * naqshi TAKRORLANMAYDI: u kesilgan javobda yiqiladi va xatoni faqat log'dan
 * bilib bo'ladi. Strukturalangan chiqish bilan javob allaqachon JSON.
 */
export const STRUCTURE_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    text: { type: SchemaType.STRING },
    options: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          label: { type: SchemaType.STRING },
          text: { type: SchemaType.STRING },
          imageToken: { type: SchemaType.STRING },
        },
        required: ['label', 'text'],
      },
    },
    correctAnswer: { type: SchemaType.STRING },
    type: { type: SchemaType.STRING, format: 'enum', enum: ['MULTIPLE_CHOICE', 'OPEN_ENDED'] },
    explanation: { type: SchemaType.STRING },
    topicGuess: { type: SchemaType.STRING },
    bloomLevel: { type: SchemaType.STRING, format: 'enum', enum: BLOOM_VALUES },
    difficulty: { type: SchemaType.INTEGER },
    confidence: { type: SchemaType.NUMBER },
    answerMismatch: { type: SchemaType.BOOLEAN },
    notQuestion: { type: SchemaType.BOOLEAN },
    issues: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
  },
  required: ['text', 'options', 'correctAnswer', 'type', 'notQuestion'],
};

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

function regionText(input: StructureInput): string {
  return input.regions
    .map((r) => `${r.page}-bet, x=${Math.round(r.bbox.x)} y=${Math.round(r.bbox.y)} ` +
      `w=${Math.round(r.bbox.w)} h=${Math.round(r.bbox.h)} (PDF nuqtalarida, boshi yuqori-chapda)`)
    .join('; ');
}

function keyText(input: StructureInput): string {
  if (!input.givenKey) {
    return `BERILGAN KALIT: yo'q (${input.keyIssue ?? 'NO_KEY_FOUND'}).
- Kalit yo'q, demak taqqoslaydigan narsa ham yo'q: "correctAnswer" ga O'Z
  yechimingni yoz va "answerMismatch": false qoldir.`;
  }
  return `BERILGAN KALIT: ${input.givenKey.letter} (manba: ${input.givenKey.source.kind}, ${input.givenKey.source.page}-bet).
- Savolni AVVAL o'zing yech, keyin kalitga qara. Kalit TEKSHIRISH uchun,
  nusxa ko'chirish uchun emas.
- Yechiming kalit bilan mos bo'lsa: "correctAnswer": "${input.givenKey.letter}",
  "answerMismatch": false.
- Yechiming kalitdan FARQ qilsa: "correctAnswer" ga baribir KALITNI yoz
  ("${input.givenKey.letter}") — o'qituvchi qaror qilsin, "answerMismatch": true qo'y va
  "explanation" da nega senda boshqacha chiqqanini qisqa yoz.`;
}

function imagesText(input: StructureInput): string {
  if (input.images.length === 0) {
    return 'Bu savolga kesilgan rasm ulanmagan — hech qanday [[IMG:...]] tokeni ishlatma.';
  }
  const tokens = input.images.map((img) => imageToken(img.assetId)).join(' ');
  return `Mavjud rasm tokenlari: ${tokens}
- Bu tokenlarni O'ZGARTIRMA, YARATMA, O'CHIRMA — qaytargan javobingda har biri
  AYNAN BIR MARTA bo'lishi kerak.
- Har tokenni kerakli joyga qo'y: savol shartiga tegishli bo'lsa "text" ichiga,
  bitta variantga tegishli bo'lsa o'sha variantning "imageToken" maydoniga.
- Variantlar A, B, C, D, E ostidagi beshta alohida grafik bo'lsa — har token
  o'z variantiga. Qaysi rasm qaysi variantga tegishli ekanini SAHIFA AKSIDAGI
  joylashuvidan aniqla.
- Token qaysi joyga tegishli ekani noaniq bo'lsa — "text" oxirida qoldir va
  "issues" ga "IMAGE_PLACEMENT_UNSURE" qo'sh. Tokenni YO'QOTMA.`;
}

/**
 * Bitta blok uchun prompt.
 *
 * Qoidalar tartibi ataylab: avval "bitta savol", keyin til, keyin kalit —
 * model uzun promptning boshi va oxirini yaxshiroq eslaydi.
 */
export function buildStructurePrompt(input: StructureInput): string {
  return `Sen o'quv qo'llanmasidan olingan BITTA test savolini strukturaga
soluvchi yordamchisan. Fan: ${input.subject}. Manba tili: ${input.sourceLang}.

ASOSIY
- Sen BITTA savolni tahlil qilyapsan, ko'p emas. Matnda ikkinchi savolning
  boshi ko'rinib qolsa — uni QO'SHMA.
- Matnni TARJIMA QILMA — asl tilda qoldir.
- Savol sahifada shu sohada joylashgan: ${regionText(input)}.

${keyText(input)}

SAHIFA AKSI — ISHONCHLI MANBA
- Matn va sahifa aksi ziddiyatga tushsa, SAHIFA AKSI to'g'ri. Berilgan matn
  PDF qatlamidan yoki OCR dan olingan, ikkalasi ham xato qilishi mumkin.
- Matn OCR dan kelgan bo'lsa unda tanish xatolar bo'ladi: "E)" tushib qolishi,
  "sin 37 — 0,6" (tire o'rniga tenglik), "l" va "1", "O" va "0" aralashishi,
  so'z bo'linishi. Rasmga qarab tuzat.

FORMULALAR
- Barcha formulalar LaTeX'da, $...$ ichida.
- PDF matnida matematik belgilar maxsus Unicode glifi bo'lib keladi: 𝛼,
  𝑎1<𝑎2<𝑎3, 𝑣 = 𝑣(𝑡). Bularni LaTeX'ga o'gir: $\\alpha$, $a_1 < a_2 < a_3$,
  $v = v(t)$. Unicode glifini natijada QOLDIRMA.
- Indeks va daraja matn qatlamida tekis chiqadi: "m/s2" aslida m/s², "x2"
  aslida x². Sahifa aksiga qarab to'g'risini yoz: $\\text{m/s}^2$, $x^2$.

RASMLAR
${imagesText(input)}

SAVOL EMAS BO'LGAN BLOKLAR
- Ba'zi bloklar savol emas. Bular uchun "notQuestion": true qo'y va qolgan
  maydonlarni bo'sh qoldir:
  · javob kaliti qatori — "2.C 3.D 4.C 6.A 7.B 8.C 9.D"
  · bo'lim sarlavhasi — "9. Tekis o'zgaruvchan harakatni grafik ravishda
    tasvirlash." (raqam bilan boshlanadi, lekin savol emas: so'roq yo'q,
    variant yo'q, sahifa aksida sarlavha ko'rinishida)
  · mundarija, kolontitul, reklama
- Savol matnining OXIRIDA keyingi bo'limning sarlavhasi turgan bo'lsa (sahifa
  aksida u sarlavha ko'rinishida ajralib turadi) — uni "text" ga QO'SHMA,
  tashlab yubor.

TURI
- Variantlari bor → MULTIPLE_CHOICE. Variantlari yo'q va javob yozib
  beriladigan bo'lsa ("tenglamasini yozing", "grafikni chizing") → OPEN_ENDED.
- Standart qiymat sifatida MULTIPLE_CHOICE qo'yma — turini matndan aniqla.
- OPEN_ENDED da "options" bo'sh massiv, "correctAnswer" esa javob matni.

METAMA'LUMOT
- "topicGuess" — qisqa mavzu tegi (2-4 so'z, masalan: Kvadrat tenglama).
- "difficulty" — 1 dan 5 gacha butun son: bir bosqichli hisob/eslab qolish =
  1-2, ko'p bosqichli fikrlash yoki chuqur tahlil = 4-5.
- "bloomLevel" faqat quyidagilardan biri: ${BLOOM_VALUES.join(', ')}.
- "confidence" — 0 dan 1 gacha: matn sifati past yoki noaniq bo'lsa pasaytir.
- "issues" — muammo kodlari massivi, muammo bo'lmasa bo'sh.

SAVOL MATNI (xom):
${input.text}`;
}

// ---------------------------------------------------------------------------
// Javobni tekshirish
// ---------------------------------------------------------------------------

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown, max = 4000): string {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

function letterOf(value: string): string {
  return value.trim().toUpperCase();
}

/**
 * Model qaytargan tokenlarni haqiqiy rasmlar bilan solishtiradi.
 *
 * Uch xil buzilish tuzatiladi: o'ylab topilgan token olib tashlanadi, takror
 * ishlatilgani birinchisidan boshqa joyda o'chiriladi, yo'qolgani esa `text`
 * oxiriga qaytariladi. Rasm yo'qolishi eng og'ir xato — rasmsiz savolni ustoz
 * umuman tushunmaydi, shuning uchun u har doim tiklanadi.
 */
function reconcileImages(
  text: string,
  options: StructuredOption[],
  input: StructureInput,
  issues: string[],
): { text: string; options: StructuredOption[] } {
  const known = new Set(input.images.map((img) => imageToken(img.assetId)));
  const used = new Set<string>();

  const keepFirst = (token: string): boolean => {
    if (!known.has(token) || used.has(token)) return false;
    used.add(token);
    return true;
  };

  let cleanText = text.replace(IMAGE_TOKEN, (token) => (keepFirst(token) ? token : ''));
  const cleanOptions = options.map((option) => ({
    ...option,
    text: option.text.replace(IMAGE_TOKEN, (token) => (keepFirst(token) ? token : '')).trim(),
    imageToken: option.imageToken && keepFirst(option.imageToken) ? option.imageToken : null,
  }));

  const missing = [...known].filter((token) => !used.has(token));
  if (missing.length > 0) {
    cleanText = `${cleanText.trimEnd()}\n${missing.join('\n')}`;
    issues.push('IMAGE_TOKEN_RESTORED');
  }

  return { text: cleanText.trim(), options: cleanOptions };
}

/**
 * Model javobini `ImportDraft` ga yoziladigan shaklga keltiradi.
 *
 * Falsafa `lib/gemini.ts#parseImportResponse` dagidek: noto'g'ri maydon faqat
 * O'ZINI yo'qotadi, butun savolni emas — strukturalash qayta chaqiruvi pul,
 * ustoz esa bitta bo'sh maydonni o'zi to'ldira oladi.
 */
export function normalizeStructured(raw: unknown, input: StructureInput): StructuredQuestion {
  const r = asRecord(raw);
  const issues: string[] = [];

  const rawOptions = Array.isArray(r.options) ? r.options : [];
  const options: StructuredOption[] = rawOptions.slice(0, 8).map((item, index) => {
    const o = asRecord(item);
    return {
      label: asString(o.label, 4) || String.fromCharCode(65 + index),
      text: asString(o.text),
      imageToken: typeof o.imageToken === 'string' && o.imageToken ? o.imageToken : null,
    };
  });

  const reconciled = reconcileImages(asString(r.text), options, input, issues);

  const modelAnswer = letterOf(asString(r.correctAnswer, 500));
  // Uchala holat: kalit bor va mos → kalit; kalit bor va farq → KALIT +
  // answerMismatch; kalit yo'q → modelning o'z yechimi, mismatch yo'q
  // (taqqoslanadigan narsa yo'q).
  const correctAnswer = input.givenKey ? input.givenKey.letter : asString(r.correctAnswer, 500).trim();
  const answerMismatch = Boolean(
    input.givenKey && modelAnswer && modelAnswer !== letterOf(input.givenKey.letter),
  );
  if (input.keyIssue) issues.push(input.keyIssue);

  const difficulty = Number(r.difficulty);
  const confidence = Number(r.confidence);

  for (const issue of Array.isArray(r.issues) ? r.issues.slice(0, 10) : []) {
    const code = asString(issue, 40);
    if (code && !issues.includes(code)) issues.push(code);
  }

  return {
    text: reconciled.text,
    options: reconciled.options,
    correctAnswer,
    type: r.type === 'OPEN_ENDED' ? 'OPEN_ENDED' : 'MULTIPLE_CHOICE',
    explanation: asString(r.explanation),
    topicGuess: asString(r.topicGuess, 100),
    bloomLevel: BLOOM_VALUES.includes(String(r.bloomLevel)) ? String(r.bloomLevel) : '',
    difficulty: Number.isInteger(difficulty) && difficulty >= 1 && difficulty <= 5 ? difficulty : null,
    confidence: Number.isFinite(confidence) ? Math.min(Math.max(confidence, 0), 1) : 0.5,
    answerMismatch,
    notQuestion: r.notQuestion === true,
    issues,
  };
}

// ---------------------------------------------------------------------------
// Paketlash
// ---------------------------------------------------------------------------

/**
 * Bloklarni paketlab strukturalaydi.
 *
 * `Promise.allSettled` — paketdagi bitta chaqiruv yiqilsa (tarmoq, kvota,
 * model xatosi) qolgan beshtasi baribir qaytadi va yoziladi. `Promise.all`
 * bo'lsa butun paket yo'qolardi va qayta chaqiruv o'sha beshtasini QAYTA
 * to'lardi.
 *
 * Har chaqiruv `withRetry` bilan o'raladi: vaqtinchalik chegara (429/503)
 * bitta savolni butun boshli yiqitmasin. Qayta urinish sababi yo'qolmaydi —
 * `result.reason` natijaning `error` maydoniga o'tadi va marshrut uni
 * saqlaydi.
 */
export async function structureBatch(
  inputs: readonly StructureInput[],
  call: ModelCaller,
  size: number = STRUCTURE_BATCH_SIZE,
  retry: RetryOptions = {},
): Promise<StructureBatchResult> {
  const outcomes: StructureOutcome[] = [];
  const resilient = withRetry(call, retry);
  const remaining = retry.remaining;
  let batches = 0;
  let deadlineHit = false;

  for (let start = 0; start < inputs.length; start += size) {
    const batch = inputs.slice(start, start + size);
    const settled = await Promise.allSettled(batch.map((input) => resilient(input)));
    batches++;

    settled.forEach((result, index) => {
      const input = batch[index];
      if (result.status === 'rejected') {
        // Kvota tugagani ham, vaqt tugagani ham YIQILISH EMAS: ikkalasi ham
        // blokning nuqsoni emas, tashqi chegara — blok tegilmasdan qoladi.
        const rateLimited = result.reason instanceof RateLimitedError;
        const deferred = rateLimited || result.reason instanceof TimeBudgetError;
        outcomes.push({
          order: input.order,
          question: null,
          tokens: 0,
          failed: !deferred,
          deferred,
          rateLimited,
          error: result.reason,
        });
        return;
      }
      outcomes.push({
        order: input.order,
        question: normalizeStructured(result.value.json, input),
        tokens: result.value.tokens,
        failed: false,
        model: result.value.model,
      });
    });

    // Muddat faqat to'lqinlar ORASIDA tekshiriladi: boshlangan chaqiruvlar
    // tugaydi va natijasi yoziladi, aks holda Gemini'ga to'langan ish behuda
    // ketardi. Qolgan bloklarga esa umuman tegilmaydi — marshrut ular uchun
    // hech narsa yozmaydi va ular keyingi so'rovda olinadi.
    //
    // Chegara `withRetry` NIKIDAN kichik bo'lmasligi shart: u chaqiruvni
    // `remaining() <= RETRY_RESERVE_MS` da rad etadi. `<= 0` bo'lganda oradagi
    // 12 sekundda sikl ishlamaydigan to'lqinlarni ochaverardi — har chaqiruv
    // darhol `TimeBudgetError` otar, bloklar jimgina `deferred` bo'lar va
    // `deadlineHit` `false` bo'lib qolardi.
    if (remaining !== undefined && remaining() <= RETRY_RESERVE_MS && start + size < inputs.length) {
      deadlineHit = true;
      break;
    }
  }

  return { outcomes, batches, deadlineHit };
}
