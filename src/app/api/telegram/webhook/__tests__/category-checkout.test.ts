import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { Payment } from '@prisma/client';

const m = vi.hoisted(() => {
  process.env.TELEGRAM_BOT_TOKEN = 'test-token'; process.env.ADMIN_TELEGRAM_IDS = '456'; process.env.NEXT_PUBLIC_APP_URL = 'http://localhost';
  return { products: vi.fn(), freshProduct: vi.fn(), freshOffer: vi.fn(), subjects: vi.fn(), user: vi.fn(), upsertUser: vi.fn(),
    pending: vi.fn(), create: vi.fn(), update: vi.fn(), attach: vi.fn(), details: vi.fn(), lookup: vi.fn(), current: vi.fn(), transaction: vi.fn(),
    setting: vi.fn(), settings: vi.fn(), upsertSetting: vi.fn(), confirm: vi.fn(), legacy: vi.fn(), item: vi.fn(), purchase: vi.fn(), deleteSetting: vi.fn() };
});
vi.mock('@/lib/db', () => ({ db: {
  product: { findMany: m.products }, subject: { findMany: m.subjects }, user: { findUnique: m.user, findFirst: m.user, upsert: m.upsertUser },
  test: { findUnique: m.item }, course: { findUnique: m.item },
  payment: { findFirst: m.pending, create: m.create, update: m.update, updateMany: m.attach, findUniqueOrThrow: m.details, findUnique: m.lookup },
  systemSetting: { findUnique: m.setting, findMany: m.settings, upsert: m.upsertSetting, delete: m.deleteSetting },
} }));
vi.mock('@/lib/purchases', () => ({ recordPurchase: m.purchase }));
vi.mock('@/lib/subscription-payments', () => ({ paymentTransaction: m.transaction, processSubscriptionPayment: m.confirm, processLegacySubscription: m.legacy }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));
import { POST } from '../route';
import { checkoutCallback, checkoutStartParameter } from '@/lib/category-checkout';
import uz from '@/messages/uz.json';
import ru from '@/messages/ru.json';
import en from '@/messages/en.json';

const now = new Date('2026-10-24T07:00:00Z');
const offer = { id: 'o', productId: 'p', labelUz: '1 oy', labelRu: '1 месяц', labelEn: '1 month', price: 10000, durationMonths: 1, untilDate: null, isActive: true };
const product = { id: 'p', kind: 'CATEGORY', subjectRule: 'ONE', categoryId: 'att', nameUz: 'Attestatsiya', nameRu: 'Аттестация', nameEn: 'Attestation', isOnSale: true, secondSubjectDiscountPct: 25, offers: [offer] };
const subject = (id: string, count = 1, isMandatory = false) => ({ id, categoryId: 'att', nameUz: id, nameRu: id, nameEn: id, isMandatory, _count: { tests: count } });
const user = { id: 'u1', telegramId: '123', lang: 'uz', name: 'Student', telegramUsername: 'student' };
const from = { id: 123, username: 'student', first_name: 'Student', language_code: 'uz' };
let payment: Payment | null;
let messageId: number;
const tx = { product: { findUniqueOrThrow: m.freshProduct }, productOffer: { findUniqueOrThrow: m.freshOffer },
  user: { upsert: m.upsertUser }, payment: { findFirst: m.pending, create: m.create }, subscription: { findMany: m.current } };
const request = (body: unknown, secret = 'test-webhook') => new NextRequest('http://localhost/api/telegram/webhook', { method: 'POST', headers: { 'x-telegram-bot-api-secret-token': secret }, body: JSON.stringify(body) });
const callback = (data: string, sender = from) => POST(request({ callback_query: { id: 'cb', from: sender, message: { chat: { id: sender.id } }, data } }));
const command = (text: string, sender = from) => POST(request({ message: { text, chat: { id: sender.id }, from: sender } }));
const finalSelection = () => callback(checkoutCallback('o', 'p', ['physics'], 'o'));
type Sent = { chat_id: number; text: string; reply_markup?: { inline_keyboard: { text: string; callback_data?: string }[][] } };
function messages(): Sent[] { return vi.mocked(fetch).mock.calls.filter(([url]) => String(url).endsWith('/sendMessage')).map(([, init]) => JSON.parse(String(init?.body)) as Sent); }

