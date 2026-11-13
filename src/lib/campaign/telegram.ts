import { logger } from '../logger';

// Bot API chaqiruvi javobi bilan: cron 403 (bot bloklangan) va 429
// (`retry_after`) ni ajrata olishi kerak. Hech qachon throw qilmaydi.

export type TelegramResult = {
  ok: boolean;
  error_code?: number;
  description?: string;
  parameters?: { retry_after?: number };
  /** Muvaffaqiyatli javob tanasi (masalan, yuborilgan xabar) — kanal postining message_id si shundan olinadi. */
  result?: unknown;
};

export async function telegramApi(botToken: string, method: string, body: unknown): Promise<TelegramResult> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const data: unknown = await response.json();
    if (typeof data !== 'object' || data === null) return { ok: false, description: 'invalid response' };
    const record = data as TelegramResult;
    return {
      ok: record.ok === true,
      error_code: typeof record.error_code === 'number' ? record.error_code : undefined,
      description: typeof record.description === 'string' ? record.description : undefined,
      parameters: typeof record.parameters?.retry_after === 'number' ? { retry_after: record.parameters.retry_after } : undefined,
      result: record.result,
    };
  } catch (error) {
    logger.error(`Telegram ${method} error:`, { error });
    return { ok: false, description: 'network error' };
  }
}
