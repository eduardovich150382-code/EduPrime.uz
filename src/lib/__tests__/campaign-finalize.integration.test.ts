import { afterAll, describe, expect, it, vi } from 'vitest';
import type { Prisma, PrismaClient } from '@prisma/client';

/**
 * Aksiyani yakunlash (A5) — HAQIQIY Postgres'da. Route testlari xotiradagi
 * bazada ishlaydi; ular ikki narsani ko'ra olmaydi:
 *  1. Postgres xatodan keyin interaktiv tranzaksiyani bekor qiladi — P2002
 *     dan keyin qayta urinish tranzaksiya ICHIDA bo'lsa yiqilardi. Shuning
 *     uchun `finalizeCampaign` butun tranzaksiyani qaytadan boshlaydi; bu yerda
 *     haqiqiy unique to'qnashuv bilan tekshiriladi (claim ham rollback bo'lsin).
 *  2. `updateMany` dagi relation filtri (`campaign: { finalizedAt: null }`) —
 *     yakunlangan aksiyada referal holati o'zgarmasligining kafolati.
 *
 * Faqat CI ning vaqtinchalik bazasi (`migration-check` job): ishlab chiquvchi
 * yoki prod bazaga ulanilmaydi; aks holda butunlay o'tkazib yuboriladi.
 */
// `vi.mock` fayl boshiga ko'tariladi — shart ham `vi.hoisted` ichida hisoblanadi.
const s = vi.hoisted(() => {
  const url = process.env.INTEGRATION_DATABASE_URL;
  const enabled = process.env.CI === 'true' && !!url && /^postgresql:\/\/[^@]+@localhost:5432\/eduprime_ci(?:\?|$)/.test(url);
  return { url, enabled, client: null as PrismaClient | null, collideOnce: null as string | null };
});

// lib/campaign `@/lib/db` singleton'ini ishlatadi — u faqat shu CI bazasiga ulansin.
vi.mock('@/lib/db', async () => {
  const { PrismaClient: Client } = await import('@prisma/client');
  s.client = s.enabled ? new Client({ datasources: { db: { url: s.url } } }) : null;
  return { db: s.client ?? {} };
});
vi.mock('next/cache', () => ({ unstable_cache: <T>(fn: T) => fn, revalidateTag: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
// Birinchi partiya ataylab mavjud kod bilan to'qnashadi (haqiqiy P2002), keyingisi — haqiqiy generator.
vi.mock('@/lib/campaign/promo-code', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/campaign/promo-code')>();
  return {
    ...real,
    generatePromoCodes: (count: number) => {
      const codes = real.generatePromoCodes(count);
      if (s.collideOnce && count > 0) {
        codes[0] = s.collideOnce;
        s.collideOnce = null;
      }
      return codes;
    },
  };
});

import { finalizeCampaign } from '@/lib/campaign/finalize';
import { campaignFixture } from '@/lib/campaign/__tests__/fixtures';

const created: string[] = [];
afterAll(async () => {
  if (s.client) {
    await s.client.promoCode.deleteMany({ where: { OR: [{ code: { startsWith: 'CIZ' } }, { campaignId: { in: created } }] } });
    await s.client.campaign.deleteMany({ where: { id: { in: created } } });
    await s.client.$disconnect();
  }
});

async function seed(id: string, finalizedAt: Date | null = null) {
  const db = s.client as PrismaClient;
  const c = campaignFixture({ finalizedAt });
  await db.campaign.create({
    data: {
      id, title: c.title, channelUsername: c.channelUsername, channelLink: c.channelLink, startsAt: c.startsAt, endsAt: c.endsAt,
      isPublished: true, rewardTiers: c.rewardTiers as Prisma.InputJsonValue, baseRewardMin: c.baseRewardMin, baseRewardPct: c.baseRewardPct,
      promoValidDays: c.promoValidDays, finalizedAt,
    },
  });
  created.push(id);
  const participant = await db.campaignParticipant.create({ data: { campaignId: id, telegramId: BigInt(9_000_000 + created.length), firstName: 'CI', refCode: `CI${id}`.slice(0, 16) } });
  for (let i = 0; i < 6; i++) {
    await db.campaignReferral.create({
      data: {
        campaignId: id, participantId: participant.id, referredTelegramId: BigInt(8_000_000 + created.length * 100 + i),
        status: 'ACTIVE', confirmedAt: new Date('2026-11-20T10:00:00Z'), checkedAt: new Date('2026-11-27T00:00:00Z'),
      },
    });
  }
  return participant;
}

describe.skipIf(!s.enabled)('Aksiyani yakunlash — CI Postgres', () => {
  const now = new Date('2026-11-27T10:00:00Z');

  it('promokod to‘qnashuvi (P2002) — butun tranzaksiya qaytadan, aksiya bir marta yakunlanadi', async () => {
    const db = s.client as PrismaClient;
    // Boshqa aksiyaning mavjud kodi: birinchi partiya aynan shu kod bilan to'qnashadi.
    await db.promoCode.create({ data: { code: 'CIZ22222', telegramId: BigInt(1), percent: 10, validUntil: now } });
    s.collideOnce = 'CIZ22222';
    await seed('ci-finalize-a');
    const campaign = await db.campaign.findUniqueOrThrow({ where: { id: 'ci-finalize-a' } });

    expect(await finalizeCampaign(campaign, now)).toEqual({ ok: true, promoCount: 1, noPrizeCount: 0 });
    expect(s.collideOnce).toBeNull(); // to'qnashuv haqiqatan bo'lgan
    const promos = await db.promoCode.findMany({ where: { campaignId: 'ci-finalize-a' } });
    expect(promos).toHaveLength(1);
    expect(promos[0]).toMatchObject({ percent: 20 });
    expect(promos[0].code).not.toBe('CIZ22222');
    expect((await db.campaign.findUniqueOrThrow({ where: { id: 'ci-finalize-a' } })).finalizedAt).toEqual(now);

    // Ikkinchi chaqiruv — claim sharti to'xtatadi, kod takrorlanmaydi.
    expect(await finalizeCampaign(campaign, now)).toMatchObject({ ok: false, status: 409 });
    expect(await db.promoCode.count({ where: { campaignId: 'ci-finalize-a' } })).toBe(1);
  });

  it('relation filtrli updateMany: yakunlangan aksiyada referal o‘zgarmaydi', async () => {
    const db = s.client as PrismaClient;
    await seed('ci-finalize-open');
    await seed('ci-finalize-done', now);
    const where = (campaignId: string) => ({ campaignId, status: 'ACTIVE' as const, campaign: { finalizedAt: null } });
    expect((await db.campaignReferral.updateMany({ where: where('ci-finalize-open'), data: { status: 'INVALID' } })).count).toBe(6);
    expect((await db.campaignReferral.updateMany({ where: where('ci-finalize-done'), data: { status: 'INVALID' } })).count).toBe(0);
    expect(await db.campaignReferral.count({ where: { campaignId: 'ci-finalize-done', status: 'ACTIVE' } })).toBe(6);
  });
});
