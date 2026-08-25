// Foydalanuvchilar Asia/Tashkent (UTC+5) da, server esa UTC'da ishlaydi.
// `new Date().toISOString().slice(0, 10)` kabi UTC'ga asoslangan kunlik
// hisob-kitoblar soat 00:00–04:59 (UTC+5) oralig'ida — ya'ni mahalliy
// kunning boshida — hali "kechagi kun"ga yozadi. Kunlik kvota/limit kabi
// har qanday hisob shu faylning `tashkentDateKey` funksiyasi orqali
// o'tishi kerak.

const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000; // UTC+5, DTM mintaqasida yozgi vaqt yo'q

/**
 * Berilgan (yoki joriy) vaqtni Asia/Tashkent mahalliy sanasiga aylantirib,
 * `YYYY-MM-DD` shaklida qaytaradi. Kunlik kvota kalitlari shu qiymatdan
 * tuziladi (masalan `ai_explain_quota_${userId}_${tashkentDateKey()}`).
 */
export function tashkentDateKey(d: Date = new Date()): string {
  const shifted = new Date(d.getTime() + TASHKENT_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const day = String(shifted.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * `date`dan `now`gacha (sukut bo'yicha joriy vaqt) o'tgan kunlar soni,
 * kasr qismi bilan. Oylik (30 kunlik) cheklovlarni tekshirish uchun:
 * `daysSince(user.someFreeUsedAt) < 30`.
 */
export function daysSince(date: Date, now: Date = new Date()): number {
  return (now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000);
}
