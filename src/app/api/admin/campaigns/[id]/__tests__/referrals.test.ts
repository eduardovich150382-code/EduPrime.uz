import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// Yaroqsiz referallar: GET ro'yxat, PATCH INVALID/RESTORE, invalidate-all —
// haqiqiy route'lar, baza xotirada (reyting ham haqiqiy loadRanking bilan).
const m = vi.hoisted(() => ({ requireAdmin: vi.fn(), revalidate: vi.fn() }));
vi.mock('@/lib/db', async () => ({ db: (await import('./fake-db')).fake.client }));
vi.mock('@/lib/api-auth', () => ({ requireAdmin: m.requireAdmin }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
vi.mock('next/cache', () => ({ unstable_cache: <T>(fn: T) => fn, revalidateTag: vi.fn() }));
vi.mock('@/lib/cache-tags', async (importOriginal) => ({ ...(await importOriginal<object>()), revalidateCampaigns: m.revalidate }));

import { GET } from '../participants/[pid]/referrals/route';
import { POST as invalidateAll } from '../participants/[pid]/invalidate-all/route';
import { PATCH } from '../referrals/[rid]/route';
import { loadRanking } from '@/lib/campaign/store';
import { fake, type Row } from './fake-db';
import { ENDED, ctx, json, participant, referrals, seedCampaign } from './seed';

const patch = (rid: string, status: string) => PATCH(json('PATCH', { status }) as NextRequest, ctx({ rid }));
const all = () => invalidateAll(new NextRequest('http://localhost/api', { method: 'POST' }), ctx({ pid: 'p1' }));
const ref = (id: string) => fake.tables().campaignReferral.find((r) => r.id === id) as Row;
const score = async () => (await loadRanking('cmp1'))?.ranking.find((r) => r.participantId === 'p1')?.activeCount;

beforeEach(() => {
  vi.clearAllMocks();
  m.requireAdmin.mockResolvedValue({ error: null, user: { id: 'admin1', name: 'Admin' } });
  seedCampaign();
  participant('p1', 'Dilnoza');
});

describe('PATCH /referrals/[rid]', () => {
  it('INVALID dan keyin reytingda hisoblanmaydi; RESTORE (tasdiqlangan) → ACTIVE, checkedAt = null', async () => {
    const [a, b] = referrals('p1', 'ACTIVE', 2);
    expect(await score()).toBe(2);
    const res = await patch(a.id, 'INVALID');
    expect(await res.json()).toEqual({ ok: true, status: 'INVALID' });
    expect(await score()).toBe(1);
    expect(m.revalidate).toHaveBeenCalled();
    expect(await (await patch(a.id, 'RESTORE')).json()).toEqual({ ok: true, status: 'ACTIVE' });
    expect(ref(a.id)).toMatchObject({ status: 'ACTIVE', checkedAt: null });
    expect(await score()).toBe(2);
    expect(ref(b.id).status).toBe('ACTIVE');
  });

  it('tasdiqlanmagan (confirmedAt yo‘q) referal tiklansa → PENDING, ball bermaydi', async () => {
    const [p] = referrals('p1', 'PENDING', 1);
    await patch(p.id, 'INVALID');
    expect(await (await patch(p.id, 'RESTORE')).json()).toEqual({ ok: true, status: 'PENDING' });
    expect(ref(p.id)).toMatchObject({ status: 'PENDING', checkedAt: null });
    expect(await score()).toBe(0);
  });

  it('RESTORE faqat INVALID dan → aks holda 409', async () => {
    const [a] = referrals('p1', 'ACTIVE', 1);
    expect((await patch(a.id, 'RESTORE')).status).toBe(409);
  });

  it('aksiya davomida ham mumkin; yakunlangan aksiyada → 409', async () => {
    const [a] = referrals('p1', 'ACTIVE', 1);
    seedCampaign({ finalizedAt: ENDED });
    participant('p1', 'Dilnoza');
    fake.insert('campaignReferral', { ...a });
    const res = await patch(a.id, 'INVALID');
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('Aksiya yakunlangan');
    expect(ref(a.id).status).toBe('ACTIVE');
  });

  it('noto‘g‘ri holat → 400; topilmadi → 404; ADMIN emas → 403', async () => {
    const [a] = referrals('p1', 'ACTIVE', 1);
    expect((await patch(a.id, 'ACTIVE')).status).toBe(400);
    expect((await patch('nope', 'INVALID')).status).toBe(404);
    m.requireAdmin.mockResolvedValue({ error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) });
    expect((await patch(a.id, 'INVALID')).status).toBe(403);
    expect((await all()).status).toBe(403);
    expect((await GET(new NextRequest('http://localhost/api'), ctx({ pid: 'p1' }))).status).toBe(403);
  });
});

describe('POST /participants/[pid]/invalidate-all', () => {
  it('barcha referallar INVALID, boshqa ishtirokchiga tegmaydi', async () => {
    participant('p2', 'Jasur');
    referrals('p1', 'ACTIVE', 3);
    referrals('p1', 'PENDING', 1);
    const [other] = referrals('p2', 'ACTIVE', 1);
    expect(await (await all()).json()).toEqual({ ok: true, count: 4 });
    expect(fake.tables().campaignReferral.filter((r) => r.participantId === 'p1').every((r) => r.status === 'INVALID')).toBe(true);
    expect(ref(other.id).status).toBe('ACTIVE');
    expect(await score()).toBe(0);
    expect(m.revalidate).toHaveBeenCalled();
  });

  it('yakunlangan aksiyada → 409', async () => {
    seedCampaign({ finalizedAt: ENDED });
    participant('p1', 'Dilnoza');
    referrals('p1', 'ACTIVE', 2);
    expect((await all()).status).toBe(409);
    expect(fake.tables().campaignReferral.every((r) => r.status === 'ACTIVE')).toBe(true);
  });
});

describe('GET /participants/[pid]/referrals', () => {
  it('1 daqiqada ≥ 3 ta — shubhali; username’siz sanog‘i', async () => {
    const base = Date.UTC(2026, 10, 18, 9, 0, 0);
    for (const [i, s] of [0, 10, 40, 600].entries()) {
      fake.insert('campaignReferral', {
        id: `r${i}`, campaignId: 'cmp1', participantId: 'p1', referredTelegramId: BigInt(500 + i), referredUsername: i === 3 ? 'bor' : null,
        referredFirstName: `R${i}`, status: 'ACTIVE', createdAt: new Date(base + s * 1000), confirmedAt: null, checkedAt: null,
      });
    }
    const body = await (await GET(new NextRequest('http://localhost/api'), ctx({ pid: 'p1' }))).json();
    expect(body.noUsernameCount).toBe(3);
    expect(body.referrals.map((r: { id: string; suspicious: boolean }) => [r.id, r.suspicious])).toEqual([['r0', true], ['r1', true], ['r2', true], ['r3', false]]);
    expect(body.finalized).toBe(false);
  });
});
