import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const m = vi.hoisted(() => ({ requireAdmin: vi.fn() }));
vi.mock('@/lib/api-auth', () => ({ requireAdmin: m.requireAdmin }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));
import { POST } from '../route';

type Replies = Record<string, unknown>;
const BOT_ID = 999;
let replies: Replies = {};

const post = (channel: unknown = 'FizikaMSattestatsiya') => POST(new NextRequest('http://localhost/api/admin/settings/check-channel', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channel }),
}));
const methodCalls = () => vi.mocked(fetch).mock.calls.map(([url, init]) => ({
  method: String(url).split('/').pop(), body: JSON.parse(String(init?.body)) as Record<string, unknown>,
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('TELEGRAM_BOT_TOKEN', 'test-token');
  m.requireAdmin.mockResolvedValue({ error: null });
  replies = {
    getMe: { ok: true, result: { id: BOT_ID } },
    getChat: { ok: true, result: { title: 'Fizika MS attestatsiya' } },
    getChatMemberCount: { ok: true, result: 4480 },
    getChatMember: { ok: true, result: { status: 'administrator', can_post_messages: true, can_edit_messages: true } },
  };
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const reply = replies[String(url).split('/').pop() ?? ''];
    if (reply instanceof Error) throw reply;
    return { json: async () => reply };
  }));
});

describe('POST /api/admin/settings/check-channel', () => {
  it('ADMIN emas — 403, Telegram so‘ralmaydi', async () => {
    m.requireAdmin.mockResolvedValue({ error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) });
    expect((await post()).status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('noto‘g‘ri kanal nomi — 400', async () => {
    const res = await post('@ab');
    expect(res.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('bot admin, huquqlar bor', async () => {
    const res = await post();
    expect(await res.json()).toEqual({ ok: true, title: 'Fizika MS attestatsiya', memberCount: 4480, isAdmin: true, canPost: true, canEdit: true });
    // Forma qiymati normalizatsiya qilinib yuboriladi, bot o'zi tekshiriladi.
    expect(methodCalls().find((c) => c.method === 'getChatMember')?.body).toEqual({ chat_id: '@FizikaMSattestatsiya', user_id: BOT_ID });
  });
  it('bot admin, lekin post huquqi yo‘q', async () => {
    replies.getChatMember = { ok: true, result: { status: 'administrator', can_post_messages: false, can_edit_messages: true } };
    expect(await (await post()).json()).toMatchObject({ ok: true, isAdmin: true, canPost: false, canEdit: true });
  });
  it('bot oddiy a’zo — admin emas', async () => {
    replies.getChatMember = { ok: true, result: { status: 'member' } };
    expect(await (await post()).json()).toMatchObject({ ok: true, isAdmin: false, canPost: false, canEdit: false });
  });
  it('getChatMember ok:false (member list is inaccessible) — xato emas, isAdmin:false', async () => {
    replies.getChatMember = { ok: false, description: 'Bad Request: member list is inaccessible' };
    const res = await post();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, title: 'Fizika MS attestatsiya', memberCount: 4480, isAdmin: false, canPost: false, canEdit: false });
  });
  it('getChatMemberCount yiqilsa — memberCount: null, tekshiruv davom etadi', async () => {
    replies.getChatMemberCount = new Error('network');
    expect(await (await post()).json()).toMatchObject({ ok: true, memberCount: null, isAdmin: true });
    replies.getChatMemberCount = { ok: false, description: 'Bad Request' };
    expect(await (await post()).json()).toMatchObject({ ok: true, memberCount: null });
  });
  it('kanal topilmadi (getChat ok:false) — ok:false va xato matni', async () => {
    replies.getChat = { ok: false, description: 'Bad Request: chat not found' };
    const body = await (await post()).json();
    expect(body.ok).toBe(false);
    expect(body.error).toContain('chat not found');
    expect(methodCalls().some((c) => c.method === 'getChatMember')).toBe(false);
  });
});
