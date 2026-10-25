import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
const { authMock, teacherMock, deleteMock } = vi.hoisted(() => ({ authMock: vi.fn(), teacherMock: vi.fn(), deleteMock: vi.fn() }));
vi.mock('@/lib/api-auth', () => ({ requireTeacher: authMock }));
vi.mock('@/lib/db', () => ({ db: { teacher: { findUnique: teacherMock }, bankQuestion: { deleteMany: deleteMock } } }));
import { DELETE } from './route';
const request = (ids: unknown) => new NextRequest('http://localhost/api/teacher/question-bank/delete-selected', {
  method: 'DELETE', body: JSON.stringify({ ids }), headers: { 'content-type': 'application/json' },
});
beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ user: { id: 'user-1' }, error: null });
  teacherMock.mockResolvedValue({ id: 'teacher-1' });
  deleteMock.mockResolvedValue({ count: 2 });
});
describe('tanlangan savollarni o\'chirish', () => {
  it('faqat shu ustozning aniq ID larini o\'chiradi', async () => {
    const response = await DELETE(request(['a', 'b', 'a']));
    expect(response.status).toBe(200);
    expect(deleteMock).toHaveBeenCalledWith({ where: { teacherId: 'teacher-1', id: { in: ['a', 'b'] } } });
    await expect(response.json()).resolves.toEqual({ count: 2 });
  });
  it.each([[], null, 'all', [''], [7], Array.from({ length: 201 }, (_, i) => String(i))])('noto\'g\'ri yoki bo\'sh tanlovni rad etadi: %j', async (ids) => {
    expect((await DELETE(request(ids))).status).toBe(400);
    expect(deleteMock).not.toHaveBeenCalled();
  });
  it('auth rad etsa bazaga tegmaydi', async () => {
    authMock.mockResolvedValue({ error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) });
    expect((await DELETE(request(['a']))).status).toBe(403);
    expect(deleteMock).not.toHaveBeenCalled();
  });
  it('ustoz profili bo\'lmasa o\'chirmaydi', async () => {
    teacherMock.mockResolvedValue(null);
    expect((await DELETE(request(['a']))).status).toBe(403);
    expect(deleteMock).not.toHaveBeenCalled();
  });
});
