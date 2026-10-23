import { afterAll, describe, expect, it } from 'vitest';
import { PrismaClient, type Prisma } from '@prisma/client';

// Faqat CI ning vaqtinchalik bazasi: ishlab chiquvchi yoki prod bazaga ulanilmaydi.
const url = process.env.INTEGRATION_DATABASE_URL;
const enabled = process.env.CI === 'true' && !!url && /^postgresql:\/\/[^@]+@localhost:5432\/eduprime_ci(?:\?|$)/.test(url);
const prisma = enabled ? new PrismaClient({ datasources: { db: { url } } }) : null;
afterAll(async () => { await prisma?.$disconnect(); });

async function fixtures(tx: Prisma.TransactionClient) {
  const user = await tx.user.create({ data: {} });
  const category = await tx.testCategory.create({ data: { nameUz: 'CI', nameRu: 'CI', nameEn: 'CI', type: 'ATTESTATION' } });
  const subject = await tx.subject.create({ data: { nameUz: 'CI', nameRu: 'CI', nameEn: 'CI', categoryId: category.id } });
  return { userId: user.id, categoryId: category.id, subjectId: subject.id };
}

describe.skipIf(!enabled)('UserPermission unique indekslari — CI Postgres', () => {
  it('NULL fan takrorini DB o‘zi rad etadi', async () => {
    await expect(prisma!.$transaction(async (tx) => {
      const ids = await fixtures(tx);
      const data = { userId: ids.userId, categoryId: ids.categoryId, subjectId: null };
      await tx.userPermission.create({ data });
      await tx.userPermission.create({ data });
    })).rejects.toMatchObject({ code: 'P2002' });
  });
  it('bir xil fan takrorini DB rad etadi', async () => {
    await expect(prisma!.$transaction(async (tx) => {
      const data = await fixtures(tx);
      await tx.userPermission.create({ data });
      await tx.userPermission.create({ data });
    })).rejects.toMatchObject({ code: 'P2002' });
  });
  it('butun kategoriya va ikki alohida fan yonma-yon saqlanadi', async () => {
    const rollback = new Error('CI_ROLLBACK');
    await expect(prisma!.$transaction(async (tx) => {
      const ids = await fixtures(tx);
      const second = await tx.subject.create({ data: { nameUz: 'CI2', nameRu: 'CI2', nameEn: 'CI2', categoryId: ids.categoryId } });
      await tx.userPermission.create({ data: { ...ids, subjectId: null } });
      await tx.userPermission.create({ data: ids });
      await tx.userPermission.create({ data: { ...ids, subjectId: second.id } });
      expect(await tx.userPermission.count({ where: { userId: ids.userId } })).toBe(3);
      throw rollback;
    })).rejects.toBe(rollback);
  });
});
