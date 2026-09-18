import {
  findDuplicateQuestions,
  normalizeQuestionText,
  type DuplicateGroup,
} from '@/lib/duplicate-questions';

/**
 * Import natijasini qoralamaga qo'shish yoki uni almashtirish.
 *
 * Nega kerak: ikkala sahifa (test yaratish, savollar bazasi) ilgari
 * qoralamani JIMGINA almashtirardi. 72 talik testni ikki bo'lakda qo'ygan
 * ustozning birinchi yarmi ogohlantirishsiz yo'qolardi.
 *
 * Sof: qaror (dialog ko'rsatish, tugmani o'chirish) sahifada, hisob-kitob
 * shu yerda — `node` muhitida test qilinishi uchun.
 */

export type ImportMergeMode = 'append' | 'replace';

/**
 * Qoralama hali ochilgan holidami.
 *
 * Ikkala sahifa ham bitta bo'sh savol bilan ochiladi, shuning uchun uni
 * "ustozning mehnati" deb sanab dialog ko'rsatish bekorga xalaqit berardi.
 * Idioma ilgari `insertFromBank` ichida edi — endi bitta joyda.
 */
export function isPristineDraft(questions: readonly { text: string }[]): boolean {
  return questions.length === 0 || (questions.length === 1 && !questions[0].text);
}

/**
 * `append` da mavjud savollar AYNAN O'SHA obyektlar bo'lib qoladi.
 *
 * Nusxa olinsa (`{...q}`) ham `id` saqlanib qolardi, lekin havola yangi
 * bo'lgani uchun har import qoralamaning butun ro'yxatini qayta yaratardi.
 * Asosiysi esa boshqa: nusxalash yo'lini ochiq qoldirish `id` ni tushirib
 * qoldirish xatosiga eshik ochadi, u esa keyingi saqlashda savollarni
 * o'chirib qayta yaratadi va `TestResult.answers` dagi `questionId`
 * bog'lanishini uzadi (#170/#172).
 *
 * Yangi savollar `id` siz qo'shiladi — server ularga yangi `id` beradi.
 */
export function mergeImported<E extends { text: string }, I extends { text: string }>(
  existing: readonly E[],
  incoming: readonly I[],
  mode: ImportMergeMode,
): (E | I)[] {
  if (mode === 'replace') return [...incoming];
  return [...existing, ...incoming];
}

/**
 * Qo'shilayotgan savollardan nechtasi qoralamada allaqachon bor.
 *
 * Ustoz bir bo'lakni ikki marta qo'yishi mumkin. Dublikatlar AVTOMATIK
 * TASHLANMAYDI: o'xshash savol ataylab yozilgan bo'lishi mumkin, qarorni
 * ustoz qiladi — bu yerda faqat ogohlantirish uchun son.
 *
 * #169 dagi mantiq qayta ishlatiladi: normallashtirish `normalizeQuestionText`
 * dan, guruhlash `findDuplicateQuestions` dan. Ikkinchi normallashtiruvchi
 * yozilsa, ikkisi vaqt o'tib bir-biridan uzoqlashardi.
 */
export function incomingDuplicates(
  existing: readonly { text: string }[],
  incoming: readonly { text: string }[],
): { count: number; groups: DuplicateGroup[] } {
  const groups = findDuplicateQuestions([...existing, ...incoming]).filter(
    (group) =>
      // Faqat IKKALA ro'yxatda ham uchraganlari. Bitta ro'yxat ichidagi
      // takror boshqa masala: uni saqlashdan oldingi `DuplicateQuestionsDialog`
      // tutadi, bu yerda ko'rsatish esa ikkita raqobatdosh ogohlantirish
      // bo'lib chalkashtirardi.
      group.indexes.some((i) => i < existing.length) &&
      group.indexes.some((i) => i >= existing.length),
  );

  const existingKeys = new Set(
    existing.map((q) => normalizeQuestionText(q.text || '')).filter(Boolean),
  );
  const count = incoming.filter((q) =>
    existingKeys.has(normalizeQuestionText(q.text || '')),
  ).length;

  return { count, groups };
}
