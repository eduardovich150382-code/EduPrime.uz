/**
 * Qoralamadagi takroriy savollarni aniqlash.
 *
 * Bir ustoz 31 savol import qilib, saqlagandan keyin testda 62 savol topgan —
 * har biri ikki marta. Dublikat qayerda tug'ilgani aniqlanmadi, shuning uchun
 * bu modul sababni emas, OQIBATNI to'sadi: saqlashdan oldin bir xil matnli
 * savollar borligi ustozga ochiq aytiladi.
 *
 * Bu yerda faqat sof mantiq — chunki "takror" ta'rifi nozik va u UI siz,
 * `node` muhitida test qilinishi kerak.
 */

export interface DuplicateGroup {
  /** Normallashtirilgan matn — guruh kaliti. */
  key: string;
  /** Ro'yxatdagi indekslar, o'sish tartibida. Birinchisi — saqlab qolinadigani. */
  indexes: number[];
}

/**
 * Taqqoslash uchun matnni normallashtiradi.
 *
 * Faqat bo'shliqlar tenglashtiriladi: chetlari kesiladi, ichidagi har qanday
 * bo'shliq ketma-ketligi (probel, tab, yangi qator, `\u00a0`) bitta probelga
 * siqiladi. Bir xil savol import va qo'lda kiritishda aynan shu bilan
 * farq qiladi.
 *
 * Registr ATAYLAB o'zgartirilmaydi: "Nechta?" va "nechta?" — ustoz uchun
 * boshqa-boshqa savol bo'lishi mumkin, soxta ogohlantirish esa himoyaga
 * ishonchni yo'qotadi.
 */
export function normalizeQuestionText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Bir xil matnli savollar guruhlari — faqat ikki va undan ko'p marta
 * uchraganlari, birinchi uchrash tartibida.
 *
 * BO'SH matnli savollar hisobga OLINMAYDI: sahifa bo'sh savol bilan ochiladi
 * va "Savol qo'shish" ham bo'sh savol yaratadi, ya'ni ularni takror deb
 * sanash har qoralamada bekorga ogohlantirishga olib kelardi.
 */
export function findDuplicateQuestions(
  questions: readonly { text: string }[],
): DuplicateGroup[] {
  const byKey = new Map<string, number[]>();

  questions.forEach((question, index) => {
    const key = normalizeQuestionText(question.text || '');
    if (!key) return;
    const found = byKey.get(key);
    if (found) found.push(index);
    else byKey.set(key, [index]);
  });

  const groups: DuplicateGroup[] = [];
  for (const [key, indexes] of byKey) {
    if (indexes.length > 1) groups.push({ key, indexes });
  }
  return groups;
}

/**
 * Har guruhdan BIRINCHI nusxani qoldiradi, qolganini tashlaydi.
 *
 * Nega aynan birinchisi: testni tahrirlash sahifasida ro'yxat bazadan kelgan
 * tartibda turadi va birinchi nusxa — `id` si borlari, ya'ni o'quvchilarning
 * `TestResult.answers` yozuvlari bog'langan qator. Keyingisini tashlash
 * mavjud natijalarni saqlab qoladi.
 *
 * Idempotent: ikki marta qo'llash bir marta qo'llash bilan teng. Takrorlanmagan
 * savollar aynan o'sha obyekt sifatida qaytadi — holat bekorga qayta
 * render qilinmasin.
 */
export function dropDuplicateQuestions<Q extends { text: string }>(
  questions: readonly Q[],
): Q[] {
  const seen = new Set<string>();
  return questions.filter((question) => {
    const key = normalizeQuestionText(question.text || '');
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
