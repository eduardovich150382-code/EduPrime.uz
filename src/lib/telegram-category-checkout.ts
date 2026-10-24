import { db } from './db';
import { checkoutCallback, checkoutPrice, parseCheckoutStart, resolveCheckoutKey } from './category-checkout';
import { buildSubjectIds, computeEndDate } from './product-offers';
import { paymentTransaction, processSubscriptionPayment } from './subscription-payments';
import uz from '@/messages/uz.json';
import ru from '@/messages/ru.json';
import en from '@/messages/en.json';
import { logger } from './logger';

type Lang = 'uz' | 'ru' | 'en';
type Button = { text: string; callback_data: string };
type Options = { reply_markup?: { inline_keyboard: Button[][] } };
interface Transport {
  send: (chatId: number, text: string, options?: Options) => Promise<unknown>;
  forward: (chatId: number, fromChatId: number, messageId: number) => Promise<void>;
  fileUrl: (fileId: string) => Promise<string | null>;
  settings: () => Promise<{ cardNumber: string; cardOwner: string }>;
  adminIds: string[];
}
export interface CheckoutUser { id: number; username?: string; first_name?: string; language_code?: string }
interface ReceiptMessage { chat: { id: number }; from: CheckoutUser; message_id: number; reply_to_message?: { message_id: number }; photo?: { file_id: string }[]; document?: { file_id: string; mime_type?: string } }

const dictionaries = { uz: uz.checkout, ru: ru.checkout, en: en.checkout };
const language = (value?: string): Lang => value === 'ru' || value === 'en' ? value : 'uz';
const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function name(row: { nameUz: string; nameRu: string; nameEn: string }, lang: Lang) { return row[lang === 'uz' ? 'nameUz' : lang === 'ru' ? 'nameRu' : 'nameEn']; }
function label(row: { labelUz: string; labelRu: string; labelEn: string }, lang: Lang) { return row[lang === 'uz' ? 'labelUz' : lang === 'ru' ? 'labelRu' : 'labelEn']; }

async function catalog() {
  return db.product.findMany({ where: { isOnSale: true }, include: { offers: { where: { isActive: true }, orderBy: [{ order: 'asc' }, { id: 'asc' }] } }, orderBy: [{ order: 'asc' }, { id: 'asc' }] });
}

export async function showCheckoutProducts(chatId: number, transport: Transport, langValue?: string) {
  const lang = language(langValue), t = dictionaries[lang];
  const products = await catalog();
  const rows = products.filter((p) => p.offers.some((o) => o.untilDate === null || o.untilDate > new Date()));
  await transport.send(chatId, rows.length ? t.chooseProduct : t.noProducts, { reply_markup: { inline_keyboard: rows.map((p) => [{ text: name(p, lang), callback_data: checkoutCallback('p', p.id) }]) } });
}

