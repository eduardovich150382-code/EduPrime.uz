/**
 * Qiyinlikning uch pog'onasi — ustoz ekranidagi yagona ko'rinish.
 *
 * Nega uch pog'ona: 1-5 shkalasida 3 va 4 orasidagi farqni ustozlar izchil
 * ayta olmaydi, natijada qiymat tasodifiy tanlanadi. Baza 1-5 da qoladi
 * (`Question.difficulty Int?`), faqat yuzasi soddalashadi.
 *
 * DIQQAT — `lib/item-picker.ts` dagi `bucketOfDifficulty` bilan ARALASHTIRMANG.
 * U so'ralgan ORALIQQA nisbatan (masalan 3-5 ichida yana 20/60/20) hisoblaydi
 * va tegsiz savolni 'medium' ga suradi. Bu yerdagi `bandOf` esa mutlaq 1-5
 * shkalasida ishlaydi va tegsiz savolga `null` qaytaradi — chunki ustoz
 * tegmagan savolning qiymati o'zgarmasligi kerak.
 */

export type DifficultyBand = 'easy' | 'medium' | 'hard';

/** Pog'ona aniqlanmaganda ekranda ko'rsatiladigan pog'ona (qiymat YOZILMAYDI). */
export const DEFAULT_BAND: DifficultyBand = 'medium';

/**
 * O'qishda bag'rikeng: bazadagi eski 1 va 5 lar ham, AI/JSON dan kelgan
 * diapazondan tashqari qiymat ham eng yaqin pog'onaga tushadi.
 *
 * `null` qaytishi MUHIM: u "qiymat yo'q" degani, "o'rta" degani emas. Chaqiruvchi
 * ko'rsatish uchun `?? DEFAULT_BAND` qiladi, lekin saqlashga hech narsa yozmaydi.
 */
export function bandOf(value: number | null | undefined): DifficultyBand | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  if (value <= 2) return 'easy';
  if (value >= 4) return 'hard';
  return 'medium';
}

/**
 * Yozishda qat'iy: faqat 2/3/4. Chegara qiymatlari (1 va 5) ataylab
 * ishlatilmaydi — 2/3/4 `lib/sessions.ts` dagi tanlash oraliqlariga to'liq
 * tushadi (`easy → 1-2`, `advanced → 3-5`), ya'ni hech bir pog'ona
 * DTM/konstruktor tanlovidan chetda qolmaydi.
 */
export function valueOfBand(band: DifficultyBand): number {
  if (band === 'easy') return 2;
  if (band === 'hard') return 4;
  return 3;
}

/** Yangi savol yaratilganda qo'yiladigan qiymat — ekranda "O'rta" ko'rinadi. */
export const DEFAULT_DIFFICULTY = valueOfBand(DEFAULT_BAND);
