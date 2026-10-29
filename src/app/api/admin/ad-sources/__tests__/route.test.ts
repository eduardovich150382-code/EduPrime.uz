import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

const m = vi.hoisted(() => ({ requireAdmin: vi.fn(), load: vi.fn() }));
vi.mock('@/lib/api-auth', () => ({ requireAdmin: m.requireAdmin }));
vi.mock('@/lib/ad-source-report', () => ({ loadAdSourceReport: m.load }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));
import { GET } from '../route';

beforeEach(() => { vi.clearAllMocks(); });

describe('GET /api/admin/ad-sources', () => {
  it('admin bo‘lmasa hisobot yuklanmaydi', async () => {
    m.requireAdmin.mockResolvedValue({ error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) });
    const res = await GET();
    expect(res.status).toBe(403);
    expect(m.load).not.toHaveBeenCalled();
  });
  it('admin — hisobot qaytadi', async () => {
    const report = { adTest: null, windows: { 7: [{ source: 'web', firstStarts: 0, signedIn: 1, adTestStarted: 0, adTestFinished: 0, paid: 0 }], 30: [] } };
    m.requireAdmin.mockResolvedValue({ error: null });
    m.load.mockResolvedValue(report);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(report);
  });
});
