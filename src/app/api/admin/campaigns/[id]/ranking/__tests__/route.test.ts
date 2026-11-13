import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const m = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  campaign: { findUnique: vi.fn() },
  campaignParticipant: { findMany: vi.fn() },
  campaignReferral: { groupBy: vi.fn(), count: vi.fn() },
}));
vi.mock('@/lib/api-auth', () => ({ requireAdmin: m.requireAdmin }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
vi.mock('@/lib/db', () => ({ db: { campaign: m.campaign, campaignParticipant: m.campaignParticipant, campaignReferral: m.campaignReferral } }));
import { GET } from '../route';
import { GET as CSV } from '../../ranking.csv/route';
import { CSV_BOM } from '@/lib/csv';
import { campaignFixture, campaignNow, participantFixture } from '@/lib/campaign/__tests__/fixtures';

const ctx = { params: Promise.resolve({ id: 'cmp1' }) };
const req = (path = 'ranking') => new NextRequest(`http://localhost/api/admin/campaigns/cmp1/${path}`);

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(campaignNow);
  m.requireAdmin.mockResolvedValue({ error: null, user: { id: 'admin1' } });
  m.campaign.findUnique.mockResolvedValue(campaignFixture({ title: 'Noyabr aksiyasi' }));
  m.campaignParticipant.findMany.mockResolvedValue([
    participantFixture({ id: 'a', telegramId: BigInt(111), username: 'ali', firstName: '=Ali', createdAt: new Date('2026-11-15T05:00:00Z') }),
    participantFixture({ id: 'b', telegramId: BigInt(222), username: null, firstName: 'Vali', createdAt: new Date('2026-11-16T05:00:00Z') }),
  ]);
  m.campaignReferral.groupBy.mockImplementation(async (args: { by: string[] }) => (args.by.length === 1
    ? [{ participantId: 'b', _count: { _all: 11 }, _max: { confirmedAt: new Date('2026-11-20T10:00:00Z') } }]
    : [
      { participantId: 'b', status: 'ACTIVE', _count: { _all: 11 } },
      { participantId: 'b', status: 'PENDING', _count: { _all: 2 } },
      { participantId: 'a', status: 'LEFT', _count: { _all: 1 } },
    ]));
  m.campaignReferral.count.mockResolvedValue(4);
});
afterEach(() => { vi.useRealTimers(); });

describe('reyting', () => {
  it('ADMIN emas — 403 (JSON va CSV)', async () => {
    m.requireAdmin.mockResolvedValue({ error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) });
    expect((await GET(req(), ctx)).status).toBe(403);
    expect((await CSV(req('ranking.csv'), ctx)).status).toBe(403);
    expect(m.campaign.findUnique).not.toHaveBeenCalled();
  });

  it('jami raqamlar, o‘rin va hozirgi chegirma; bugun — Toshkent kuni', async () => {
    const body = await (await GET(req(), ctx)).json();
    expect(body.totals).toEqual({ participants: 2, active: 11, pending: 2, left: 1, invalid: 0, today: 4 });
    expect(body.rows.map((r: { telegramId: string; rank: number; percent: number }) => [r.telegramId, r.rank, r.percent]))
      .toEqual([['222', 1, 100], ['111', 2, 0]]);
    expect(body).toMatchObject({ page: 1, totalPages: 1, total: 2, pageSize: 50 });
    // 20-noyabr Toshkent kuni: 19-noyabr 19:00Z dan.
    expect(m.campaignReferral.count.mock.calls[0][0].where.confirmedAt).toEqual({
      gte: new Date('2026-11-19T19:00:00Z'), lt: new Date('2026-11-20T19:00:00Z'),
    });
  });

  it('CSV: BOM, sarlavha, Toshkent vaqti, formula injection yo‘q', async () => {
    const res = await CSV(req('ranking.csv'), ctx);
    expect(res.headers.get('Content-Type')).toBe('text/csv; charset=utf-8');
    expect(res.headers.get('Content-Disposition')).toContain('aksiya_noyabr-aksiyasi_2026-11-20.csv');
    const text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(await res.arrayBuffer());
    expect(text.startsWith(CSV_BOM)).toBe(true);
    const lines = text.slice(1).trim().split('\r\n');
    expect(lines[0]).toBe("o'rin;telegram_id;username;ism;faol;kutilmoqda;chiqqan;yaroqsiz;oxirgi_referal;chegirma_foiz;qo'shilgan_vaqt");
    expect(lines[1]).toBe('1;222;;Vali;11;2;0;0;2026-11-20 15:00;100;2026-11-16 10:00');
    expect(lines[2]).toBe("2;111;ali;'=Ali;0;0;1;0;;0;2026-11-15 10:00");
  });
});
