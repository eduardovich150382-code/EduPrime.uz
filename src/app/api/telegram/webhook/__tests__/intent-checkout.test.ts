import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

type Row = Record<string, unknown>;
const s = vi.hoisted(() => {
  process.env.TELEGRAM_BOT_TOKEN = 'test-token'; process.env.ADMIN_TELEGRAM_IDS = '456'; process.env.NEXT_PUBLIC_APP_URL = 'http://localhost';
  return { settings: new Map<string, string>(), users: [] as Record<string, unknown>[], payments: [] as Record<string, unknown>[],
    subscriptions: [] as Record<string, unknown>[], results: new Map<string, number>(), confirm: vi.fn(), subscribed: { value: true } };
});

// Niyat, bog'lash va chek oqimi bir nechta jadval orqali o'tadi — alohida
// mock'lar o'rniga kichik xotira-baza bilan haqiqiy ketma-ketlik tekshiriladi.
function matches(row: Row, where: Row): boolean {
  return Object.entries(where).every(([key, value]) => {
    if (key === 'OR') return (value as Row[]).some((w) => matches(row, w));
    if (value && typeof value === 'object' && 'equals' in value) return JSON.stringify(row[key]) === JSON.stringify(value.equals);
    if (value && typeof value === 'object' && 'not' in value) return row[key] !== value.not;
    if (value && typeof value === 'object' && 'in' in value) return (value.in as unknown[]).includes(row[key]);
    return row[key] === value;
  });
}
const fake = vi.hoisted(() => ({} as Row));
vi.mock('@/lib/db', () => ({ db: fake }));
vi.mock('@/lib/subscription-payments', () => ({ paymentTransaction: (fn: (tx: unknown) => unknown) => fn(fake), processSubscriptionPayment: s.confirm, processLegacySubscription: vi.fn() }));
vi.mock('@/lib/purchases', () => ({ recordPurchase: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));
import { POST } from '../route';
import { createIntentToken, intentKey, paymentChatKey, telegramPaymentKey } from '@/lib/checkout-intent';
import { checkoutStartParameter } from '@/lib/category-checkout';
import uz from '@/messages/uz.json';
import ru from '@/messages/ru.json';

const now = new Date('2026-10-24T07:00:00Z');
const offer = { id: 'o', productId: 'p', labelUz: '1 oy', labelRu: '1 месяц', labelEn: '1 month', price: 10000, durationMonths: 1, untilDate: null, isActive: true, order: 0 };
const product = { id: 'p', kind: 'CATEGORY', subjectRule: 'ONE', categoryId: 'att', nameUz: 'Attestatsiya', nameRu: 'Аттестация', nameEn: 'Attestation', isOnSale: true, secondSubjectDiscountPct: 25 };
const subjects = [{ id: 'physics', categoryId: 'att', nameUz: 'Fizika', nameRu: 'Физика', nameEn: 'Physics', isMandatory: false, order: 0, _count: { tests: 3 } }];
const tg = { id: 777, username: 'gstudent', first_name: 'Ali' };
const user = (id: string, extra: Row = {}) => ({ id, name: id, email: null, telegramId: null, telegramUsername: null, lang: 'uz', ...extra });
const find = (rows: Row[], where: Row) => rows.find((row) => matches(row, where)) ?? null;

Object.assign(fake, {
  product: { findMany: async () => [{ ...product, offers: [offer] }], findUniqueOrThrow: async () => product },
  productOffer: { findUniqueOrThrow: async () => offer },
  subject: { findMany: async ({ where }: { where: Row }) => subjects.filter((x) => matches(x, where)) },
  user: {
    findUnique: async ({ where }: { where: Row }) => find(s.users, where), findFirst: async ({ where }: { where: Row }) => find(s.users, where),
    update: async ({ where, data }: { where: Row; data: Row }) => Object.assign(find(s.users, where)!, data),
    upsert: async () => { throw new Error('ci_ oqimi telegramId bo‘yicha upsert qilmasligi kerak'); },
  },
  payment: {
    findFirst: async ({ where }: { where: Row }) => [...s.payments].reverse().find((p) => matches(p, where)) ?? null,
    findUnique: async ({ where, include }: { where: Row; include?: Row }) => { const p = find(s.payments, where); return p && include?.user ? { ...p, user: find(s.users, { id: p.userId }) } : p; },
    findUniqueOrThrow: async ({ where }: { where: Row }) => { const p = find(s.payments, where)!; return { ...p, product, offer, user: find(s.users, { id: p.userId }) }; },
    create: async ({ data }: { data: Row }) => { const p = { id: `pay${s.payments.length + 1}`, status: 'PENDING', receiptPhoto: null, telegramMsgId: null, createdAt: now, ...data }; s.payments.push(p); return p; },
    update: async ({ where, data }: { where: Row; data: Row }) => Object.assign(find(s.payments, where)!, data),
    updateMany: async ({ where, data }: { where: Row; data: Row }) => { const rows = s.payments.filter((p) => matches(p, where)); rows.forEach((p) => Object.assign(p, data)); return { count: rows.length }; },
    count: async ({ where }: { where: Row }) => s.payments.filter((p) => matches(p, where)).length,
  },
  subscription: {
    findMany: async () => [], count: async ({ where }: { where: Row }) => s.subscriptions.filter((x) => matches(x, where)).length,
    findFirst: async ({ where }: { where: Row }) => find(s.subscriptions, where),
  },
  testResult: { count: async ({ where }: { where: { userId: string } }) => s.results.get(where.userId) ?? 0 },
  systemSetting: {
    findUnique: async ({ where }: { where: { key: string } }) => s.settings.has(where.key) ? { key: where.key, value: s.settings.get(where.key)! } : null,
    findMany: async () => [],
    create: async ({ data }: { data: { key: string; value: string } }) => { s.settings.set(data.key, data.value); return data; },
    update: async ({ where, data }: { where: { key: string }; data: { value: string } }) => { s.settings.set(where.key, data.value); return data; },
    upsert: async ({ where, create, update }: { where: { key: string }; create: { value: string }; update: { value: string } }) => { s.settings.set(where.key, s.settings.has(where.key) ? update.value : create.value); return {}; },
    delete: async ({ where }: { where: { key: string } }) => { s.settings.delete(where.key); return {}; },
  },
});

const request = (body: unknown) => new NextRequest('http://localhost/api/telegram/webhook', { method: 'POST', headers: { 'x-telegram-bot-api-secret-token': 'test-webhook' }, body: JSON.stringify(body) });
const command = (text: string, sender: typeof tg = tg) => POST(request({ message: { text, chat: { id: sender.id }, from: sender } }));
const callback = (data: string, sender: { id: number } = tg) => POST(request({ callback_query: { id: 'cb', from: sender, message: { chat: { id: sender.id } }, data } }));
const photo = (replyTo: unknown, sender: typeof tg = tg) => POST(request({ message: { chat: { id: sender.id }, from: sender, message_id: 900, reply_to_message: { message_id: Number(replyTo) }, photo: [{ file_id: 'f1' }] } }));
type Sent = { chat_id: number; text: string; reply_markup?: { inline_keyboard: { text: string; callback_data?: string; url?: string }[][] } };
function messages(): Sent[] { return vi.mocked(fetch).mock.calls.filter(([url]) => String(url).endsWith('/sendMessage')).map(([, init]) => JSON.parse(String(init?.body)) as Sent); }
const toUser = (chatId: number) => messages().filter((msg) => msg.chat_id === chatId);
function intent(userId = 'site', extra: Row = {}) {
  const token = createIntentToken();
  s.settings.set(intentKey(token), JSON.stringify({ userId, productId: 'p', offerId: 'o', subjectIds: ['physics'], createdAt: now.getTime(), ...extra }));
  return `/start ci_${token}`;
}

let messageId: number;
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(now); vi.stubEnv('TELEGRAM_WEBHOOK_SECRET', 'test-webhook');
  s.settings.clear(); s.users.length = 0; s.payments.length = 0; s.subscriptions.length = 0; s.results.clear(); s.subscribed.value = true; messageId = 100;
  s.confirm.mockReset(); s.confirm.mockResolvedValue({ alreadyProcessed: false });
  s.users.push(user('site', { email: 'google@example.com', lang: 'ru' }), user('admin', { telegramId: '456' }));
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ json: async () => ({ ok: true,
    result: url.endsWith('/getChatMember') ? { status: s.subscribed.value ? 'member' : 'left' } : url.endsWith('/getFile') ? { file_path: 'receipts/r.jpg' } : { message_id: ++messageId } }) })));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('/start ci_ — saytdan to‘g‘ridan-to‘g‘ri to‘lov', () => {
  it('yangi Telegram sayt akkauntiga bog‘lanadi; to‘lov darhol, fan/variant so‘ralmaydi', async () => {
    await command(intent());
    expect(find(s.users, { id: 'site' })).toMatchObject({ telegramId: '777', telegramUsername: 'gstudent' });
    expect(s.payments).toHaveLength(1);
    expect(s.payments[0]).toMatchObject({ userId: 'site', productId: 'p', offerId: 'o', subjectIds: ['physics'], amount: 10000, status: 'PENDING' });
    const sent = toUser(777);
    expect(sent).toHaveLength(1); expect(sent[0].reply_markup).toBeUndefined();
    expect(sent[0].text).toContain('Аттестация'); expect(sent[0].text).toContain('Физика'); expect(sent[0].text).toContain('1 месяц');
    expect(sent[0].text).toMatch(/10\s000/); expect(sent[0].text).toContain(ru.checkout.card); expect(sent[0].text).toContain(ru.checkout.intentReceiptPrompt);
    expect(s.payments[0].telegramMsgId).toBe(String(messageId));
    expect(JSON.parse(s.settings.get(telegramPaymentKey('777'))!)).toEqual({ paymentId: 'pay1' });
    expect(JSON.parse(s.settings.get(paymentChatKey('pay1'))!)).toEqual({ telegramId: '777' });
    expect(toUser(456)).toHaveLength(0);
  });
  it('takroriy bosish yangi Payment yaratmaydi, xuddi shu to‘lovni qayta ko‘rsatadi', async () => {
    const start = intent();
    await command(start); await command(start); await command(start);
    expect(s.payments).toHaveLength(1);
    expect(toUser(777).every((msg) => msg.text.includes(ru.checkout.intentReceiptPrompt))).toBe(true);
  });
  it('chek yuborilgach qayta bosish chekni qabul qilingan deb aytadi', async () => {
    const start = intent();
    await command(start); await photo(s.payments[0].telegramMsgId); await command(start);
    expect(s.payments).toHaveLength(1); expect(toUser(777).at(-1)?.text).toBe(ru.checkout.receiptAccepted);
  });
  it('boshqa Telegram akkaunt bog‘langan niyatdan foydalana olmaydi', async () => {
    const start = intent();
    await command(start); await command(start, { id: 888, username: 'other', first_name: 'B' });
    expect(s.payments).toHaveLength(1); expect(toUser(888)[0].text).toBe(uz.checkout.intentExpired);
  });
  it.each(['expired', 'unknown', 'malformed', 'deleted-user'])('%s: "havola eskirgan" + mahsulotlar ro‘yxati', async (state) => {
    let start = intent(state === 'deleted-user' ? 'ghost' : 'site', state === 'expired' ? { createdAt: now.getTime() - 61 * 60 * 1000 } : {});
    if (state === 'unknown') start = `/start ci_${createIntentToken()}`;
    if (state === 'malformed') start = '/start ci_bad!';
    await command(start);
    expect(s.payments).toHaveLength(0);
    const sent = toUser(777);
    expect(sent[0].text).toBe(uz.checkout.intentExpired);
    expect(sent[1].reply_markup?.inline_keyboard[0][0].text).toBe('Attestatsiya');
    if (state === 'expired') expect([...s.settings.keys()].some((key) => key.startsWith('checkout_intent_'))).toBe(false);
  });
  it.each([[0, uz.checkout.holderEmpty], [2, uz.checkout.holderHasData]])('telegramId band (natijalar: %i): bog‘lanmaydi, to‘lov sayt akkauntiga, adminga ogohlantirish', async (results, note) => {
    s.users.push(user('tg-dup', { telegramId: '777', name: 'Telegram User' })); s.results.set('tg-dup', results);
    await command(intent());
    expect(find(s.users, { id: 'site' })?.telegramId).toBeNull(); expect(find(s.users, { id: 'tg-dup' })?.telegramId).toBe('777');
    expect(s.users).toHaveLength(3);
    expect(s.payments[0]).toMatchObject({ userId: 'site' });
    const warning = toUser(456).at(-1)!.text;
    expect(warning).toContain(uz.checkout.intentConflict); expect(warning).toContain('google@example.com'); expect(warning).toContain('tg-dup'); expect(warning).toContain(note);
  });
  it('sayt akkauntida boshqa telegramId bo‘lsa ham to‘lov niyatdagi userId ga', async () => {
    Object.assign(find(s.users, { id: 'site' })!, { telegramId: '999' });
    await command(intent());
    expect(find(s.users, { id: 'site' })?.telegramId).toBe('999'); expect(s.payments[0]).toMatchObject({ userId: 'site' });
    expect(toUser(456)).toHaveLength(0);
  });
  it('kanalga obuna bo‘lmagan foydalanuvchi uchun ham to‘lov darhol boshlanadi', async () => {
    s.subscribed.value = false;
    await command(intent());
    expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).endsWith('/getChatMember'))).toBe(false);
    expect(s.payments).toHaveLength(1); expect(toUser(777).at(-1)?.text).toContain(ru.checkout.intentReceiptPrompt);
  });
  it('eski "Obuna bo‘ldim" tugmasi saqlangan niyat bilan to‘lovni davom ettiradi', async () => {
    const start = intent();
    await callback(`check_subscription:${start.replace('/start ', '')}`);
    expect(s.payments).toHaveLength(1); expect(toUser(777).at(-1)?.text).toContain(ru.checkout.intentReceiptPrompt);
  });
});

