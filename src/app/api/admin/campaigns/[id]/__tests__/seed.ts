import type { Campaign, CampaignReferralStatus } from '@prisma/client';
import { campaignFixture } from '@/lib/campaign/__tests__/fixtures';
import { fake, type Row } from './fake-db';

// A5 route testlari uchun umumiy yozuvlar. Vaqt: aksiya tugagan (`ENDED`).

export const ENDED = new Date('2026-11-27T10:00:00Z');
export const ctx = <T extends Record<string, string> = Record<never, string>>(extra?: T) => ({ params: Promise.resolve({ id: 'cmp1', ...extra } as { id: string } & T) });

export function seedCampaign(overrides: Partial<Campaign> = {}): Campaign {
  fake.reset();
  const campaign = campaignFixture(overrides);
  fake.insert('campaign', campaign as unknown as Row);
  return campaign;
}

let tid = 1000;

export function participant(id: string, firstName: string, overrides: Record<string, unknown> = {}): Row {
  return fake.insert('campaignParticipant', {
    id, campaignId: 'cmp1', telegramId: BigInt(++tid), username: firstName.toLowerCase(), firstName, refCode: `RC${id}`,
    createdAt: new Date('2026-11-15T10:00:00Z'), ...overrides,
  });
}

/** `count` ta bir xil referal: ACTIVE bo'lsa tasdiqlangan va aksiya davomida tekshirilgan. */
export function referrals(participantId: string, status: CampaignReferralStatus, count: number, overrides: Record<string, unknown> = {}): Row[] {
  return Array.from({ length: count }, (_, i) => {
    const id = `${participantId}-${status}-${i}-${++tid}`;
    const confirmed = status === 'PENDING' ? null : new Date(Date.UTC(2026, 10, 18, 10, 0, i));
    return fake.insert('campaignReferral', {
      id, campaignId: 'cmp1', participantId, referredTelegramId: BigInt(++tid), referredUsername: `u${tid}`, referredFirstName: `R${i}`,
      status, createdAt: new Date(Date.UTC(2026, 10, 18, 9, i)), confirmedAt: confirmed, checkedAt: confirmed, ...overrides,
    });
  });
}

export const json = (method: string, body?: unknown) => new Request('http://localhost/api', {
  method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body),
});
