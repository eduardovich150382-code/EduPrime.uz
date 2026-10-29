import { db } from './db';
import { checkoutCallback, parseCheckoutStart, resolveCheckoutKey } from './category-checkout';
import { buildSubjectIds, requiredSubjectCount } from './product-offers';
import { paymentTransaction, processSubscriptionPayment } from './subscription-payments';
import { assertOfferOnSale, checkoutSubjects, createCheckoutPayment, hasEnoughSubjects } from './checkout-selection';
import { readPaymentChat, readTelegramPayment } from './checkout-intent';
import { formatTashkentDate } from './date';
import { localizedPath } from './safe-return-path';
import uz from '@/messages/uz.json';
import ru from '@/messages/ru.json';
import en from '@/messages/en.json';
import { logger } from './logger';
import { btn, type InlineButton } from './telegram-buttons';

export type Lang = 'uz' | 'ru' | 'en';
type Options = { reply_markup?: { inline_keyboard: InlineButton[][] } };
export interface Transport {
  send: (chatId: number, text: string, options?: Options) => Promise<unknown>;
  forward: (chatId: number, fromChatId: number, messageId: number) => Promise<void>;
  fileUrl: (fileId: string) => Promise<string | null>;
  settings: () => Promise<{ cardNumber: string; cardOwner: string }>;
  adminIds: string[];
  appUrl?: string;
}
export interface CheckoutUser { id: number; username?: string; first_name?: string; language_code?: string }
interface ReceiptMessage { chat: { id: number }; from: CheckoutUser; message_id: number; reply_to_message?: { message_id: number }; photo?: { file_id: string }[]; document?: { file_id: string; mime_type?: string } }

export const dictionaries = { uz: uz.checkout, ru: ru.checkout, en: en.checkout };
export const language = (value?: string | null): Lang => value === 'ru' || value === 'en' ? value : 'uz';
async function checkoutLanguage(telegramId: number): Promise<Lang> {
  // Telegram ilovasi tili foydalanuvchining saytdagi til tanlovini almashtirmasin.
  const user = await db.user.findUnique({ where: { telegramId: String(telegramId) }, select: { lang: true } });
  return language(user?.lang);
}
export const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function name(row: { nameUz: string; nameRu: string; nameEn: string }, lang: Lang) { return row[lang === 'uz' ? 'nameUz' : lang === 'ru' ? 'nameRu' : 'nameEn']; }
function label(row: { labelUz: string; labelRu: string; labelEn: string }, lang: Lang) { return row[lang === 'uz' ? 'labelUz' : lang === 'ru' ? 'labelRu' : 'labelEn']; }

async function catalog() {
  return db.product.findMany({ where: { isOnSale: true }, include: { offers: { where: { isActive: true }, orderBy: [{ order: 'asc' }, { id: 'asc' }] } }, orderBy: [{ order: 'asc' }, { id: 'asc' }] });
}

export async function showCheckoutProducts(chatId: number, transport: Transport) {
  const lang = await checkoutLanguage(chatId), t = dictionaries[lang];
  const products = await catalog();
  const rows = products.filter((p) => p.offers.some((o) => o.untilDate === null || o.untilDate > new Date()));
  await transport.send(chatId, rows.length ? t.chooseProduct : t.noProducts, { reply_markup: { inline_keyboard: rows.map((p) => [btn.primary(name(p, lang), { callback_data: checkoutCallback('p', p.id) })]) } });
}

export async function startSelectedCheckout(chatId: number, from: CheckoutUser, parameter: string, transport: Transport) {
  const keys = parseCheckoutStart(parameter);
  if (!keys) { await showCheckoutProducts(chatId, transport); return; }
  await handleCheckoutCallback(chatId, from, `co:p:${keys.productKey}::${keys.offerKey}`, transport);
}

async function details(paymentId: string, lang: Lang) {
  const payment = await db.payment.findUniqueOrThrow({ where: { id: paymentId }, include: { product: true, offer: true, user: true } });
  const subjects = await db.subject.findMany({ where: { id: { in: payment.subjectIds } }, orderBy: [{ order: 'asc' }, { id: 'asc' }] });
  const t = dictionaries[lang];
  const text = `${t.product}: <b>${escape(payment.product ? name(payment.product, lang) : payment.plan)}</b>\n` +
    (subjects.length ? `${t.subjects}: ${subjects.map((s) => escape(name(s, lang))).join(', ')}\n` : '') +
    `${t.offer}: ${escape(payment.offer ? label(payment.offer, lang) : payment.duration)}\n` +
    `${t.amount}: <b>${payment.amount.toLocaleString('uz-UZ')} ${t.currency}</b>`;
  return { payment, text };
}

export async function sendPaymentInstructions(chatId: number, paymentId: string, lang: Lang, transport: Transport, prompt: string) {
  const t = dictionaries[lang];
  const { cardNumber, cardOwner } = await transport.settings();
  const summary = await details(paymentId, lang);
  const sent = await transport.send(chatId, `${summary.text}\n\n${t.card}: <code>${escape(cardNumber)}</code>\n${t.owner}: ${escape(cardOwner)}\n\n${prompt}`);
  if (typeof sent === 'object' && sent !== null && 'result' in sent && typeof sent.result === 'object' && sent.result !== null && 'message_id' in sent.result) {
    await db.payment.update({ where: { id: paymentId }, data: { telegramMsgId: String(sent.result.message_id) } });
  }
}

