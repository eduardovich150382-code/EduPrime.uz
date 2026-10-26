import type { Prisma } from '@prisma/client';
import { db } from './db';
import { paymentTransaction } from './subscription-payments';
import { createCheckoutPayment } from './checkout-selection';
import { intentKey, isIntentExpired, parseIntent, parseIntentStart, paymentChatKey, telegramPaymentKey } from './checkout-intent';
import { dictionaries, escape, language, sendPaymentInstructions, showCheckoutProducts, type CheckoutUser, type Transport } from './telegram-category-checkout';
import uz from '@/messages/uz.json';
import { logger } from './logger';

interface Conflict { holderId: string; holderHasData: boolean }
type Claim =
  | { kind: 'expired' }
  | { kind: 'existing'; paymentId: string; lang: string | null }
  | { kind: 'created'; paymentId: string; lang: string; site: { id: string; email: string | null }; conflict: Conflict | null };

async function upsertSetting(tx: Prisma.TransactionClient, key: string, value: object) {
  await tx.systemSetting.upsert({ where: { key }, update: { value: JSON.stringify(value) }, create: { key, value: JSON.stringify(value) } });
}

// Serializable tranzaksiya ichida: ikki marta tez bosish bitta niyatdan ikkita
// Payment yaratmasin va niyat faqat bitta Telegram akkauntga bog'lansin.
async function claimIntent(tx: Prisma.TransactionClient, token: string, from: CheckoutUser): Promise<Claim> {
  const key = intentKey(token), telegramId = String(from.id);
  const row = await tx.systemSetting.findUnique({ where: { key } });
  const intent = row ? parseIntent(row.value) : null;
  if (!intent || (intent.telegramId && intent.telegramId !== telegramId)) return { kind: 'expired' };
  if (isIntentExpired(intent)) { await tx.systemSetting.delete({ where: { key } }); return { kind: 'expired' }; }
  if (intent.paymentId) {
    const owner = await tx.user.findUnique({ where: { id: intent.userId }, select: { lang: true } });
    return { kind: 'existing', paymentId: intent.paymentId, lang: owner?.lang ?? null };
  }
  const site = await tx.user.findUnique({ where: { id: intent.userId } });
  if (!site) { await tx.systemSetting.delete({ where: { key } }); return { kind: 'expired' }; }
  const holder = await tx.user.findUnique({ where: { telegramId } });
  let conflict: Conflict | null = null;
  if (!site.telegramId && !holder) {
    await tx.user.update({ where: { id: site.id }, data: { telegramId, telegramUsername: site.telegramUsername ?? from.username } });
  } else if (holder && holder.id !== site.id) {
    // Avtomatik birlashtirish yoki o'chirish yo'q: holder'da ma'lumot borligini
    // admin bilsin, akkauntlar qo'lda hal qilinadi.
    const [payments, subscriptions, results] = await Promise.all([
      tx.payment.count({ where: { userId: holder.id, status: 'CONFIRMED' } }),
      tx.subscription.count({ where: { userId: holder.id } }),
      tx.testResult.count({ where: { userId: holder.id } }),
    ]);
    conflict = { holderId: holder.id, holderHasData: payments + subscriptions + results > 0 };
  }
  // telegramId bo'yicha upsert emas — to'lov saytdagi aynan shu akkauntni ochishi kerak.
  const payment = await createCheckoutPayment(tx, { userId: site.id, productId: intent.productId, offerId: intent.offerId, subjectIds: intent.subjectIds });
  await tx.systemSetting.update({ where: { key }, data: { value: JSON.stringify({ ...intent, telegramId, paymentId: payment.id }) } });
  await upsertSetting(tx, telegramPaymentKey(telegramId), { paymentId: payment.id });
  await upsertSetting(tx, paymentChatKey(payment.id), { telegramId });
  return { kind: 'created', paymentId: payment.id, lang: site.lang, site: { id: site.id, email: site.email }, conflict };
}

export async function startIntentCheckout(chatId: number, from: CheckoutUser, parameter: string, transport: Transport) {
  const token = parseIntentStart(parameter);
  let claim: Claim = { kind: 'expired' };
  if (token && chatId === from.id) {
    try { claim = await paymentTransaction((tx) => claimIntent(tx, token, from)); }
    catch (error) { logger.error('Checkout intent error', { error }); }
  }
  if (claim.kind === 'expired') {
    const user = await db.user.findUnique({ where: { telegramId: String(from.id) }, select: { lang: true } });
    await transport.send(chatId, dictionaries[language(user?.lang)].intentExpired);
    await showCheckoutProducts(chatId, transport);
    return;
  }
  const lang = language(claim.lang), t = dictionaries[lang];
  if (claim.kind === 'existing') {
    const payment = await db.payment.findUnique({ where: { id: claim.paymentId }, select: { status: true, receiptPhoto: true } });
    if (payment?.status === 'PENDING' && !payment.receiptPhoto) await sendPaymentInstructions(chatId, claim.paymentId, lang, transport, t.intentReceiptPrompt);
    else await transport.send(chatId, payment?.status === 'PENDING' ? t.receiptAccepted : t.alreadyProcessed);
    return;
  }
  await sendPaymentInstructions(chatId, claim.paymentId, lang, transport, t.intentReceiptPrompt);
  if (claim.conflict) {
    const text = `${uz.checkout.intentConflict}\n${uz.checkout.intentConflictSite}: ${escape(claim.site.email ?? claim.site.id)}\n` +
      `${uz.checkout.intentConflictHolder}: ${escape(claim.conflict.holderId)} (Telegram ${from.id}) — ${claim.conflict.holderHasData ? uz.checkout.holderHasData : uz.checkout.holderEmpty}`;
    for (const adminId of transport.adminIds) {
      try { await transport.send(Number(adminId), text); } catch (error) { logger.error('Checkout intent conflict notification error', { error }); }
    }
  }
}
