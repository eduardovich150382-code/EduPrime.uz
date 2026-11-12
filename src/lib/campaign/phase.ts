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
