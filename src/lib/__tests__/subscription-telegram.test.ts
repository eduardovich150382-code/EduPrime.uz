import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock('../logger', () => ({ logger: { error: m.error } }));
import { sendSubscriptionTelegram } from '../subscription-telegram';
const fetchMock = vi.fn();
beforeEach(() => { vi.resetAllMocks(); vi.stubGlobal('fetch', fetchMock); vi.stubEnv('TELEGRAM_BOT_TOKEN', 'test-token'); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('Telegram yetkazish', () => {
  it.each([new Error('network'), null])('tarmoq yoki HTTP xatosida qayta urinish yo‘q', async (error) => {
    if (error) fetchMock.mockRejectedValue(error);
    else fetchMock.mockResolvedValue({ ok: false, status: 403 });
    await expect(sendSubscriptionTelegram('123', 'Message')).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledOnce(); expect(m.error).toHaveBeenCalledOnce();
    expect(JSON.stringify(m.error.mock.calls)).not.toContain('test-token');
  });
  it('nomdagi Markdown belgilariga parse mode ta’sir qilmaydi', async () => {
    fetchMock.mockResolvedValue({ ok: true });
    await sendSubscriptionTelegram('123', 'SAT_[Physics]');
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toEqual({ chat_id: '123', text: 'SAT_[Physics]' });
  });
});
