import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Sentry SDK'ni to'liq mock qilamiz — testda hech qanday tarmoq so'rovi
// bo'lmasin va `getClient` qiymatini o'zimiz boshqaraylik.
const captureException = vi.fn();
const captureMessage = vi.fn();
const getClient = vi.fn<() => object | undefined>(() => undefined);

vi.mock('@sentry/nextjs', () => ({
  captureException: (...args: unknown[]) => captureException(...args),
  captureMessage: (...args: unknown[]) => captureMessage(...args),
  getClient: () => getClient(),
}));

const { logger, sanitizeContext } = await import('../logger');

describe('sanitizeContext — maxfiy kalitlar', () => {
  it('to\'g\'ridan-to\'g\'ri sanab o\'tilgan kalitlarni olib tashlaydi', () => {
    const out = sanitizeContext({
      token: 'abc',
      secret: 's',
      password: 'p',
      authorization: 'Bearer x',
      cookie: 'session=1',
      apiKey: 'k',
      DATABASE_URL: 'postgresql://user:pw@host/db',
      userId: 'u1',
    });

    expect(out).toEqual({ userId: 'u1' });
  });

  it('kalit nomining registri va ajratuvchisidan qat\'i nazar tozalaydi', () => {
    const out = sanitizeContext({
      'X-API-Key': 'k',
      api_key: 'k',
      ACCESS_TOKEN: 't',
      refreshToken: 't',
      NEXTAUTH_SECRET: 's',
      Authorization: 'Bearer x',
      Cookie: 'a=b',
      'database-url': 'postgresql://x',
      keep: 1,
    });

    expect(out).toEqual({ keep: 1 });
  });

  it('ichma-ich obyekt va massivlarda ham tozalaydi', () => {
    const out = sanitizeContext({
      request: {
        url: '/api/x',
        headers: { authorization: 'Bearer x', 'content-type': 'application/json' },
      },
      users: [{ id: 1, password: 'p' }, { id: 2, token: 't' }],
    });

    expect(out).toEqual({
      request: { url: '/api/x', headers: { 'content-type': 'application/json' } },
      users: [{ id: 1 }, { id: 2 }],
    });
  });

  it('Error obyektini name/message/stack ga aylantiradi va qo\'shimcha maydonlarini tashlaydi', () => {
    const err = Object.assign(new Error('boom'), { config: { headers: { cookie: 'c' } } });
    const out = sanitizeContext({ error: err }) as { error: Record<string, unknown> };

    expect(out.error.name).toBe('Error');
    expect(out.error.message).toBe('boom');
    expect(typeof out.error.stack).toBe('string');
    expect(out.error).not.toHaveProperty('config');
  });

  it('halqali havolada yiqilmaydi', () => {
    const a: Record<string, unknown> = { id: 1, secret: 's' };
    a.self = a;

    const out = sanitizeContext(a);

    expect(out).toEqual({ id: 1, self: '[Circular]' });
  });

  it('maxfiy bo\'lmagan qiymatlarni o\'zgartirmaydi', () => {
    const out = sanitizeContext({ count: 0, ok: false, missing: null, name: 'x' });
    expect(out).toEqual({ count: 0, ok: false, missing: null, name: 'x' });
  });
});

describe('logger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    captureException.mockClear();
    captureMessage.mockClear();
    getClient.mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('console chiqishiga ham tozalangan kontekst boradi', () => {
    logger.error('POST /api/x error', { token: 'abc', userId: 'u1' });

    expect(console.error).toHaveBeenCalledWith('POST /api/x error', { userId: 'u1' });
  });

  it('info va warn mos console kanaliga yozadi', () => {
    logger.info('salom');
    logger.warn('ogohlantirish');

    expect(console.log).toHaveBeenCalledWith('salom');
    expect(console.warn).toHaveBeenCalledWith('ogohlantirish');
  });

  it('DSN yo\'q bo\'lsa (client yaratilmagan) Sentry\'ga hech narsa yubormaydi', () => {
    logger.error('xato', { error: new Error('boom') });

    expect(captureException).not.toHaveBeenCalled();
    expect(captureMessage).not.toHaveBeenCalled();
  });

  it('info va warn Sentry\'ga yuborilmaydi', () => {
    getClient.mockReturnValue({});

    logger.info('salom', { a: 1 });
    logger.warn('ogohlantirish', { a: 1 });

    expect(captureException).not.toHaveBeenCalled();
    expect(captureMessage).not.toHaveBeenCalled();
  });

  it('client bor bo\'lsa Error\'ni exception sifatida, tozalangan extra bilan yuboradi', () => {
    getClient.mockReturnValue({});
    const err = new Error('boom');

    logger.error('POST /api/x error', { error: err, password: 'p', userId: 'u1' });

    expect(captureException).toHaveBeenCalledTimes(1);
    const [captured, options] = captureException.mock.calls[0] as [
      unknown,
      { level: string; extra: Record<string, unknown> },
    ];
    expect(captured).toBe(err);
    expect(options.level).toBe('error');
    expect(options.extra.message).toBe('POST /api/x error');
    expect(options.extra.userId).toBe('u1');
    expect(options.extra).not.toHaveProperty('password');
  });

  it('kontekstda Error bo\'lmasa xabar sifatida yuboradi', () => {
    getClient.mockReturnValue({});

    logger.error('nimadir noto\'g\'ri', { apiKey: 'k', testId: 't1' });

    expect(captureMessage).toHaveBeenCalledTimes(1);
    const [message, options] = captureMessage.mock.calls[0] as [
      string,
      { level: string; extra: Record<string, unknown> },
    ];
    expect(message).toBe('nimadir noto\'g\'ri');
    expect(options.level).toBe('error');
    expect(options.extra).toEqual({ testId: 't1' });
  });
});