describe('ci_ cheki va tasdiqlash', () => {
  it('bog‘langan holat: admin xabarida sayt emaili bor, ogohlantirish qatori yo‘q', async () => {
    await command(intent()); await photo(s.payments[0].telegramMsgId);
    expect(s.payments[0].receiptPhoto).toContain('receipts/r.jpg');
    const admin = toUser(456).at(-1)!;
    expect(admin.text).toContain('google@example.com'); expect(admin.text).not.toContain(uz.checkout.telegramMismatch);
    expect(admin.reply_markup?.inline_keyboard[0].map((b) => b.callback_data)).toEqual(['cp:c:pay1', 'cp:r:pay1']);
  });
  it('ziddiyat holati: chek yo‘naltirgich orqali sayt to‘loviga tushadi va admin ogohlantiriladi', async () => {
    s.users.push(user('tg-dup', { telegramId: '777' }));
    s.payments.push({ id: 'old', userId: 'tg-dup', productId: 'p', offerId: 'o', subjectIds: ['physics'], status: 'CONFIRMED', receiptPhoto: 'x', telegramMsgId: '1', createdAt: now });
    await command(intent()); await photo(s.payments[1].telegramMsgId);
    expect(s.payments[1]).toMatchObject({ userId: 'site', receiptPhoto: expect.stringContaining('receipts/r.jpg') });
    const admin = toUser(456).at(-1)!;
    expect(admin.text).toContain('google@example.com'); expect(admin.text).toContain(uz.checkout.telegramMismatch);
    expect(toUser(777).at(-1)?.text).toBe(ru.checkout.receiptAccepted);
  });
  it('tasdiqlangach foydalanuvchiga doira, sana va saytga havola boradi (ziddiyatda ham shu chatga)', async () => {
    s.users.push(user('tg-dup', { telegramId: '777' }));
    await command(intent());
    s.subscriptions.push({ paymentId: 'pay1', userId: 'site', subjectIds: ['physics'], endDate: new Date('2026-11-11T18:59:59Z'), product, category: { type: 'ATTESTATION' } });
    await callback('cp:c:pay1', { id: 456 });
    expect(s.confirm).toHaveBeenCalledWith('pay1', 'confirm', 'admin');
    const done = toUser(777).at(-1)!;
    expect(done.text).toBe('Подписка активирована — Аттестация · Физика, до 11 ноября');
    expect(done.reply_markup?.inline_keyboard[0][0]).toEqual({ text: ru.checkout.openSite, url: 'http://localhost/ru/attestation' });
  });
  it('o‘zbekcha: "Obunangiz faollashdi — Attestatsiya · Fizika, 11-noyabrgacha"', async () => {
    Object.assign(find(s.users, { id: 'site' })!, { lang: 'uz' });
    await command(intent());
    s.subscriptions.push({ paymentId: 'pay1', userId: 'site', subjectIds: ['physics'], endDate: new Date('2026-11-11T18:59:59Z'), product, category: { type: 'ATTESTATION' } });
    await callback('cp:c:pay1', { id: 456 });
    expect(toUser(777).at(-1)?.text).toBe('Obunangiz faollashdi — Attestatsiya · Fizika, 11-noyabrgacha');
    expect(toUser(777).at(-1)?.reply_markup?.inline_keyboard[0][0].url).toBe('http://localhost/attestation');
  });
});

describe('eski buy_p_ oqimi', () => {
  it('saytdan bog‘lanmagan havola fanni so‘rashda davom etadi', async () => {
    await command(`/start ${checkoutStartParameter('p', 'o')}`);
    expect(s.payments).toHaveLength(0);
    expect(toUser(777).at(-1)?.reply_markup?.inline_keyboard[0][0].text).toBe('Fizika');
  });
});