beforeEach(() => {
  vi.resetAllMocks(); vi.useFakeTimers(); vi.setSystemTime(now); vi.stubEnv('TELEGRAM_WEBHOOK_SECRET', 'test-webhook');
  payment = null; messageId = 100;
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ json: async () => ({ ok: true, result: url.endsWith('/getChatMember') ? { status: 'member' } : url.endsWith('/getFile') ? { file_path: 'receipts/file.jpg' } : { message_id: ++messageId } }) })));
  m.products.mockResolvedValue([product]); m.freshProduct.mockResolvedValue(product); m.freshOffer.mockResolvedValue(offer);
  m.subjects.mockResolvedValue([subject('physics'), subject('math'), subject('draft', 0)]);
  m.user.mockResolvedValue(user); m.upsertUser.mockResolvedValue(user); m.current.mockResolvedValue([]);
  m.pending.mockImplementation(async ({ where }: { where: { productId?: unknown; telegramMsgId?: string } }) => {
    if (!payment || where.productId === null || (where.telegramMsgId && where.telegramMsgId !== payment.telegramMsgId)) return null;
    return payment;
  });
  m.create.mockImplementation(async ({ data }: { data: Partial<Payment> }) => {
    payment = { id: 'pay1', userId: 'u1', productId: 'p', offerId: 'o', subjectIds: [], plan: 'CATEGORY', duration: 'CUSTOM', amount: 0,
      status: 'PENDING', receiptPhoto: null, telegramMsgId: null, confirmedById: null, confirmedAt: null, selectedSubjects: [], createdAt: now, ...data }; return payment;
  });
  m.update.mockImplementation(async ({ data }: { data: Partial<Payment> }) => Object.assign(payment!, data));
  m.attach.mockImplementation(async ({ data }: { data: Partial<Payment> }) => { Object.assign(payment!, data); return { count: 1 }; });
  m.details.mockImplementation(async () => ({ ...payment, product, offer, user }));
  m.lookup.mockImplementation(async () => ({ ...payment, user }));
  m.transaction.mockImplementation((fn: (client: typeof tx) => Promise<unknown>) => fn(tx));
  m.settings.mockResolvedValue([]); m.setting.mockResolvedValue(null);
  m.item.mockResolvedValue({ id: 'item1', titleUz: 'Item', price: 5000 });
  m.confirm.mockImplementation(async () => ({ payment, alreadyProcessed: false }));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('webhook mahsulot checkout', () => {
  it('webhook siri tekshiriladi', async () => {
    expect((await POST(request({}, 'wrong'))).status).toBe(401); expect(m.products).not.toHaveBeenCalled();
  });
  it.each(['/obuna', '/premium', '/ustoz', '/start buy_teacher_1month', '/start buy_premium_3months'])('%s yangi mahsulotlar ro‘yxatini ochadi', async (text) => {
    expect((await command(text)).status).toBe(200);
    expect(m.products).toHaveBeenCalledWith(expect.objectContaining({ where: { isOnSale: true } }));
    expect(messages().at(-1)?.reply_markup?.inline_keyboard[0][0].text).toBe('Attestatsiya');
    expect(m.create).not.toHaveBeenCalled(); expect(m.upsertSetting).not.toHaveBeenCalled();
  });
  it('eski tarif tugmasi yangi eski-tarif Payment yaratmaydi', async () => {
    await callback('pay_premium_1month'); expect(m.products).toHaveBeenCalled(); expect(m.create).not.toHaveBeenCalled();
  });
  it('faqat nashr etilgan testli fanlar ko‘rsatiladi', async () => {
    await callback(checkoutCallback('p', 'p'));
    expect(messages().at(-1)?.reply_markup?.inline_keyboard.map((row) => row[0].text)).toEqual(['physics', 'math']);
    expect(m.subjects).toHaveBeenCalledWith(expect.objectContaining({ include: { _count: { select: { tests: { where: { isPublished: true, categoryId: 'att' } } } } } }));
    expect(m.create).not.toHaveBeenCalled();
  });
  it('fan tanlangach variantlar chiqadi, hali Payment yaratilmaydi', async () => {
    await callback(checkoutCallback('s', 'p', ['physics']));
    expect(messages().at(-1)?.text).toContain('Muddat'); expect(m.create).not.toHaveBeenCalled();
    expect(m.products).toHaveBeenCalledWith(expect.objectContaining({ include: { offers: expect.objectContaining({ where: { isActive: true } }) } }));
  });
  it('yakuniy summa va karta bosqichida Payment yaratiladi', async () => {
    await finalSelection();
    expect(payment).toMatchObject({ productId: 'p', offerId: 'o', subjectIds: ['physics'], amount: 10000, selectedSubjects: [], status: 'PENDING' });
    expect(m.create.mock.calls[0][0].data).not.toHaveProperty('selectedSubjects');
    expect(messages().at(-1)?.text).toContain('10 000'); expect(messages().at(-1)?.text).toContain('Karta raqami');
    expect(m.upsertSetting).not.toHaveBeenCalled();
  });
  it('ikkinchi fan chegirmasi yaratilganda qotiriladi va qayta bosishda o‘zgarmaydi', async () => {
    m.current.mockResolvedValue([{ productId: 'p', subjectIds: ['math'], isActive: true, startDate: new Date('2026-10-01'), endDate: new Date('2026-12-01') }]);
    await finalSelection(); expect(payment?.amount).toBe(7500);
    m.freshOffer.mockResolvedValue({ ...offer, price: 50000 }); m.current.mockResolvedValue([]);
    await finalSelection(); expect(payment?.amount).toBe(7500); expect(m.create).toHaveBeenCalledTimes(1);
    expect(messages().at(-1)?.text).toContain('7 500');
  });
  it('nofaol va muddati o‘tgan variant yangi to‘lov yaratmaydi', async () => {
    m.freshOffer.mockResolvedValue({ ...offer, isActive: false }); await finalSelection(); expect(m.create).not.toHaveBeenCalled();
    m.freshOffer.mockResolvedValue({ ...offer, durationMonths: null, untilDate: now }); await finalSelection(); expect(m.create).not.toHaveBeenCalled();
  });
  it('DTM ikkita asosiy fan tanlatib uchta majburiyni avtomatik qo‘shadi', async () => {
    const dtm = { ...product, subjectRule: 'DTM_BLOCK' }; m.products.mockResolvedValue([dtm]); m.freshProduct.mockResolvedValue(dtm);
    m.subjects.mockResolvedValue([subject('physics'), subject('math'), subject('m1', 0, true), subject('m2', 0, true), subject('m3', 0, true)]);
    await callback(checkoutCallback('p', 'p')); expect(messages().at(-1)?.text).toContain('m1, m2, m3');
    await callback(checkoutCallback('s', 'p', ['physics'])); expect(messages().at(-1)?.reply_markup?.inline_keyboard.map((row) => row[0].text)).toEqual(['math']);
    await callback(checkoutCallback('o', 'p', ['physics', 'math'], 'o'));
    expect(payment?.subjectIds).toEqual(['m1', 'm2', 'm3', 'math', 'physics']);
  });
  it.each(['NONE', 'BUNDLE'])('%s fan so‘ramaydi', async (rule) => {
    const value = { ...product, ...(rule === 'BUNDLE' ? { kind: 'BUNDLE', categoryId: null } : { subjectRule: 'NONE' }) };
    m.products.mockResolvedValue([value]); m.freshProduct.mockResolvedValue(value);
    await callback(checkoutCallback('p', 'p')); expect(messages().at(-1)?.text).toContain('Muddat');
    await callback(checkoutCallback('o', 'p', [], 'o')); expect(payment?.subjectIds).toEqual([]);
  });
  it('boshqa yoki nashr etilmagan fanni callback bilan kiritib bo‘lmaydi', async () => {
    await callback(checkoutCallback('o', 'p', ['draft'], 'o')); expect(m.create).not.toHaveBeenCalled();
    await callback(checkoutCallback('o', 'p', ['unknown'], 'o')); expect(m.create).not.toHaveBeenCalled();
  });
});

