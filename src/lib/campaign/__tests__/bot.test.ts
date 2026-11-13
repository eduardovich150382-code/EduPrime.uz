import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const s = vi.hoisted(() => ({
  getCurrentCampaign: vi.fn(), findParticipantByCode: vi.fn(), findParticipant: vi.fn(), findReferral: vi.fn(),
  createPendingReferral: vi.fn(), confirmReferral: vi.fn(), participantStanding: vi.fn(), joinCampaign: vi.fn(), loadSharePost: vi.fn(),
  error: vi.fn(), warn: vi.fn(),
}));
vi.mock('../store', () => ({
  getCurrentCampaign: s.getCurrentCampaign, findParticipantByCode: s.findParticipantByCode, findParticipant: s.findParticipant,
  findReferral: s.findReferral, createPendingReferral: s.createPendingReferral, confirmReferral: s.confirmReferral,
  participantStanding: s.participantStanding, joinCampaign: s.joinCampaign, loadSharePost: s.loadSharePost,
}));
vi.mock('@/lib/db', () => ({ db: {} }));
vi.mock('@/lib/logger', () => ({ logger: { error: s.error, warn: s.warn, info: vi.fn() } }));

import uz from '@/messages/uz.json';
import { parseBotSettings } from '@/lib/bot-settings';
import type { Membership } from '@/lib/telegram-channel-gate';
import { confirmPendingReferral, handleCampaignCallback, handleCampaignStart, joinFlow, type CampaignBotCtx } from '../bot';
import { campaignFixture, campaignNow, participantFixture } from './fixtures';

const cm = uz.telegramBot.campaign;
const ADMIN = 1;
const USER = 777;
const referrer = participantFixture();

type Button = { text: string; url?: string; callback_data?: string };
type Sent = { chatId: number | string; text: string; options?: { reply_markup?: { inline_keyboard: Button[][] } } };

function makeCtx(membership: Membership = 'not_member', userId = USER, botRows: Record<string, string> = {}) {
  const sent: Sent[] = [];
  const photos: { chatId: number | string; photo: string; caption: string }[] = [];
  const answers: { id: string; options?: { text?: string; show_alert?: boolean } }[] = [];
  const ctx: CampaignBotCtx = {
    chatId: userId, userId, username: 'yangi', firstName: 'Ali',
    bot: parseBotSettings(Object.entries(botRows).map(([key, value]) => ({ key, value }))),
    isAdmin: (id) => id.toString() === String(ADMIN),
    checkMembership: vi.fn(async () => membership),
    transport: {
      send: vi.fn(async (chatId, text, options) => { sent.push({ chatId, text, options: options as Sent['options'] }); }),
      sendPhoto: vi.fn(async (chatId, photo, caption) => { photos.push({ chatId, photo, caption }); }),
      answer: vi.fn(async (id, options) => { answers.push({ id, options }); }),
    },
    startDefault: vi.fn(async () => {}),
  };
  return { ctx, sent, photos, answers };
}
const buttons = (msg?: Sent) => msg?.options?.reply_markup?.inline_keyboard.flat() ?? [];

beforeEach(() => {
  vi.resetAllMocks(); vi.useFakeTimers(); vi.setSystemTime(campaignNow);
  const campaign = campaignFixture();
  s.getCurrentCampaign.mockResolvedValue(campaign);
  s.findParticipantByCode.mockResolvedValue({ ...referrer, campaign });
  s.findReferral.mockResolvedValue(null);
  s.createPendingReferral.mockResolvedValue('created');
  s.confirmReferral.mockResolvedValue(true);
  s.participantStanding.mockResolvedValue({ activeCount: 3, rank: 2, percent: 0, next: { percent: 20, needed: 2 } });
  s.loadSharePost.mockResolvedValue(null);
});
afterEach(() => { vi.useRealTimers(); });