// Foydalanuvchi qaysi doira ochilganini va qachongacha ekanini darhol ko'rsin,
// saytga qaytish tugmasi esa o'sha kategoriya sahifasiga olib borsin.
async function activationMessage(paymentId: string, lang: Lang, appUrl?: string): Promise<{ text: string; options?: Options }> {
  const t = dictionaries[lang];
  const subscription = await db.subscription.findFirst({ where: { paymentId }, include: { product: true, category: { select: { type: true } } } });
  if (!subscription?.product) return { text: t.confirmed };
  const subjects = subscription.subjectIds.length ? await db.subject.findMany({ where: { id: { in: subscription.subjectIds } }, orderBy: [{ order: 'asc' }, { id: 'asc' }] }) : [];
  const scope = [name(subscription.product, lang), ...(subjects.length ? [subjects.map((s) => name(s, lang)).join(', ')] : [])].join(' · ');
  const text = t.activated.replace('{scope}', escape(scope)).replace('{date}', formatTashkentDate(subscription.endDate, lang));
  if (!appUrl) return { text };
  const path = subscription.category?.type === 'ATTESTATION' ? '/attestation' : '/dashboard';
  return { text, options: { reply_markup: { inline_keyboard: [[btn.success(t.openSite, { url: `${appUrl}${localizedPath(path, lang)}` })]] } } };
}

export async function handleCheckoutCallback(chatId: number, from: CheckoutUser, data: string, transport: Transport): Promise<boolean> {
  if (!data.startsWith('co:') && !data.startsWith('cp:')) return false;
  const lang = await checkoutLanguage(from.id), t = dictionaries[lang];
  try {
    if (data.startsWith('cp:')) {
      if (!transport.adminIds.includes(String(from.id))) { await transport.send(chatId, t.adminOnly); return true; }
      const [, action, paymentId] = data.split(':');
      if (!paymentId || !['c', 'r'].includes(action)) throw new Error('INVALID_SELECTION');
      const target = await db.payment.findUnique({ where: { id: paymentId }, include: { user: true } });
      if (!target?.productId) throw new Error('INVALID_SELECTION');
      const admin = await db.user.findUnique({ where: { telegramId: String(from.id) }, select: { id: true } });
      const result = await processSubscriptionPayment(paymentId, action === 'c' ? 'confirm' : 'reject', admin?.id ?? null);
      const text = action === 'c' ? t.confirmed : t.rejected;
      await transport.send(chatId, result.alreadyProcessed ? t.alreadyProcessed : text);
      // Sayt niyatidan kelgan to'lovda chek yuborgan chat Payment egasining telegramId'sidan farq qilishi mumkin.
      const notifyChat = await readPaymentChat(paymentId) ?? target.user.telegramId;
      if (!result.alreadyProcessed && notifyChat) {
        const userLang = language(target.user.lang);
        const message = action === 'c' ? await activationMessage(paymentId, userLang, transport.appUrl) : { text: dictionaries[userLang].rejected };
        await transport.send(Number(notifyChat), message.text, message.options);
      }
      return true;
    }
    if (chatId !== from.id) throw new Error('INVALID_SELECTION');
    if (data === 'co:list') { await showCheckoutProducts(chatId, transport); return true; }
    const [, step, productKey, chosenKeys = '', offerKey] = data.split(':');
    if (!['p', 's', 'o'].includes(step)) throw new Error('INVALID_SELECTION');
    const product = resolveCheckoutKey(await catalog(), productKey);
    if (!product.isOnSale) throw new Error('INVALID_SELECTION');
    const selectedOffer = offerKey ? resolveCheckoutKey(product.offers, offerKey) : null;
    if (selectedOffer) assertOfferOnSale(selectedOffer);
    const { subjects, available, mandatory } = await checkoutSubjects(product);
    const chosen = chosenKeys ? chosenKeys.split(',').map((key) => resolveCheckoutKey(available, key).id) : [];
    const needed = requiredSubjectCount(product);
    if (new Set(chosen).size !== chosen.length || chosen.length > needed) throw new Error('INVALID_SELECTION');
    if (!hasEnoughSubjects(product, available, mandatory)) { await transport.send(chatId, t.noSubjects); return true; }
    if (chosen.length < needed) {
      const text = (needed === 2 ? t.chooseTwo : t.chooseSubject) + (chosen.length ? `\n${chosen.map((id) => escape(name(subjects.find((s) => s.id === id)!, lang))).join(', ')}` : '') +
        (needed === 2 ? `\n${t.mandatory}: ${mandatory.map((s) => escape(name(s, lang))).join(', ')}` : '');
      await transport.send(chatId, text, { reply_markup: { inline_keyboard: available.filter((s) => !chosen.includes(s.id)).map((s) => [btn.primary(name(s, lang), { callback_data: checkoutCallback('s', product.id, [...chosen, s.id], selectedOffer?.id) })]) } });
      return true;
    }
    const subjectIds = buildSubjectIds(product, chosen, subjects).sort();
    if (step !== 'o' && !selectedOffer) {
      const offers = product.offers.filter((o) => !o.untilDate || o.untilDate > new Date());
      await transport.send(chatId, t.chooseOffer, { reply_markup: { inline_keyboard: offers.map((o) => [btn.primary(`${label(o, lang)} — ${o.price.toLocaleString('uz-UZ')} ${t.currency}`, { callback_data: checkoutCallback('o', product.id, chosen, o.id) })]) } });
      return true;
    }
    const offer = resolveCheckoutKey(product.offers, offerKey);
    const payment = await paymentTransaction(async (tx) => {
      const user = await tx.user.upsert({ where: { telegramId: String(from.id) }, update: {}, create: { telegramId: String(from.id), telegramUsername: from.username, name: from.first_name || from.username || 'Telegram User', lang } });
      return createCheckoutPayment(tx, { userId: user.id, productId: product.id, offerId: offer.id, subjectIds });
    });
    await sendPaymentInstructions(chatId, payment.id, lang, transport, t.receiptPrompt);
  } catch (error) {
    logger.error('Category checkout error', { error });
    // Saytdan kelgan variant sotuvdan olingan bo'lsa tanlovni qayta ochamiz.
    if (data.startsWith('co:') && data.split(':')[4]) {
      await showCheckoutProducts(chatId, transport);
      return true;
    }
    await transport.send(chatId, error instanceof Error && error.message === 'EXPIRED_OFFER' ? t.expired : t.invalid);
  }
  return true;
}