export async function startSelectedCheckout(chatId: number, from: CheckoutUser, parameter: string, transport: Transport) {
  const keys = parseCheckoutStart(parameter);
  if (!keys) { await showCheckoutProducts(chatId, transport, from.language_code); return; }
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

export async function handleCheckoutCallback(chatId: number, from: CheckoutUser, data: string, transport: Transport): Promise<boolean> {
  if (!data.startsWith('co:') && !data.startsWith('cp:')) return false;
  const lang = language(from.language_code), t = dictionaries[lang];
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
      if (!result.alreadyProcessed && target.user.telegramId) await transport.send(Number(target.user.telegramId), dictionaries[language(target.user.lang)][action === 'c' ? 'confirmed' : 'rejected']);
      return true;
    }
    if (chatId !== from.id) throw new Error('INVALID_SELECTION');
    if (data === 'co:list') { await showCheckoutProducts(chatId, transport, lang); return true; }
    const [, step, productKey, chosenKeys = '', offerKey] = data.split(':');
    if (!['p', 's', 'o'].includes(step)) throw new Error('INVALID_SELECTION');
    const product = resolveCheckoutKey(await catalog(), productKey);
    if (!product.isOnSale) throw new Error('INVALID_SELECTION');
    const selectedOffer = offerKey ? resolveCheckoutKey(product.offers, offerKey) : null;
    if (selectedOffer && (!selectedOffer.isActive || (selectedOffer.untilDate && selectedOffer.untilDate <= new Date()))) throw new Error('EXPIRED_OFFER');
    const subjects = product.categoryId ? await db.subject.findMany({ where: { categoryId: product.categoryId },
      include: { _count: { select: { tests: { where: { isPublished: true, categoryId: product.categoryId } } } } }, orderBy: [{ order: 'asc' }, { id: 'asc' }] }) : [];
    const available = subjects.filter((s) => s._count.tests > 0 && (product.subjectRule !== 'DTM_BLOCK' || !s.isMandatory));
    const chosen = chosenKeys ? chosenKeys.split(',').map((key) => resolveCheckoutKey(available, key).id) : [];
    const needed = product.kind === 'BUNDLE' || product.subjectRule === 'NONE' ? 0 : product.subjectRule === 'ONE' ? 1 : 2;
    if (new Set(chosen).size !== chosen.length || chosen.length > needed) throw new Error('INVALID_SELECTION');
    const mandatory = subjects.filter((s) => s.isMandatory);
    if (available.length < needed || (product.subjectRule === 'DTM_BLOCK' && mandatory.length !== 3)) { await transport.send(chatId, t.noSubjects); return true; }
    if (chosen.length < needed) {
      const text = (needed === 2 ? t.chooseTwo : t.chooseSubject) + (chosen.length ? `\n${chosen.map((id) => escape(name(subjects.find((s) => s.id === id)!, lang))).join(', ')}` : '') +
        (needed === 2 ? `\n${t.mandatory}: ${mandatory.map((s) => escape(name(s, lang))).join(', ')}` : '');
      await transport.send(chatId, text, { reply_markup: { inline_keyboard: available.filter((s) => !chosen.includes(s.id)).map((s) => [{ text: name(s, lang), callback_data: checkoutCallback('s', product.id, [...chosen, s.id], selectedOffer?.id) }]) } });
      return true;
    }
    const subjectIds = buildSubjectIds(product, chosen, subjects).sort();
    if (step !== 'o' && !selectedOffer) {
      const offers = product.offers.filter((o) => !o.untilDate || o.untilDate > new Date());
      await transport.send(chatId, t.chooseOffer, { reply_markup: { inline_keyboard: offers.map((o) => [{ text: `${label(o, lang)} — ${o.price.toLocaleString('uz-UZ')} ${t.currency}`, callback_data: checkoutCallback('o', product.id, chosen, o.id) }]) } });
      return true;
    }
    const offer = resolveCheckoutKey(product.offers, offerKey);
    const payment = await paymentTransaction(async (tx) => {
      // Narx ham, chegirma huquqi ham aynan Payment yaratilgan paytda olinadi.
      const [freshProduct, freshOffer] = await Promise.all([
        tx.product.findUniqueOrThrow({ where: { id: product.id } }), tx.productOffer.findUniqueOrThrow({ where: { id: offer.id } }),
      ]);
      if (!freshProduct.isOnSale || !freshOffer.isActive || freshOffer.productId !== product.id) throw new Error('INVALID_SELECTION');
      const user = await tx.user.upsert({ where: { telegramId: String(from.id) }, update: {}, create: { telegramId: String(from.id), telegramUsername: from.username, name: from.first_name || from.username || 'Telegram User', lang } });
      const existing = await tx.payment.findFirst({ where: { userId: user.id, productId: product.id, offerId: offer.id, subjectIds: { equals: subjectIds }, status: 'PENDING', receiptPhoto: null }, orderBy: { createdAt: 'desc' } });
      if (existing) return existing;
      const now = new Date(); computeEndDate(freshOffer, now);
      const active = await tx.subscription.findMany({ where: { userId: user.id, productId: product.id, isActive: true, endDate: { gt: now } } });
      const amount = checkoutPrice(freshOffer.price, freshProduct.secondSubjectDiscountPct, product.id, subjectIds, active, now);
      return tx.payment.create({ data: { userId: user.id, productId: product.id, offerId: offer.id, subjectIds, amount, plan: product.kind === 'BUNDLE' ? 'BUNDLE' : 'CATEGORY', duration: 'CUSTOM' } });
    });
    const { cardNumber, cardOwner } = await transport.settings();
    const summary = await details(payment.id, lang);
    const sent = await transport.send(chatId, `${summary.text}\n\n${t.card}: <code>${escape(cardNumber)}</code>\n${t.owner}: ${escape(cardOwner)}\n\n${t.receiptPrompt}`);
    if (typeof sent === 'object' && sent !== null && 'result' in sent && typeof sent.result === 'object' && sent.result !== null && 'message_id' in sent.result) {
      await db.payment.update({ where: { id: payment.id }, data: { telegramMsgId: String(sent.result.message_id) } });
    }
  } catch (error) {
    logger.error('Category checkout error', { error });
    // Saytdan kelgan variant sotuvdan olingan bo'lsa tanlovni qayta ochamiz.
    if (data.startsWith('co:') && data.split(':')[4]) {
      await showCheckoutProducts(chatId, transport, lang);
      return true;
    }
    await transport.send(chatId, error instanceof Error && error.message === 'EXPIRED_OFFER' ? t.expired : t.invalid);
  }
  return true;
}

