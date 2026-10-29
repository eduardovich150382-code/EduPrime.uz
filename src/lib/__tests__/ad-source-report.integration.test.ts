import { afterAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { adSourceReportSql, type AdSourceRow } from '../ad-source-report';

// Faqat CI ning vaqtinchalik bazasi: ishlab chiquvchi yoki prod bazaga ulanilmaydi.
const url = process.env.INTEGRATION_DATABASE_URL;
const enabled = process.env.CI === 'true' && !!url && /^postgresql:\/\/[^@]+@localhost:5432\/eduprime_ci(?:\?|$)/.test(url);
const prisma = enabled ? new PrismaClient({ datasources: { db: { url } } }) : null;
afterAll(async () => { await prisma?.$disconnect(); });

const DAY = 24 * 60 * 60 * 1000;

describe.skipIf(!enabled)('Reklama manbalari hisoboti — CI Postgres', () => {
  it('kohort, saytga kirish, bepul test va to‘lov manba bo‘yicha sanaladi', async () => {
    const rollback = new Error('CI_ROLLBACK');
    const now = Date.now();
    await expect(prisma!.$transaction(async (tx) => {
      const category = await tx.testCategory.create({ data: { nameUz: 'CI', nameRu: 'CI', nameEn: 'CI', type: 'ATTESTATION' } });
      const subject = await tx.subject.create({ data: { nameUz: 'CI', nameRu: 'CI', nameEn: 'CI', categoryId: category.id } });
      const adTest = await tx.test.create({ data: { titleUz: 'Mock', subjectId: subject.id, categoryId: category.id, duration: 60, questionCount: 1 } });

      // A: ad_ci, kirdi, testni boshladi va ikki marta tugatdi, ikki marta to'ladi.
      const started = new Date(now - 2 * DAY);
      await tx.botStart.create({ data: { telegramId: BigInt(9001), source: 'ad_ci', isFirst: true, createdAt: started } });
      await tx.botStart.create({ data: { telegramId: BigInt(9001), source: 'organic', isFirst: false, createdAt: new Date(now - DAY) } });
      const a = await tx.user.create({ data: { telegramId: '9001', firstSource: 'ad_ci', adTestStartedAt: new Date(now - DAY) } });
      for (let i = 0; i < 2; i++) {
        await tx.testResult.create({ data: { userId: a.id, testId: adTest.id, score: 1, maxScore: 2, percentage: 50, answers: [], timeSpent: 1 } });
        await tx.payment.create({ data: { userId: a.id, plan: 'PREMIUM', duration: 'ONE_MONTH', amount: 1, status: 'CONFIRMED' } });
      }
      // B: ad_ci, botda qoldi (User yo'q).
      await tx.botStart.create({ data: { telegramId: BigInt(9002), source: 'ad_ci', isFirst: true, createdAt: started } });
      // C: oynadan tashqari birinchi /start — sanalmaydi.
      await tx.botStart.create({ data: { telegramId: BigInt(9003), source: 'ad_ci', isFirst: true, createdAt: new Date(now - 40 * DAY) } });
      // D: saytdan (BotStart yo'q) — 'web' qatori, to'lov kutilmoqda.
      const d = await tx.user.create({ data: { firstSource: 'web' } });
      await tx.payment.create({ data: { userId: d.id, plan: 'PREMIUM', duration: 'ONE_MONTH', amount: 1, status: 'PENDING' } });

      const rows = await tx.$queryRaw<AdSourceRow[]>(adSourceReportSql(new Date(now - 7 * DAY), adTest.id));
      const bySource = new Map(rows.map((r) => [r.source, r]));
      expect(bySource.get('ad_ci')).toEqual({ source: 'ad_ci', firstStarts: 2, signedIn: 1, adTestStarted: 1, adTestFinished: 1, paid: 1 });
      expect(bySource.get('web')).toEqual({ source: 'web', firstStarts: 0, signedIn: 1, adTestStarted: 0, adTestFinished: 0, paid: 0 });
      expect(bySource.has('organic')).toBe(false);
      throw rollback;
    })).rejects.toBe(rollback);
  });
});