describe('checkout tili', () => {
  const englishTelegram = { ...from, language_code: 'en' };

  it.each(['/obuna', '/premium', '/ustoz', '/start buy', '/start buy_teacher_1month'])('%s Telegram inglizcha bo‘lsa ham profil tilida ochiladi', async (text) => {
    await command(text, englishTelegram);
    expect(messages().at(-1)?.text).toBe(uz.checkout.chooseProduct);
    expect(messages().at(-1)?.reply_markup?.inline_keyboard[0][0].text).toBe('Attestatsiya');
  });

  it.each([null, { ...user, lang: 'unknown' }])('profil tili mavjud bo‘lmasa o‘zbekcha ishlaydi: %j', async (profile) => {
    m.user.mockResolvedValue(profile);
    await command('/obuna', englishTelegram);
    expect(messages().at(-1)?.text).toBe(uz.checkout.chooseProduct);
    await callback(checkoutCallback('o', 'p', ['physics'], 'o'), englishTelegram);
    expect(messages().at(-1)?.text).toContain(uz.checkout.card);
    expect(m.upsertUser).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ lang: 'uz' }) }));
  });

  it.each([
    { lang: 'uz', dictionary: uz.checkout, productName: 'Attestatsiya', offerName: '1 oy' },
    { lang: 'ru', dictionary: ru.checkout, productName: 'Аттестация', offerName: '1 месяц' },
    { lang: 'en', dictionary: en.checkout, productName: 'Attestation', offerName: '1 month' },
  ])('$lang profil tili tarifdan to‘lovgacha saqlanadi', async ({ lang, dictionary, productName, offerName }) => {
    m.user.mockResolvedValue({ ...user, lang });
    const sender = { ...from, language_code: lang === 'en' ? 'uz' : 'en' };
    m.subjects.mockResolvedValue([{ ...subject('physics'), nameUz: 'Fizika', nameRu: 'Физика', nameEn: 'Physics' }]);
    await command('/obuna', sender);
    expect(messages().at(-1)?.text).toBe(dictionary.chooseProduct);
    expect(messages().at(-1)?.reply_markup?.inline_keyboard[0][0].text).toBe(productName);
    await callback(checkoutCallback('p', 'p'), sender);
    expect(messages().at(-1)?.text).toBe(dictionary.chooseSubject);
    expect(messages().at(-1)?.reply_markup?.inline_keyboard[0][0].text).toBe(lang === 'uz' ? 'Fizika' : lang === 'ru' ? 'Физика' : 'Physics');
    await callback(checkoutCallback('s', 'p', ['physics']), sender);
    expect(messages().at(-1)?.text).toBe(dictionary.chooseOffer);
    expect(messages().at(-1)?.reply_markup?.inline_keyboard[0][0].text).toContain(offerName);
    await callback(checkoutCallback('o', 'p', ['physics'], 'o'), sender);
    expect(messages().at(-1)?.text).toContain(dictionary.card);
    expect(messages().at(-1)?.text).toContain(productName);
    await callback('co:list', sender);
    expect(messages().at(-1)?.text).toBe(dictionary.chooseProduct);
  });

  it('saytdan kelgan havola va eskirgan variantdan qaytish profil tilini saqlaydi', async () => {
    await command(`/start ${checkoutStartParameter('p', 'o')}`, englishTelegram);
    expect(messages().at(-1)?.text).toBe(uz.checkout.chooseSubject);
    m.products.mockResolvedValue([{ ...product, offers: [] }]);
    await callback(checkoutCallback('s', 'p', ['physics'], 'o'), englishTelegram);
    expect(messages().at(-1)?.text).toBe(uz.checkout.noProducts);
  });
});