export async function handleCheckoutReceipt(message: ReceiptMessage, transport: Transport): Promise<boolean> {
  if (message.chat.id !== message.from.id) return false;
  const user = await db.user.findUnique({ where: { telegramId: String(message.from.id) } });
  if (!user) return false;
  const replyId = message.reply_to_message?.message_id;
  const payment = await db.payment.findFirst({ where: { userId: user.id, productId: { not: null }, status: 'PENDING', ...(replyId ? { telegramMsgId: String(replyId) } : {}) }, orderBy: { createdAt: 'desc' } });
  if (!payment) return false;
  if (!replyId) {
    // Bitta-test/kursning mavjud cheki yangi obunaga adashib biriktirilmasin.
    const legacy = await db.systemSetting.findUnique({ where: { key: `pending_payment_${message.from.id}` } });
    if (legacy) { const state: unknown = JSON.parse(legacy.value); if (typeof state === 'object' && state !== null && 'timestamp' in state && Number(state.timestamp) > payment.createdAt.getTime()) return false; }
  }
  const lang = language(user.lang), t = dictionaries[lang];
  if (message.document?.mime_type && !['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(message.document.mime_type)) { await transport.send(message.chat.id, t.receiptPrompt); return true; }
  const fileId = message.document?.file_id ?? message.photo?.at(-1)?.file_id;
  const receiptPhoto = fileId ? await transport.fileUrl(fileId) : null;
  if (!receiptPhoto) { await transport.send(message.chat.id, t.receiptPrompt); return true; }
  const updated = await db.payment.updateMany({ where: { id: payment.id, userId: user.id, status: 'PENDING' }, data: { receiptPhoto } });
  if (!updated.count) { await transport.send(message.chat.id, t.alreadyProcessed); return true; }
  const summary = await details(payment.id, 'uz');
  for (const adminId of transport.adminIds) {
    try {
      await transport.forward(Number(adminId), message.chat.id, message.message_id);
      await transport.send(Number(adminId), `${uz.checkout.newReceipt}\n${escape(user.name ?? '')} (@${escape(user.telegramUsername ?? '')})\n${summary.text}`, { reply_markup: { inline_keyboard: [[
        { text: uz.checkout.confirm, callback_data: `cp:c:${payment.id}` }, { text: uz.checkout.reject, callback_data: `cp:r:${payment.id}` },
      ]] } });
    } catch (error) { logger.error('Category receipt notification error', { error }); }
  }
  await transport.send(message.chat.id, t.receiptAccepted);
  return true;
}
