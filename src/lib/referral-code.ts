import { db } from './db';

// Referal kodi yaratish — sayt (/api/referral) va bot ("Do'stlarni taklif
// qilish") bir xil kod beradi, shuning uchun bitta joyda.

function generateReferralCode(name: string | null): string {
  const slug = (name || 'user')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 8);
  const random = Math.random().toString(36).substring(2, 8);
  return `${slug}-${random}`;
}

export async function generateUniqueReferralCode(name: string | null): Promise<string> {
  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const code = generateReferralCode(name);
    const existing = await db.user.findUnique({
      where: { referralCode: code },
      select: { id: true },
    });
    if (!existing) {
      return code;
    }
  }
  // Fallback: use longer random string to minimize collision chance
  const slug = (name || 'user')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 8);
  const random = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 6);
  return `${slug}-${random}`;
}

/** Foydalanuvchining kodi; yo'q bo'lsa yaratib saqlaydi. */
export async function ensureReferralCode(user: { id: string; name: string | null; referralCode: string | null }): Promise<string> {
  if (user.referralCode) return user.referralCode;
  const referralCode = await generateUniqueReferralCode(user.name);
  await db.user.update({ where: { id: user.id }, data: { referralCode } });
  return referralCode;
}

/**
 * Bot orqali kelgan YANGI foydalanuvchini taklif qilgan odamga bog'laydi.
 * Faqat shu foydalanuvchi hali hech kimga bog'lanmagan bo'lsa; o'zini o'zi
 * taklif qilish hisoblanmaydi. Natija: bog'landimi.
 */
export async function linkReferral(newUserId: string, referralCode: string): Promise<boolean> {
  const referrer = await db.user.findUnique({ where: { referralCode }, select: { id: true } });
  if (!referrer || referrer.id === newUserId) return false;
  const existing = await db.referral.findFirst({ where: { referredUserId: newUserId }, select: { id: true } });
  if (existing) return false;
  await db.referral.create({ data: { referrerId: referrer.id, referredUserId: newUserId } });
  await db.user.update({ where: { id: newUserId }, data: { referredBy: referralCode } });
  return true;
}
