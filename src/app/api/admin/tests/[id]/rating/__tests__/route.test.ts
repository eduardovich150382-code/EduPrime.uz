import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const m = vi.hoisted(() => ({ auth: vi.fn(), findUnique: vi.fn(), rows: vi.fn() }));
vi.mock('@/lib/api-auth', () => ({ requireAdmin: m.auth }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));
vi.mock('@/lib/db', () => ({ db: { test: { findUnique: m.findUnique }, $queryRaw: m.rows } }));
import { GET } from '../route';
import { GET as EXPORT } from '../export/route';

const ctx = { params: Promise.resolve({ id: 't1' }) };
const req = (query = '') => new NextRequest(`http://localhost/api/admin/tests/t1/rating${query}`);
const row = (rank: number, over: Record<string, unknown> = {}) => ({
  rank, userId: `u${rank}`, name: `User ${rank}`, telegramUsername: rank === 1 ? 'top' : null, email: null,
  score: 30 - rank, maxScore: 30, percentage: ((30 - rank) / 30) * 100, timeSpent: 600 + rank, completedAt: new Date('2026-11-08T05:00:00Z'),
  attemptsCount: 2, participants: 75, attemptsTotal: 140, avgPercentage: 70.04, maxPercentage: 96.67, ...over,
});

beforeEach(() => {
  vi.resetAllMocks();
  m.auth.mockResolvedValue({ error: null });
  m.findUnique.mockResolvedValue({ id: 't1', titleUz: "O'zbekiston tarixi" });
  m.rows.mockResolvedValue([row(1), row(2)]);
});

describe('GET /api/admin/tests/[id]/rating', () => {
  it('admin bo‘lmasa 403, bazaga murojaat yo‘q', async () => {
    m.auth.mockResolvedValue({ error: NextResponse.json({}, { status: 403 }) });
    expect((await GET(req(), ctx)).status).toBe(403);
    expect(m.rows).not.toHaveBeenCalled();
  });

  it('test topilmasa 404', async () => {
    m.findUnique.mockResolvedValue(null);
    expect((await GET(req(), ctx)).status).toBe(404);
  });

  it('default best, page=1, limit=50; qatorlar va umumiy ko‘rsatkichlar', async () => {
    const data = await (await GET(req(), ctx)).json();
    const sql = m.rows.mock.calls[0][0];
    expect(sql.values).toEqual(['t1', 50, 0]);
    expect(sql.text).toContain('r."score" DESC, r."timeSpent" ASC');
    expect(data.mode).toBe('best');
    expect(data.test).toEqual({ id: 't1', titleUz: "O'zbekiston tarixi" });
    expect(data.summary).toEqual({ participants: 75, attemptsTotal: 140, avgPercentage: 70, maxPercentage: 96.7 });
    expect(data.rows[0]).toEqual({
      rank: 1, user: { id: 'u1', name: 'User 1', telegramUsername: 'top', email: null },
      score: 29, maxScore: 30, percentage: 96.7, timeSpent: 601, completedAt: '2026-11-08T05:00:00.000Z', attemptsCount: 2,
    });
  });

  it('mode=first va page=2: offset 50, o‘rin SQL’dan keladi (51 dan)', async () => {
    m.rows.mockResolvedValue([row(51), row(52)]);
    const data = await (await GET(req('?mode=first&page=2'), ctx)).json();
    const sql = m.rows.mock.calls[0][0];
    expect(sql.values).toEqual(['t1', 50, 50]);
    expect(sql.text).toContain('ORDER BY r."completedAt" ASC, r."id" ASC)');
    expect(data.rows.map((r: { rank: number }) => r.rank)).toEqual([51, 52]);
  });

  it('limit 100 bilan cheklanadi', async () => {
    await GET(req('?limit=5000'), ctx);
    expect(m.rows.mock.calls[0][0].values[1]).toBe(100);
  });
});

describe('GET /api/admin/tests/[id]/rating/export', () => {
  it('403 va 404', async () => {
    m.auth.mockResolvedValue({ error: NextResponse.json({}, { status: 403 }) });
    expect((await EXPORT(req(), ctx)).status).toBe(403);
    m.auth.mockResolvedValue({ error: null });
    m.findUnique.mockResolvedValue(null);
    expect((await EXPORT(req(), ctx)).status).toBe(404);
  });

  it('to‘liq CSV: LIMIT yo‘q, BOM, `;`, ekranlash, fayl nomi', async () => {
    m.rows.mockResolvedValue([row(1, { name: 'Ali; "Vali"\nAkbar', email: '=cmd' }), row(2)]);
    const res = await EXPORT(req('?mode=first'), ctx);
    expect(m.rows.mock.calls[0][0].values).toEqual(['t1']);
    expect(res.headers.get('Content-Type')).toBe('text/csv; charset=utf-8');
    expect(res.headers.get('Content-Disposition')).toMatch(/^attachment; filename="ozbekiston-tarixi_first_\d{4}-\d{2}-\d{2}\.csv"/);
    const body = new TextDecoder('utf-8', { ignoreBOM: true }).decode(await res.arrayBuffer());
    expect(body.charCodeAt(0)).toBe(0xfeff);
    const lines = body.slice(1).split('\r\n');
    expect(lines[0]).toBe("O'rin;Ism;Telegram;Email;Ball;Maks;Foiz;Vaqt (daq:son);Sana (Toshkent);Urinishlar");
    expect(lines[1]).toBe('1;"Ali; ""Vali""\nAkbar";top;\'=cmd;29;30;96,7;10:01;2026-11-08 10:00;2');
    expect(lines[2]).toBe('2;User 2;;;28;30;93,3;10:02;2026-11-08 10:00;2');
  });
});