describe('/start c_<kod>', () => {
  it('not_member → PENDING + referral_prompt, oddiy /start yo‘q', async () => {
    const { ctx, sent } = makeCtx('not_member');
    expect(await handleCampaignStart(ctx, 'Ab12Cd34')).toBe('stop');
    expect(s.createPendingReferral).toHaveBeenCalledWith('cmp1', 'p1', { telegramId: USER, username: 'yangi', firstName: 'Ali' });
    expect(ctx.checkMembership).toHaveBeenCalledWith(USER, '@FizikaMSattestatsiya');
    expect(sent).toHaveLength(1);
    expect(sent[0].text).toContain('Assalomu alaykum, Ali!');
    expect(buttons(sent[0]).map((b) => b.url ?? b.callback_data)).toEqual(['https://t.me/FizikaMSattestatsiya', 'cmp:ok']);
    expect(ctx.startDefault).not.toHaveBeenCalled();
  });
  it('member → already_member + qatnashish tugmasi, ball yo‘q', async () => {
    const { ctx, sent } = makeCtx('member');
    expect(await handleCampaignStart(ctx, 'Ab12Cd34')).toBe('continue');
    expect(s.createPendingReferral).not.toHaveBeenCalled();
    expect(sent[0].text).toContain('allaqachon obuna bo');
    expect(buttons(sent[0])[0]).toMatchObject({ text: cm.joinButton, callback_data: 'cmp:join' });
  });
  it('o‘zini taklif — ball yo‘q, oddiy /start', async () => {
    const { ctx, sent } = makeCtx('not_member', 100);
    expect(await handleCampaignStart(ctx, 'Ab12Cd34')).toBe('continue');
    expect(s.createPendingReferral).not.toHaveBeenCalled();
    expect(sent).toHaveLength(0);
  });
  it('takroriy referal (ACTIVE) — ball yo‘q, oddiy /start', async () => {
    s.findReferral.mockResolvedValue({ id: 'r1', status: 'ACTIVE', participantId: 'p1', participant: referrer });
    const { ctx, sent } = makeCtx('not_member');
    expect(await handleCampaignStart(ctx, 'Ab12Cd34')).toBe('continue');
    expect(s.createPendingReferral).not.toHaveBeenCalled();
    expect(ctx.checkMembership).not.toHaveBeenCalled();
    expect(sent).toHaveLength(0);
  });
  it('takroriy bosish, hali PENDING — ✅ tugmasi qayta beriladi', async () => {
    s.findReferral.mockResolvedValue({ id: 'r1', status: 'PENDING', participantId: 'p1', participant: referrer });
    const { ctx, sent } = makeCtx('not_member');
    expect(await handleCampaignStart(ctx, 'Ab12Cd34')).toBe('stop');
    expect(s.createPendingReferral).not.toHaveBeenCalled();
    expect(buttons(sent[0]).some((b) => b.callback_data === 'cmp:ok')).toBe(true);
  });
  it('a’zolik unknown — ball yo‘q, xato logga', async () => {
    const { ctx } = makeCtx('unknown');
    expect(await handleCampaignStart(ctx, 'Ab12Cd34')).toBe('continue');
    expect(s.createPendingReferral).not.toHaveBeenCalled();
    expect(s.error).toHaveBeenCalled();
  });
  it('kod topilmadi yoki store xatosi (null) → not_active + oddiy /start', async () => {
    s.findParticipantByCode.mockResolvedValue(null);
    const { ctx, sent } = makeCtx();
    expect(await handleCampaignStart(ctx, 'Zz99Zz99')).toBe('continue');
    expect(sent[0].text).toContain('Hozir faol aksiya yo');
  });
  it('qoralama: oddiy ishtirokchining havolasi ishlamaydi, adminniki ishlaydi', async () => {
    const draft = campaignFixture({ isPublished: false });
    s.findParticipantByCode.mockResolvedValue({ ...referrer, campaign: draft });
    const first = makeCtx('not_member');
    expect(await handleCampaignStart(first.ctx, 'Ab12Cd34')).toBe('continue');
    expect(s.createPendingReferral).not.toHaveBeenCalled();

    s.findParticipantByCode.mockResolvedValue({ ...referrer, telegramId: BigInt(ADMIN), campaign: draft });
    const second = makeCtx('not_member');
    expect(await handleCampaignStart(second.ctx, 'Ab12Cd34')).toBe('stop');
    expect(s.createPendingReferral).toHaveBeenCalledOnce();
  });
});