describe('webhook pricing deep link', () => {
  it('ONE: variant fan tanlashda saqlanadi, muddat qayta so‘ralmaydi', async () => {
    await command(`/start ${checkoutStartParameter('p', 'o')}`);
    expect(m.create).not.toHaveBeenCalled();
    const chooseSubject = messages().at(-1)?.reply_markup?.inline_keyboard[0][0].callback_data;
    expect(chooseSubject).toBe(checkoutCallback('s', 'p', ['physics'], 'o'));
    await callback(chooseSubject!);
    expect(payment).toMatchObject({ offerId: 'o', subjectIds: ['physics'], amount: 10000 });
  });
  it('DTM: variant ikkala fan tanlashda ham saqlanadi', async () => {
    m.products.mockResolvedValue([{ ...product, subjectRule: 'DTM_BLOCK' }]);
    m.subjects.mockResolvedValue([subject('physics'), subject('math'), subject('a', 1, true), subject('b', 1, true), subject('c', 1, true)]);
    await command(`/start ${checkoutStartParameter('p', 'o')}`);
    await callback(messages().at(-1)!.reply_markup!.inline_keyboard[0][0].callback_data!);
    expect(m.create).not.toHaveBeenCalled();
    await callback(messages().at(-1)!.reply_markup!.inline_keyboard[0][0].callback_data!);
    expect(payment?.subjectIds).toEqual(['a', 'b', 'c', 'math', 'physics']); expect(payment?.offerId).toBe('o');
  });
  it.each(['NONE', 'BUNDLE'])('%s: mavjud yakuniy summa oqimiga o‘tadi', async (kind) => {
    const selected = { ...product, kind: kind === 'BUNDLE' ? 'BUNDLE' : 'CATEGORY', subjectRule: 'NONE' };
    m.products.mockResolvedValue([selected]); m.freshProduct.mockResolvedValue(selected);
    await command(`/start ${checkoutStartParameter('p', 'o')}`);
    expect(payment).toMatchObject({ offerId: 'o', subjectIds: [], amount: 10000 });
  });
  it.each(['unknown-product', 'unknown-offer', 'inactive', 'expired', 'off-sale', 'malformed'])('%s: mahsulot tanloviga qaytadi', async (state) => {
    let parameter = checkoutStartParameter(state === 'unknown-product' ? 'other' : 'p', state === 'unknown-offer' ? 'other' : 'o');
    if (state === 'inactive') m.products.mockResolvedValue([{ ...product, offers: [{ ...offer, isActive: false }] }]);
    if (state === 'expired') m.products.mockResolvedValue([{ ...product, offers: [{ ...offer, untilDate: now }] }]);
    if (state === 'off-sale') m.products.mockResolvedValue([]);
    if (state === 'malformed') parameter = 'buy_p_bad_value';
    await command(`/start ${parameter}`);
    expect(m.create).not.toHaveBeenCalled(); expect(m.transaction).not.toHaveBeenCalled();
    expect(messages().at(-1)?.text).not.toContain('INVALID');
  });
  it('variant keyin nofaol bo‘lsa fan callback’i ham mahsulot tanloviga qaytadi', async () => {
    await command(`/start ${checkoutStartParameter('p', 'o')}`);
    const data = messages().at(-1)!.reply_markup!.inline_keyboard[0][0].callback_data!;
    m.products.mockResolvedValue([{ ...product, offers: [] }]);
    await callback(data); expect(m.create).not.toHaveBeenCalled();
    expect(messages().at(-1)?.reply_markup?.inline_keyboard).toEqual([]);
  });
});

