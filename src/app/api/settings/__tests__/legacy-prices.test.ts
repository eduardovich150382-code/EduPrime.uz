import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const m = vi.hoisted(() => ({ settings: vi.fn(), upsert: vi.fn(), auth: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: { systemSetting: { findMany: m.settings, upsert: m.upsert } } }));
vi.mock('@/lib/auth', () => ({ auth: m.auth }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
import { GET } from '../route';
import { GET as adminGet, PUT } from '@/app/api/admin/settings/route';

beforeEach(() => { vi.clearAllMocks(); m.settings.mockResolvedValue([]); m.auth.mockResolvedValue({ user: { id: 'admin', role: 'ADMIN' } }); m.upsert.mockResolvedValue({}); });
describe('eski obuna narx sozlamalari', () => {
  it('public API eski narxlarni so‘ramaydi va zaxira narx bermaydi', async () => {
    const response = await GET();
    const keys: string[] = m.settings.mock.calls[0][0].where.key.in;
    expect(keys.some((key) => /^(premium|teacher)_price_/.test(key))).toBe(false);
    expect(Object.keys((await response.json()).settings).some((key) => /^(premium|teacher)_price_/.test(key))).toBe(false);
    expect(m.upsert).not.toHaveBeenCalled();
  });
  it('admin API bazadagi eski qatorlarni qaytarmaydi va ularga yozmaydi', async () => {
    m.settings.mockResolvedValue([{ key: 'premium_price_1_month', value: '123' }, { key: 'teacher_price_1_month', value: '456' }]);
    const result = await adminGet();
    expect((await result.json()).settings).not.toHaveProperty('premium_price_1_month');
    await PUT(new NextRequest('http://localhost/api/admin/settings', { method: 'PUT', body: JSON.stringify({ settings: {
      premium_price_1_month: '1', teacher_price_1_month: '2', site_announcement: 'Hello',
    } }) }));
    expect(m.upsert).toHaveBeenCalledOnce();
    expect(m.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { key: 'site_announcement' } }));
  });
});
