// Aksiya bosqichi — saqlanmaydi, har so'rovda joriy vaqtdan hisoblanadi.
// Shunda keshdagi yozuv (lib/campaign/store.ts) boshlanish/tugash vaqtini
// "o'tkazib yubormaydi": sana o'tsa, keyingi so'rovning o'zi yangi bosqichni ko'radi.

export type CampaignPhase = 'DRAFT' | 'PAUSED' | 'UPCOMING' | 'ACTIVE' | 'FINISHING' | 'FINISHED';

export type PhaseInput = {
  isPublished: boolean;
  isPaused: boolean;
  startsAt: Date;
  endsAt: Date;
  finalizedAt: Date | null;
};

export function campaignPhase(c: PhaseInput, now: Date): CampaignPhase {
  // Qoralama birinchi: prod'dagi sinov aksiyasi hech qachon ommaga "faol" ko'rinmasin.
  if (!c.isPublished) return 'DRAFT';
  if (c.finalizedAt) return 'FINISHED';
  if (c.isPaused) return 'PAUSED';
  if (now < c.startsAt) return 'UPCOMING';
  if (now < c.endsAt) return 'ACTIVE';
  // Muddat tugagan, lekin yakuniy tekshiruv (A5) hali bajarilmagan.
  return 'FINISHING';
}

/**
 * Qoralamada faqat admin qatnashadi — shunda prod'da real foydalanuvchilarga
 * ko'rinmasdan sinab bo'ladi. Referal ham shu qoida bilan: `isAdmin` — taklif
 * qilgan ishtirokchi admin ekani (uning havolasi hamma uchun ishlaydi).
 */
export function canJoin(phase: CampaignPhase, isAdmin: boolean): boolean {
  if (phase === 'ACTIVE') return true;
  return phase === 'DRAFT' && isAdmin;
}

// Cron kuniga bir marta ~20:00 da ishlaydi. 24 soatlik oynada aksiya 23:59 da
// tugasa eslatma tugashga atigi ~4 soat qolganda kelardi — odamlarga harakat
// qilishga vaqt qolmasdi. 36 soat: eslatma tugashdan oldingi kechada keladi.
export const LAST_DAY_WINDOW_MS = 36 * 60 * 60 * 1000;

/** `last_day` xabari va LAST_DAY kanal posti vaqti: tugashga ≤ 36 soat qolgan. */
export function isLastDayWindow(c: Pick<PhaseInput, 'endsAt'>, now: Date): boolean {
  return c.endsAt.getTime() - now.getTime() <= LAST_DAY_WINDOW_MS;
}