describe('webhook chek va admin tasdiqlashi', () => {
  it.each(['photo', 'document'])('%s aniq Paymentga biriktiriladi, summa saqlanadi', async (kind) => {
    await finalSelection(); vi.mocked(fetch).mockClear();
    await POST(request({ message: { chat: { id: 123 }, from, message_id: 555, reply_to_message: { message_id: Number(payment?.telegramMsgId) },
      ...(kind === 'photo' ? { photo: [{ file_id: 'file1' }] } : { document: { file_id: 'file1', mime_type: 'application/pdf' } }) } }));
    expect(payment?.receiptPhoto).toContain('receipts/file.jpg'); expect(payment?.amount).toBe(10000);
    const adminMessage = messages().find((msg) => msg.chat_id === 456);
    expect(adminMessage?.reply_markup?.inline_keyboard[0][0].callback_data).toBe('cp:c:pay1');
    expect(adminMessage?.text).toContain('Attestatsiya');
    expect(m.upsertSetting).not.toHaveBeenCalled();
  });
  it('admin tugmasi umumiy atomik tasdiqlashga paymentId yuboradi', async () => {
    await finalSelection(); await callback('cp:c:pay1', { ...from, id: 456 });
    expect(m.confirm).toHaveBeenCalledWith('pay1', 'confirm', 'u1');
  });
  it('admin bo‘lmagan tasdiqlay olmaydi', async () => {
    await finalSelection(); await callback('cp:c:pay1'); expect(m.confirm).not.toHaveBeenCalled();
  });
  it('muddati o‘tgan variant xatosi admin uchun amaliy yo‘lni tushuntiradi', async () => {
    await finalSelection(); m.confirm.mockRejectedValue(new Error('EXPIRED_OFFER'));
    await callback('cp:c:pay1', { ...from, id: 456 });
    expect(messages().at(-1)?.text).toContain('boshqa faol variantini');
  });
  it('eski PENDING webhook tasdiqlashi moslik yo‘liga yuboriladi', async () => {
    m.setting.mockResolvedValue({ value: JSON.stringify({ plan: 'teacher', duration: '1_month', amount: 49000 }) });
    m.legacy.mockResolvedValue({ alreadyProcessed: false });
    await callback('confirm_123', { ...from, id: 456 });
    expect(m.legacy).toHaveBeenCalledWith('123', 'confirm', 'u1'); expect(m.confirm).not.toHaveBeenCalled();
  });
});

