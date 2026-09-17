import type { MapEntry, MatchInput, Pair } from './image-match';

/**
 * `ImportImageAttach` komponentining sof mantig'i: qoralamadagi savollarga
 * image-map rasmlarini qo'shish, olib tashlash va holatni hisoblash.
 *
 * Komponentdan ajratilgan, chunki testlar `node` muhitida ishlaydi va DOM
 * yo'q — idempotentlik va "rasm jimgina yo'qolmasin" talablari shu yerda
 * tekshiriladi.
 */

export interface AttachableQuestion {
  images: string[];
  text: string;
  options: { text: string }[];
}

export type PairStatus = 'verified' | 'flagged' | 'unchecked';

export function toMatchInput(question: AttachableQuestion): MatchInput {
  return { text: question.text, options: question.options.map((o) => o.text) };
}

/** Jobdagi barcha rasm URL lari — "bu rasm importdan kelgan" belgisi. */
export function mapUrls(entries: readonly MapEntry[]): Set<string> {
  return new Set(entries.flatMap((e) => e.images));
}

function unique(urls: readonly string[]): string[] {
  return [...new Set(urls)];
}

function sameList(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/**
 * `matchByOrder` juftliklarini savollarga yozadi.
 *
 * Avval shu job xaritasidagi HAMMA URL olib tashlanadi, keyin juftlik
 * rasmlari qo'yiladi — shuning uchun ikki marta bosish bir marta bosish bilan
 * teng va oldingi (qo'lda qilingan ham) biriktirish ustiga yoziladi.
 * Xaritada yo'q rasmlar (AI importning o'zi bergan) saqlanadi.
 *
 * Juftliklar soni savollar soniga teng bo'lmasa hech narsa o'zgarmaydi:
 * bo'sh `pairs` (countMismatch) bilan chaqirilsa hamma rasmni o'chirib
 * yuborardi.
 */
export function applyPairs<Q extends AttachableQuestion>(
  questions: readonly Q[],
  entries: readonly MapEntry[],
  pairs: readonly Pair[],
): Q[] {
  if (pairs.length !== questions.length) return [...questions];
  const fromMap = mapUrls(entries);
  return questions.map((question, i) => {
    const images = unique([...question.images.filter((url) => !fromMap.has(url)), ...pairs[i].images]);
    return sameList(images, question.images) ? question : { ...question, images };
  });
}

export function addImage<Q extends AttachableQuestion>(questions: readonly Q[], index: number, url: string): Q[] {
  return questions.map((question, i) =>
    i !== index || question.images.includes(url) ? question : { ...question, images: [...question.images, url] },
  );
}

export function removeImage<Q extends AttachableQuestion>(questions: readonly Q[], index: number, url: string): Q[] {
  return questions.map((question, i) =>
    i !== index || !question.images.includes(url)
      ? question
      : { ...question, images: question.images.filter((u) => u !== url) },
  );
}

/**
 * Hech bir savolda turmagan xarita rasmlari, hujjat tartibida.
 *
 * Holat sifatida saqlanmaydi, har safar hisoblanadi: savoldan olib tashlangan
 * rasm shu bilan o'z-o'zidan tasmaga qaytadi va hech qayerda yo'qolib qolmaydi.
 */
export function unattached(entries: readonly MapEntry[], questions: readonly AttachableQuestion[]): string[] {
  const used = new Set(questions.flatMap((q) => q.images));
  return unique(entries.flatMap((e) => e.images)).filter((url) => !used.has(url));
}

/** `score === null` "tekshirildi" deb ko'rsatilmasin — sonlar bo'lmasa hech narsa tekshirilmagan. */
export function pairStatus(pair: Pair): PairStatus {
  if (pair.score === null) return 'unchecked';
  return pair.flagged ? 'flagged' : 'verified';
}

export interface AttachSummary {
  /** Shubhali juftliklar — rasmsiz savoldagisi ham: u tartib siljiganini bildiradi. */
  flagged: number;
  /**
   * Tekshirib bo'lmagan, lekin rasmi BOR juftliklar. Rasmsiz savolni ko'z
   * bilan tekshirishga hojat yo'q — ularni sanash ustozga keraksiz ish berardi.
   */
  unchecked: number;
}

export function summarize(pairs: readonly Pair[]): AttachSummary {
  let flagged = 0;
  let unchecked = 0;
  for (const pair of pairs) {
    const status = pairStatus(pair);
    if (status === 'flagged') flagged++;
    else if (status === 'unchecked' && pair.images.length > 0) unchecked++;
  }
  return { flagged, unchecked };
}
