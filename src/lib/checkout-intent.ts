import { randomBytes } from 'crypto';
import { z } from 'zod';
import { db } from './db';

// Saytdan kirgan foydalanuvchi "Sotib olish" bosganda tanlov serverda
// qotiriladi va botga faqat tasodifiy token boradi. Migratsiyasiz —
// SystemSetting'da; Telegram'da to'lov aynan shu userId ga yoziladi.
export const INTENT_TTL_MS = 60 * 60 * 1000;
export const BOT_START_URL = 'https://t.me/EduPrimeuzbot?start=';

const START_PATTERN = /^ci_([A-Za-z0-9_-]{32})$/;

// 24 bayt (192 bit) taxmin qilib bo'lmaydi; base64url 32 belgi beradi va
// "ci_" bilan birga Telegram start chegarasiga (≤64, [A-Za-z0-9_-]) sig'adi.
export function createIntentToken(): string { return randomBytes(24).toString('base64url'); }

export function intentStartParameter(token: string): string { return `ci_${token}`; }

export function parseIntentStart(value: string): string | null {
  return START_PATTERN.exec(value)?.[1] ?? null;
}

export const intentKey = (token: string) => `checkout_intent_${token}`;
// Ziddiyatli holatda Payment egasining telegramId'si chek yuborgan chatga mos
// kelmaydi — chek va tasdiq xabari shu ikki yo'naltirgich orqali topiladi.
export const telegramPaymentKey = (telegramId: string) => `checkout_tg_${telegramId}`;
export const paymentChatKey = (paymentId: string) => `checkout_chat_${paymentId}`;

const intentSchema = z.object({
  userId: z.string().min(1), productId: z.string().min(1), offerId: z.string().min(1), subjectIds: z.array(z.string()),
  createdAt: z.number().int(), telegramId: z.string().optional(), paymentId: z.string().optional(),
});
export type CheckoutIntent = z.infer<typeof intentSchema>;

function parseJson<T>(value: string, schema: z.ZodType<T>): T | null {
  try {
    const parsed = schema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : null;
  } catch { return null; }
}

export function parseIntent(value: string): CheckoutIntent | null { return parseJson(value, intentSchema); }

export function isIntentExpired(intent: Pick<CheckoutIntent, 'createdAt'>, now = Date.now()): boolean {
  return now - intent.createdAt >= INTENT_TTL_MS;
}

export async function saveIntent(token: string, intent: CheckoutIntent) {
  await db.systemSetting.create({ data: { key: intentKey(token), value: JSON.stringify(intent) } });
}

const pointerSchema = z.object({ paymentId: z.string().min(1) });
const chatSchema = z.object({ telegramId: z.string().min(1) });

export async function readTelegramPayment(telegramId: string): Promise<string | null> {
  const row = await db.systemSetting.findUnique({ where: { key: telegramPaymentKey(telegramId) } });
  return row ? parseJson(row.value, pointerSchema)?.paymentId ?? null : null;
}

export async function readPaymentChat(paymentId: string): Promise<string | null> {
  const row = await db.systemSetting.findUnique({ where: { key: paymentChatKey(paymentId) } });
  return row ? parseJson(row.value, chatSchema)?.telegramId ?? null : null;
}