describe('bitta test/kurs oqimi regressiyasi', () => {
  it.each(['test', 'course'])('%s havolasi obuna checkoutiga tushmaydi', async (kind) => {
    await command(`/start buy_${kind}_item1`);
    expect(m.products).not.toHaveBeenCalled(); expect(m.create).not.toHaveBeenCalled();
    expect(m.upsertSetting).toHaveBeenCalledWith(expect.objectContaining({ create: { key: 'pending_payment_123', value: expect.stringContaining(`${kind}_purchase`) } }));
  });
  it('yangiroq bitta-test chekini oldingi obunaga biriktirmaydi', async () => {
    await finalSelection();
    m.setting.mockResolvedValue({ value: JSON.stringify({ plan: 'test_purchase', testId: 'item1', testTitle: 'Item', amount: 5000, timestamp: now.getTime() + 1000 }) });
    await POST(request({ message: { chat: { id: 123 }, from, message_id: 555, photo: [{ file_id: 'file1' }] } }));
    expect(m.attach).not.toHaveBeenCalled();
    expect(m.create).toHaveBeenLastCalledWith({ data: expect.objectContaining({ selectedSubjects: ['item1'], amount: 5000, plan: 'PREMIUM' }) });
  });
  it.each(['test', 'course'])('%s tasdiqlashi avvalgidek Purchase yaratadi', async (kind) => {
    m.setting.mockResolvedValue({ value: JSON.stringify({ plan: `${kind}_purchase`, [`${kind}Id`]: 'item1', [`${kind}Title`]: 'Item', amount: 5000 }) });
    await callback('confirm_123', { ...from, id: 456 });
    expect(m.purchase).toHaveBeenCalledWith('u1', kind, 'item1', 'pay1');
    expect(m.confirm).not.toHaveBeenCalled(); expect(m.legacy).not.toHaveBeenCalled();
  });
});
