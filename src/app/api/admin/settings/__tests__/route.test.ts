import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const m = vi.hoisted(() => ({ auth: vi.fn(), findMany: vi.fn(), upsert: vi.fn() }));
vi.mock('@/lib/auth', () => ({ auth: m.auth }));
vi.mock('@/lib/db', () => ({ db: { systemSetting: { findMany: m.findMany, upsert: m.upsert } } }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));
vi.mock('next/cache', () => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));
import { GET, PUT } from '../route';
import { BOT_SETTING_DEFAULTS } from '@/lib/bot-settings-defaults';

const put = (settings: Record<string, string>) => PUT(new NextRequest('http://localhost/api/admin/settings', {
  method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ settings }),
}));
const saved = () => Object.fromEntries(m.upsert.mock.calls.map(([arg]) => [arg.where.key, arg.update.value]));

beforeEach(() => {
  vi.clearAllMocks();
  m.auth.mockResolvedValue({ user: { id: 'a1', role: 'ADMIN' } });
  m.findMany.mockResolvedValue([]);
  m.upsert.mockResolvedValue({});
});

describe('GET /api/admin/settings', () => {
  it('bot sozlamalarining standartlari ham qaytadi', async () => {
    const res = await GET();
    const { settings } = await res.json();
    expect(settings).toMatchObject(BOT_SETTING_DEFAULTS);
  });
  it('aksiya capture kalitlari (vaqtinchalik holat) chiqmaydi va PUT ularni qayta yozmaydi', async () => {
    m.findMany.mockResolvedValue([{ key: 'campaign_capture:456', value: '{"kind":"SHARE"}' }, { key: 'site_announcement', value: 'Salom' }]);
    const { settings } = await (await GET()).json();
    expect(settings).not.toHaveProperty('campaign_capture:456');
    expect(settings.site_announcement).toBe('Salom');
    await put({ 'campaign_capture:456': '{"kind":"SHARE"}', site_announcement: 'Salom' });
    expect(saved()).toEqual({ site_announcement: 'Salom' });
  });
  it('yakuniy xabar kursori va cron eslatmasi kalitlari ham ichki; boshqa campaign_ kaliti emas', async () => {
    m.findMany.mockResolvedValue([
      { key: 'campaign_notify:cmp1', value: '{"done":false}' }, { key: 'campaign_finish_notice:cmp1', value: 'x' },
      { key: 'campaign_future_setting', value: 'ha' },
    ]);
    const { settings } = await (await GET()).json();
    expect(settings).not.toHaveProperty('campaign_notify:cmp1');
    expect(settings).not.toHaveProperty('campaign_finish_notice:cmp1');
    expect(settings.campaign_future_setting).toBe('ha');
    await put({ 'campaign_notify:cmp1': '{}', 'campaign_finish_notice:cmp1': 'x', site_announcement: 'Salom' });
    expect(saved()).toEqual({ site_announcement: 'Salom' });
  });
});

describe('PUT /api/admin/settings — bot kalitlari', () => {
  it('noto‘g‘ri kanal — 400, hech narsa saqlanmaydi', async () => {
    const res = await put({ site_announcement: 'Salom', required_channel_username: '@ab' });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Kanal nomi noto'g'ri: @ bilan boshlanib, 5–32 ta lotin harfi, raqam yoki _ bo'lsin");
    expect(m.upsert).not.toHaveBeenCalled();
  });
  it('noto‘g‘ri narx — 400', async () => {
    const res = await put({ course_price: '-5' });
    expect(res.status).toBe(400);
    expect(m.upsert).not.toHaveBeenCalled();
  });
  it('normalizatsiya qilingan ko‘rinishda saqlanadi', async () => {
    const res = await put({
      site_announcement: 'Salom',
      required_channel_username: 'FizikaMSattestatsiya',
      required_channel_link: 't.me/FizikaMSattestatsiya',
      course_price: '350 000',
      course_info_link: '',
    });
    expect(res.status).toBe(200);
    expect(saved()).toEqual({
      site_announcement: 'Salom',
      required_channel_username: '@FizikaMSattestatsiya',
      required_channel_link: 'https://t.me/FizikaMSattestatsiya',
      course_price: '350000',
      course_info_link: '',
    });
  });
  it('admin emas — 403', async () => {
    m.auth.mockResolvedValue({ user: { id: 'u1', role: 'USER' } });
    expect((await put({ course_price: '1' })).status).toBe(403);
    expect(m.upsert).not.toHaveBeenCalled();
  });
});
