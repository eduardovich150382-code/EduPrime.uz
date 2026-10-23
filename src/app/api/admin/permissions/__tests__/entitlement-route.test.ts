import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

interface Permission { id: string; userId: string; categoryId: string; subjectId: string | null; isActive: boolean; expiresAt: Date | null }
const m = vi.hoisted(() => ({ permissions: [] as Permission[], questions: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));
vi.mock('@/lib/api-auth', () => ({ requireAdmin: async () => ({ user: { id: 'admin' }, error: null }) }));
vi.mock('@/lib/auth', () => ({ auth: async () => ({ user: { id: 'student', role: 'USER' } }) }));
vi.mock('@/lib/db', () => ({ db: {
  user: { findUnique: async () => ({ id: 'student', role: 'USER' }) },
  testCategory: { findUnique: async () => ({ id: 'att', type: 'ATTESTATION' }), findMany: async () => [{ id: 'att', type: 'ATTESTATION' }] },
  subject: { findUnique: async () => ({ categoryId: 'att' }) },
  subscription: { findMany: async () => [] },
  userPermission: {
    upsert: async ({ create }: { create: Omit<Permission, 'id'> }) => { const row = { id: 'p1', ...create }; m.permissions.push(row); return row; },
    findMany: async () => m.permissions,
    update: async ({ where, data }: { where: { id: string }; data: { isActive: boolean } }) => {
      const row = m.permissions.find((p) => p.id === where.id)!; Object.assign(row, data); return row;
    },
  },
  test: { findUnique: async ({ where }: { where: { id: string } }) => ({
    id: where.id, categoryId: 'att', subjectId: where.id, isPublished: true, isFree: false, accessType: 'subscription', teacher: null, userId: null,
  }) },
  question: { findMany: m.questions },
} }));

import { POST, DELETE } from '../route';
import { GET } from '@/app/api/tests/[id]/route';
beforeEach(() => { m.permissions = []; m.questions.mockReset().mockResolvedValue([]); });
const getTest = (id: string) => GET(new NextRequest(`http://localhost/api/tests/${id}`), { params: Promise.resolve({ id }) });

describe('admin ruxsatidan test kontentigacha — haqiqiy route va access yadrosi', () => {
  it('fizika ruxsati fizikani ochadi, matematikani ochmaydi; bekor qilish kirishni yopadi', async () => {
    const grant = await POST(new NextRequest('http://localhost/api/admin/permissions', { method: 'POST', body: JSON.stringify({ userId: 'student', categoryId: 'att', subjectId: 'physics', expiresAt: null }) }));
    expect(grant.status).toBe(200);
    expect((await getTest('physics')).status).toBe(200);
    m.questions.mockClear();
    const denied = await getTest('math');
    expect(denied.status).toBe(403);
    expect(m.questions).not.toHaveBeenCalled();
    expect(await denied.json()).not.toHaveProperty('test');
    await DELETE(new NextRequest('http://localhost/api/admin/permissions', { method: 'DELETE', body: JSON.stringify({ id: 'p1' }) }));
    expect((await getTest('physics')).status).toBe(403);
  });
});