describe('cmp:ok', () => {
  const pending = () => s.findReferral.mockResolvedValue({ id: 'r1', status: 'PENDING', participantId: 'p1', participant: referrer });

  it('member → ACTIVE, taklif qilganga point_added, yangi odamga invite_new va oddiy /start', async () => {
    pending();
    const { ctx, sent, answers } = makeCtx('member');
    await handleCampaignCallback(ctx, 'cmp:ok', 'cb1');
    expect(s.confirmReferral).toHaveBeenCalledWith('r1');
    const toReferrer = sent.find((m) => m.chatId === '100');
    expect(toReferrer?.text).toContain('+1 ball!');
    expect(toReferrer?.text).toContain('Jami: <b>3</b> ball');
    expect(toReferrer?.text).toContain('20% chegirmagacha yana 2 ta odam');
    const toUser = sent.find((m) => m.chatId === USER);
    expect(toUser?.text).toContain('Obuna tasdiqlandi, rahmat!');
    expect(buttons(toUser)[0]).toMatchObject({ callback_data: 'cmp:join' });
    expect(answers).toEqual([{ id: 'cb1', options: undefined }]);
    expect(ctx.startDefault).toHaveBeenCalledOnce();
  });
  it('point_added yuborish xatosi yangi odam oqimini to‘xtatmaydi', async () => {
    pending();
    const { ctx } = makeCtx('member');
    vi.mocked(ctx.transport.send).mockImplementationOnce(async () => { throw new Error('403 blocked'); });
    await handleCampaignCallback(ctx, 'cmp:ok', 'cb1');
    expect(ctx.startDefault).toHaveBeenCalledOnce();
  });
  it('not_member → alert, tasdiq yo‘q', async () => {
    pending();
    const { ctx, answers } = makeCtx('not_member');
    await handleCampaignCallback(ctx, 'cmp:ok', 'cb1');
    expect(s.confirmReferral).not.toHaveBeenCalled();
    expect(answers[0].options).toEqual({ text: expect.stringContaining('hali @FizikaMSattestatsiya kanaliga obuna'), show_alert: true });
    expect(answers[0].options?.text).not.toContain('<');
    expect(ctx.startDefault).not.toHaveBeenCalled();
  });
  it('unknown → "Tekshirib bo‘lmadi" alerti', async () => {
    pending();
    const { ctx, answers } = makeCtx('unknown');
    await handleCampaignCallback(ctx, 'cmp:ok', 'cb1');
    expect(answers[0].options).toEqual({ text: cm.checkFailedAlert, show_alert: true });
  });
  it('PENDING referal yo‘q → "Aksiya topilmadi" + oddiy /start', async () => {
    const { ctx, answers } = makeCtx('member');
    await handleCampaignCallback(ctx, 'cmp:ok', 'cb1');
    expect(answers[0].options).toEqual({ text: cm.notFoundToast });
    expect(ctx.startDefault).toHaveBeenCalledOnce();
  });
  it('aksiya to‘xtatilgan — ball berilmaydi', async () => {
    pending();
    s.getCurrentCampaign.mockResolvedValue(campaignFixture({ isPaused: true }));
    const { ctx } = makeCtx('member');
    expect((await confirmPendingReferral(ctx)).status).toBe('none');
    expect(s.confirmReferral).not.toHaveBeenCalled();
  });
  it('parallel tasdiq yutqazgan — point_added ikki marta ketmaydi', async () => {
    pending();
    s.confirmReferral.mockResolvedValue(false);
    const { ctx, sent } = makeCtx('member');
    expect((await confirmPendingReferral(ctx)).status).toBe('already');
    expect(sent).toHaveLength(0);
  });
});

