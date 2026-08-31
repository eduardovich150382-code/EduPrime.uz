/**
 * `expiresAt`gacha qolgan soniyalar sonini hisoblaydi — hech qachon manfiy
 * qaytarmaydi (muddati allaqachon tugagan bo'lsa 0). Sahifa (masalan tab
 * tashlab yuborilib) qayta yuklanganda `TestTimer` shu qiymatdan boshlanishi
 * kerak — `session.durationMin * 60`dan emas, aks holda taymer noldan
 * qayta boshlanadi, foydalanuvchi ishlashda davom etadi, keyin server
 * `expiresAt` bo'yicha submit'ni 410 bilan rad etadi va butun urinish
 * yo'qoladi.
 */
export function remainingSeconds(expiresAt: Date | string, now: Date = new Date()): number {
  const expiresMs = typeof expiresAt === 'string' ? new Date(expiresAt).getTime() : expiresAt.getTime();
  return Math.max(0, Math.floor((expiresMs - now.getTime()) / 1000));
}
