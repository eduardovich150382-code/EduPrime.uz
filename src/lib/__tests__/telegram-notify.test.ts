import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Token modul yuklanishida o'qiladi — importdan oldin o'rnatiladi.
const m = vi.hoisted(() => {
  process.env.TELEGRAM_BOT_TOKEN = 'test-token';
  return { fetch: vi.fn() };
});
import { notifyViaTelegram, sendUserTelegramNotification } from '../telegram-notify';

const sentText = () => (JSON.parse(m.fetch.mock.calls[0][1].body as string) as { text: string }).text;

beforeEach(() => {
  m.fetch.mockReset().mockResolvedValue({ ok: true, text: async () => '' });
  vi.stubGlobal('fetch', m.fetch);
});
afterEach(() => vi.unstubAllGlobals());

describe('Telegram bildirishnomasi HTML escape', () => {
  it('ommaviy yuborish (notifyViaTelegram) sarlavha va matnni escape qiladi', async () => {
    await notifyViaTelegram('1', '<b>Yangi</b> & test', 'a < b');
    await vi.waitFor(() => expect(m.fetch).toHaveBeenCalledOnce());
    expect(sentText()).toMatch(/^<b>&lt;b&gt;Yangi&lt;\/b&gt; &amp; test<\/b>\n\na &lt; b\n\n<a href="[^"]+">Saytga kirish<\/a>$/);
  });

  it('sendUserTelegramNotification natijani qaytaradi', async () => {
    expect(await sendUserTelegramNotification('1', 'T', 'M', '/tests')).toBe(true);
    expect(sentText()).toMatch(/<a href="[^"]*\/tests">/);
    m.fetch.mockResolvedValue({ ok: false, text: async () => 'Bad Request' });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await sendUserTelegramNotification('1', 'T', 'M')).toBe(false);
  });
});
