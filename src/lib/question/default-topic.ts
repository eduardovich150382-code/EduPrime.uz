/**
 * "Test mavzusi" maydonining yagona mantig'i.
 *
 * Bitta testdagi savollar deyarli doim bitta mavzuga tegishli, shuning uchun
 * mavzu bir marta yuqorida kiritiladi va YANGI savollarga standart qiymat
 * bo'lib tushadi.
 */

/** Mavzu "bo'sh" deb hisoblanadigan yagona qoida — `Question.topic` sxemada `String?`. */
function isBlank(value: string | null | undefined): boolean {
  return (value ?? '').trim() === '';
}

/**
 * Standart mavzuni faqat mavzusi BO'SH savollarga yozadi.
 *
 * Mavjud qiymat hech qachon ustidan yozilmaydi — na ustoz qo'lda kiritgani, na
 * AI/JSON import aniqlagani.
 *
 * O'zgarmagan savollar AYNAN o'sha obyektlar bo'lib qoladi va hech biri
 * o'zgarmasa massivning o'zi qaytadi. Bu #175 dagi havola ayniyati qoidasi:
 * savol obyekti nusxalanmasa `id` si ham yo'qolmaydi, ya'ni keyingi saqlashda
 * savol o'chirilib qaytadan yaratilmaydi va `TestResult.answers` dagi
 * `questionId` bog'lanishi uzilmaydi (#170/#172).
 */
export function applyDefaultTopic<T extends { topic: string | null }>(
  questions: readonly T[],
  topic: string | null | undefined,
): T[] {
  if (isBlank(topic)) return questions as T[];
  const value = (topic as string).trim();

  let changed = false;
  const next = questions.map((q) => {
    if (!isBlank(q.topic)) return q;
    changed = true;
    return { ...q, topic: value };
  });

  return changed ? next : (questions as T[]);
}