describe('qatnashish', () => {
  it('ACTIVE — join_welcome + tugmalar, keyin standart share_post', async () => {
    s.joinCampaign.mockResolvedValue(participantFixture({ id: 'p9', telegramId: BigInt(USER), refCode: 'Zx98Yw76' }));
    const { ctx, sent } = makeCtx('member');
    expect(await joinFlow(ctx)).toBe('joined');
    expect(sent).toHaveLength(2);
    expect(sent[0].text).toContain('https://t.me/EduPrimeuzbot?start=c_Zx98Yw76');
    const [share, me, rules] = buttons(sent[0]);
    expect(share.url).toContain('https://t.me/share/url?url=' + encodeURIComponent('https://t.me/EduPrimeuzbot?start=c_Zx98Yw76'));
    expect([me.callback_data, rules.callback_data]).toEqual(['cmp:me', 'cmp:rules']);
    expect(sent[1].text).toContain('👉 Obuna bo\'lish: https://t.me/EduPrimeuzbot?start=c_Zx98Yw76');
  });
  it('SHARE posti rasm bilan — sendPhoto, caption shablondan', async () => {
    s.joinCampaign.mockResolvedValue(participantFixture({ refCode: 'Zx98Yw76' }));
    s.loadSharePost.mockResolvedValue({ id: 'post', text: 'Kanal: {havola}', imageUrl: 'https://img/x.jpg', buttonText: null, buttonUrl: null });
    const { ctx, photos } = makeCtx('member');
    await joinFlow(ctx);
    expect(photos).toEqual([{ chatId: USER, photo: 'https://img/x.jpg', caption: 'Kanal: https://t.me/EduPrimeuzbot?start=c_Zx98Yw76' }]);
  });
  it('A4: imageUrl — Telegram file_id; sendPhoto uni o‘zgarishsiz oladi', async () => {
    s.joinCampaign.mockResolvedValue(participantFixture({ refCode: 'Zx98Yw76' }));
    const fileId = 'AgACAgIAAxkBAAIBZ2dQ_x-file-id';
    s.loadSharePost.mockResolvedValue({ id: 'post', text: '<b>{kanal}</b>: {havola}', imageUrl: fileId, buttonText: null, buttonUrl: null });
    const { ctx, photos } = makeCtx('member');
    await joinFlow(ctx);
    expect(photos).toEqual([{ chatId: USER, photo: fileId, caption: '<b>@FizikaMSattestatsiya</b>: https://t.me/EduPrimeuzbot?start=c_Zx98Yw76' }]);
  });
  it('qoralama: oddiy foydalanuvchi qatnasha olmaydi, admin qatnashadi', async () => {
    s.getCurrentCampaign.mockResolvedValue(campaignFixture({ isPublished: false }));
    const user = makeCtx('member');
    expect(await joinFlow(user.ctx)).toBe('not_active');
    expect(s.joinCampaign).not.toHaveBeenCalled();
    expect(user.sent[0].text).toContain('Hozir faol aksiya yo');

    s.joinCampaign.mockResolvedValue(participantFixture({ telegramId: BigInt(ADMIN) }));
    const admin = makeCtx('member', ADMIN);
    expect(await joinFlow(admin.ctx)).toBe('joined');
  });
  it('aksiya kanali majburiy kanaldan farq qilsa — obuna so‘raladi, cmp:join', async () => {
    s.getCurrentCampaign.mockResolvedValue(campaignFixture({ channelUsername: '@BoshqaKanal', channelLink: 'https://t.me/BoshqaKanal' }));
    const { ctx, sent } = makeCtx('not_member');
    expect(await joinFlow(ctx)).toBe('subscribe_prompt');
    expect(ctx.checkMembership).toHaveBeenCalledWith(USER, '@BoshqaKanal');
    expect(buttons(sent[0]).map((b) => b.url ?? b.callback_data)).toEqual(['https://t.me/BoshqaKanal', 'cmp:join']);
    expect(s.joinCampaign).not.toHaveBeenCalled();
  });
  it('aksiya kanali majburiy kanal bilan bir xil — gate tekshirgan, qayta so‘rov yo‘q', async () => {
    s.joinCampaign.mockResolvedValue(participantFixture());
    const { ctx } = makeCtx('not_member');
    expect(await joinFlow(ctx)).toBe('joined');
    expect(ctx.checkMembership).not.toHaveBeenCalled();
  });
  it('aksiya yo‘q (store xatosi → null) — not_active', async () => {
    s.getCurrentCampaign.mockResolvedValue(null);
    const { ctx, sent } = makeCtx('member');
    expect(await joinFlow(ctx)).toBe('not_active');
    expect(sent[0].text).toContain('Hozir faol aksiya yo');
  });
});

describe('cmp:me', () => {
  it('ishtirokchi — my_result, foiz 0 qatori chiqmaydi', async () => {
    s.findParticipant.mockResolvedValue(participantFixture({ telegramId: BigInt(USER) }));
    const { ctx, sent } = makeCtx();
    await handleCampaignCallback(ctx, 'cmp:me', 'cb');
    expect(sent[0].text).toContain('Ball: <b>3</b>');
    expect(sent[0].text).not.toContain('Hozirgi chegirma');
  });
  it('ishtirokchi emas — qatnashish taklifi', async () => {
    s.findParticipant.mockResolvedValue(null);
    const { ctx, sent } = makeCtx();
    await handleCampaignCallback(ctx, 'cmp:me', 'cb');
    expect(sent[0].text).toBe(cm.joinInvite);
    expect(buttons(sent[0])[0].callback_data).toBe('cmp:join');
  });
});