export async function handleCheckoutReceipt(message: ReceiptMessage, transport: Transport): Promise<boolean> {
  if (message.chat.id !== message.from.id) return false;
  const telegramId = String(message.from.id);
  const [user, intentPaymentId] = await Promise.all([db.user.findUnique({ where: { telegramId } }), readTelegramPayment(telegramId)]);
  if (!user && !intentPaymentId) return false;
  const replyId = message.reply_to_message?.message_id;
  // Sayt niyatidagi to'lov boshqa akkauntga yozilgan bo'lishi mumkin — u faqat shu chat yo'naltirgichi orqali topiladi.
  const owners = [...(user ? [{ userId: user.id }] : []), ...(intentPaymentId ? [{ id: intentPaymentId }] : [])];
  const payment = await db.payment.findFirst({ where: { OR: owners, productId: { not: null }, status: 'PENDING', ...(replyId ? { telegramMsgId: String(replyId) } : {}) }, orderBy: { createdAt: 'desc' } });
  if (!payment) return false;
  if (!replyId) {
    // Bitta-test/kursning mavjud cheki yangi obunaga adashib biriktirilmasin.
    const legacy = await db.systemSetting.findUnique({ where: { key: `pending_payment_${message.from.id}` } });
    if (legacy) { const state: unknown = JSON.parse(legacy.value); if (typeof state === 'object' && state !== null && 'timestamp' in state && Number(state.timestamp) > payment.createdAt.getTime()) return false; }
  }
  const owner = user?.id === payment.userId ? user : await db.user.findUnique({ where: { id: payment.userId } });
  const lang = language(owner?.lang), t = dictionaries[lang];
  if (message.document?.mime_type && !['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(message.document.mime_type)) { await transport.send(message.chat.id, t.receiptPrompt); return true; }
  const fileId = message.document?.file_id ?? message.photo?.at(-1)?.file_id;
  const receiptPhoto = fileId ? await transport.fileUrl(fileId) : null;
  if (!receiptPhoto) { await transport.send(message.chat.id, t.receiptPrompt); return true; }
  const updated = await db.payment.updateMany({ where: { id: payment.id, userId: payment.userId, status: 'PENDING' }, data: { receiptPhoto } });
  if (!updated.count) { await transport.send(message.chat.id, t.alreadyProcessed); return true; }
  const summary = await details(payment.id, 'uz');
  const payer = summary.payment.user;
  // Admin to'lov qaysi sayt akkauntini ochishini va chek boshqa Telegram'dan kelganini ko'rsin.
  const identity = `${escape(payer.name ?? '')} (@${escape(payer.telegramUsername ?? message.from.username ?? '')})` +
    (payer.email ? `\n${escape(payer.email)}` : '') + (payer.telegramId !== telegramId ? `\n${uz.checkout.telegramMismatch}` : '');
  for (const adminId of transport.adminIds) {
    try {
      await transport.forward(Number(adminId), message.chat.id, message.message_id);
      await transport.send(Number(adminId), `${uz.checkout.newReceipt}\n${identity}\n${summary.text}`, { reply_markup: { inline_keyboard: [[
        btn.success(uz.checkout.confirm, { callback_data: `cp:c:${payment.id}` }), btn.danger(uz.checkout.reject, { callback_data: `cp:r:${payment.id}` }),
      ]] } });
    } catch (error) { logger.error('Category receipt notification error', { error }); }
  }
  await transport.send(message.chat.id, t.receiptAccepted);
  return true;
}
