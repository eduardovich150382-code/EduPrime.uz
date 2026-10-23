import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
const m = vi.hoisted(() => ({ auth: vi.fn(), users: vi.fn(), user: vi.fn(), category: vi.fn(), categories: vi.fn(), subject: vi.fn(), permissions: vi.fn(), create: vi.fn(), update: vi.fn(), upsert: vi.fn(), find: vi.fn() }));
vi.mock('@/lib/api-auth', () => ({ requireAdmin: m.auth }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));
vi.mock('@/lib/db', () => ({ db: {
  user: { findUnique: m.user, findMany: m.users }, testCategory: { findUnique: m.category, findMany: m.categories }, subject: { findUnique: m.subject },
  userPermission: { findMany: m.permissions, create: m.create, update: m.update, upsert: m.upsert, findFirst: m.find },
} }));
import { GET, POST, DELETE } from '../route';
const body = { userId: 'u1', categoryId: 'att', subjectId: 'physics', expiresAt: '2027-01-10' };
const request = (value: unknown, method = 'POST') => new NextRequest('http://localhost/api/admin/permissions', { method, body: JSON.stringify(value) });

beforeEach(() => {
  vi.resetAllMocks(); vi.useRealTimers();
  m.auth.mockResolvedValue({ user: { id: 'admin' }, error: null });
  m.user.mockResolvedValue({ id: 'u1' }); m.category.mockResolvedValue({ id: 'att' }); m.subject.mockResolvedValue({ categoryId: 'att' });
  m.create.mockResolvedValue({ id: 'p1' }); m.update.mockResolvedValue({ id: 'p1' }); m.upsert.mockResolvedValue({ id: 'p1' });
  m.categories.mockResolvedValue([]); m.permissions.mockResolvedValue([]); m.users.mockResolvedValue([]);
});

describe('admin permissions', () => {
  it.each([401, 403])('barcha metodlar %i holatida yozmaydi', async (status) => {
    m.auth.mockResolvedValue({ error: NextResponse.json({}, { status }) });
    expect((await GET(new NextRequest('http://localhost'))).status).toBe(status);
    expect((await POST(request(body))).status).toBe(status);
    expect((await DELETE(request({ id: 'p1' }, 'DELETE'))).status).toBe(status);
    expect(m.create).not.toHaveBeenCalled(); expect(m.upsert).not.toHaveBeenCalled(); expect(m.update).not.toHaveBeenCalled();
  });
  it('fanli ruxsat yangi compound unique bilan beriladi', async () => {
    expect((await POST(request(body))).status).toBe(200);
    expect(m.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId_categoryId_subjectId: { userId: 'u1', categoryId: 'att', subjectId: 'physics' } },
      update: { expiresAt: new Date('2027-01-10T18:59:59.999Z'), isActive: true, grantedBy: 'admin' },
    }));
  });
  it('boshqa kategoriyadagi fanga ruxsat yozmaydi', async () => {
    m.subject.mockResolvedValue({ categoryId: 'dtm' });
    expect((await POST(request(body))).status).toBe(400); expect(m.upsert).not.toHaveBeenCalled();
  });
  it('yangi fansiz ruxsatni oldindan tekshirmay yaratadi', async () => {
    expect((await POST(request({ ...body, subjectId: null, expiresAt: null }))).status).toBe(200);
    expect(m.create).toHaveBeenCalledWith({ data: { userId: 'u1', categoryId: 'att', subjectId: null, expiresAt: null, grantedBy: 'admin', isActive: true } });
    expect(m.find).not.toHaveBeenCalled();
  });
  it('P2002 bo‘lsa mavjud fansiz yozuvni yangilaydi, nofaolini ham tiklaydi', async () => {
    m.create.mockRejectedValue({ code: 'P2002' }); m.find.mockResolvedValue({ id: 'existing' });
    expect((await POST(request({ ...body, subjectId: null }))).status).toBe(200);
    expect(m.find).toHaveBeenCalledWith({ where: { userId: 'u1', categoryId: 'att', subjectId: null }, select: { id: true } });
    expect(m.update).toHaveBeenCalledWith({ where: { id: 'existing' }, data: { expiresAt: new Date('2027-01-10T18:59:59.999Z'), isActive: true, grantedBy: 'admin' } });
  });
  it('boshqa DB xatosini unique xatosidek yashirmaydi', async () => {
    m.create.mockRejectedValue({ code: 'P1001' });
    expect((await POST(request({ ...body, subjectId: null }))).status).toBe(500); expect(m.update).not.toHaveBeenCalled();
  });
  it.each([{ ...body, expiresAt: '2027-02-30' }, { ...body, expiresAt: '2020-01-01' }, { ...body, userId: '' }, { ...body, subjectId: [] }])('validatsiyada yozmaydi', async (value) => {
    expect((await POST(request(value))).status).toBe(400); expect(m.upsert).not.toHaveBeenCalled();
  });
  it('bekor qilish faqat tanlangan ruxsatga tegadi', async () => {
    expect((await DELETE(request({ id: 'p1' }, 'DELETE'))).status).toBe(200);
    expect(m.update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { isActive: false } });
  });
  it('ro‘yxat faqat faol va tugamagan ruxsatlarni oladi', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-23T07:00:00Z'));
    expect((await GET(new NextRequest('http://localhost/api/admin/permissions?userId=u1&search=Ali'))).status).toBe(200);
    expect(m.permissions).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'u1', isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }] } }));
    expect(m.users).toHaveBeenCalledWith(expect.objectContaining({ take: 20 }));
  });
  it('haddan uzun qidiruv rad etiladi', async () => expect((await GET(new NextRequest(`http://localhost/?search=${'a'.repeat(101)}`))).status).toBe(400));
});
