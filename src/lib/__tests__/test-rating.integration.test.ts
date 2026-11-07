import { afterAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { testRatingSql, type RatingRow } from '../test-rating';
import { participantsOrderSql, testStatsSql, type TestStatsRow } from '../admin-tests';

// Faqat CI ning vaqtinchalik bazasi: ishlab chiquvchi yoki prod bazaga ulanilmaydi.
const url = process.env.INTEGRATION_DATABASE_URL;
const enabled = process.env.CI === 'true' && !!url && /^postgresql:\/\/[^@]+@localhost:5432\/eduprime_ci(?:\?|$)/.test(url);
const prisma = enabled ? new PrismaClient({ datasources: { db: { url } } }) : null;
afterAll(async () => { await prisma?.$disconnect(); });

const at = (minute: number) => new Date(Date.UTC(2026, 10, 1, 10, minute));

describe.skipIf(!enabled)('Test reytingi SQL — CI Postgres', () => {
  it('best/first tanlovi, teng ballda vaqt va sana, adminlar va boshqa test chiqariladi, sahifalashda o‘rin', async () => {
    const rollback = new Error('CI_ROLLBACK');
    await expect(prisma!.$transaction(async (tx) => {
      const category = await tx.testCategory.create({ data: { nameUz: 'CI', nameRu: 'CI', nameEn: 'CI', type: 'ATTESTATION' } });
      const subject = await tx.subject.create({ data: { nameUz: 'CI', nameRu: 'CI', nameEn: 'CI', categoryId: category.id } });
      const mk = (titleUz: string) => tx.test.create({ data: { titleUz, subjectId: subject.id, categoryId: category.id, duration: 60, questionCount: 30 } });
      const test = await mk('CI-Rating asosiy');
      const other = await mk('CI-Rating boshqa');
      const [a, b, c, admin] = await Promise.all([
        tx.user.create({ data: { name: 'A' } }),
        tx.user.create({ data: { name: 'B' } }),
        tx.user.create({ data: { name: 'C' } }),
        tx.user.create({ data: { name: 'Admin', role: 'ADMIN' } }),
      ]);
      const result = (userId: string, testId: string, score: number, timeSpent: number, minute: number) => tx.testResult.create({
        data: { userId, testId, score, maxScore: 30, percentage: (score / 30) * 100, answers: [], timeSpent, completedAt: at(minute) },
      });
      // A: 3 urinish — birinchisi 20, eng yaxshisi 25 ball / 600 s (5-daqiqa).
      await result(a.id, test.id, 20, 500, 1);
      await result(a.id, test.id, 25, 700, 3);
      await result(a.id, test.id, 25, 600, 5);
      // B: 25 ball / 600 s, A'dan oldin (2-daqiqa) — teng ball va vaqtda B yuqorida.
      await result(b.id, test.id, 25, 600, 2);
      // C: 10 ball.
      await result(c.id, test.id, 10, 100, 0);
      // Admin eng yuqori ball — reytingga kirmaydi.
      await result(admin.id, test.id, 30, 10, 0);
      // Boshqa test — kirmaydi.
      await result(c.id, other.id, 30, 10, 0);

      const best = await tx.$queryRaw<RatingRow[]>(testRatingSql({ testId: test.id, mode: 'best', limit: null, offset: 0 }));
      expect(best.map((r) => [r.rank, r.name, r.score, r.timeSpent, r.attemptsCount])).toEqual([
        [1, 'B', 25, 600, 1],
        [2, 'A', 25, 600, 3],
        [3, 'C', 10, 100, 1],
      ]);
      expect(best[0]).toMatchObject({ participants: 3, attemptsTotal: 5, maxPercentage: 25 / 30 * 100 });
      expect(best[0].avgPercentage).toBeCloseTo(((25 + 25 + 10) / 3 / 30) * 100, 6);

      const first = await tx.$queryRaw<RatingRow[]>(testRatingSql({ testId: test.id, mode: 'first', limit: null, offset: 0 }));
      expect(first.map((r) => [r.rank, r.name, r.score])).toEqual([[1, 'B', 25], [2, 'A', 20], [3, 'C', 10]]);

      // 2-sahifa (limit 2): o'rin 3 dan, umumiy ko'rsatkichlar butun to'plam bo'yicha.
      const page2 = await tx.$queryRaw<RatingRow[]>(testRatingSql({ testId: test.id, mode: 'best', limit: 2, offset: 2 }));
      expect(page2.map((r) => [r.rank, r.name])).toEqual([[3, 'C']]);
      expect(page2[0]).toMatchObject({ participants: 3, attemptsTotal: 5 });

      // Testlar ro'yxati: ishlaganlar adminlarsiz, o'rtacha hamma natija bo'yicha.
      const stats = await tx.$queryRaw<TestStatsRow[]>(testStatsSql([test.id, other.id]));
      const byId = new Map(stats.map((s) => [s.testId, s]));
      expect(byId.get(test.id)?.participants).toBe(3);
      expect(byId.get(test.id)?.avgScore).toBeCloseTo(((20 + 25 + 25 + 25 + 10 + 30) / 6 / 30) * 100, 6);
      expect(byId.get(other.id)?.participants).toBe(1);

      const ordered = await tx.$queryRaw<{ id: string }[]>(participantsOrderSql({ search: 'ci-rating', published: null, limit: 10, offset: 0 }));
      expect(ordered.map((r) => r.id)).toEqual([test.id, other.id]);
      const none = await tx.$queryRaw<{ id: string }[]>(participantsOrderSql({ search: 'CI%Rating', published: null, limit: 10, offset: 0 }));
      expect(none).toEqual([]);
      throw rollback;
    })).rejects.toBe(rollback);
  });
});
