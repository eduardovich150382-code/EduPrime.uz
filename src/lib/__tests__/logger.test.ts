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

const { logger, sanitizeContext, redactSecrets, redactEvent } = await import('../logger');

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
    expect(options.extra.logMessage).toBe('POST /api/x error');
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


describe('redactSecrets — matn ichidagi maxfiy qiymatlar', () => {
  it('ulanish satrini olib tashlaydi', () => {
    expect(
      redactSecrets("Can't reach database server at postgresql://admin:s3cret@ep-x.neon.tech:5432/db?sslmode=require"),
    ).toBe("Can't reach database server at [redacted-dsn]");
  });

  it('boshqa sxemalardagi ulanish satrlarini ham qamraydi', () => {
    expect(redactSecrets('mysql://u:p@h/db')).toBe('[redacted-dsn]');
    expect(redactSecrets('mongodb+srv://u:p@cluster.mongodb.net')).toBe('[redacted-dsn]');
    expect(redactSecrets('redis://:pw@127.0.0.1:6379')).toBe('[redacted-dsn]');
    expect(redactSecrets('amqp://guest:guest@rabbit:5672')).toBe('[redacted-dsn]');
  });

  it('Bearer tokenni olib tashlaydi, sxemani qoldiradi', () => {
    expect(redactSecrets('401 {"Authorization":"Bearer eyJhbGciOiJIUzI1NiJ9.abc-_=+/"}')).toBe(
      '401 {"Authorization":"Bearer [redacted]"}',
    );
  });

  it("so'rov qatoridagi maxfiy parametrlarni tozalaydi, kalit nomini qoldiradi", () => {
    expect(redactSecrets('GET /api/x?userId=1&token=abc123&api_key=k9&lang=uz')).toBe(
      'GET /api/x?userId=1&token=[redacted]&api_key=[redacted]&lang=uz',
    );
    expect(redactSecrets('/cb?access_token=zzz')).toBe('/cb?access_token=[redacted]');
  });

  it('oddiy matnga va zararsiz URL manzillariga tegmaydi', () => {
    const plain = 'https://eduprime.uz/tests';
    expect(redactSecrets(plain)).toBe(plain);

    const query = 'https://eduprime.uz/tests?subject=math&page=2';
    expect(redactSecrets(query)).toBe(query);

    const words = "Test topilmadi: bearer token yo'q, parol so'ralmadi";
    expect(redactSecrets(words)).toBe(words);
  });
});

describe('sanitizeContext — string qiymatlar tozalanadi', () => {
  it("xatoning `message` va `stack` idagi DSN'ni olib tashlaydi", () => {
    const err = new Error('connect failed: postgresql://u:pw@host:5432/db');
    err.stack = 'Error: connect failed: postgresql://u:pw@host:5432/db\n    at q (lib.ts:1:1)';

    const out = sanitizeContext({ error: err }) as {
      error: { message: string; stack: string };
    };

    expect(out.error.message).toBe('connect failed: [redacted-dsn]');
    expect(out.error.stack).toContain('[redacted-dsn]');
    expect(out.error.stack).not.toContain('pw@host');
  });

  it('ichma-ich va massivdagi stringlarni ham tozalaydi', () => {
    const out = sanitizeContext({
      urls: ['redis://:pw@localhost:6379'],
      nested: { note: 'GET /x?secret=abc' },
    }) as { urls: string[]; nested: { note: string } };

    expect(out.urls[0]).toBe('[redacted-dsn]');
    expect(out.nested.note).toBe('GET /x?secret=[redacted]');
  });
});

describe('redactEvent — beforeSend', () => {
  it('hodisaning message, exception va extra maydonlarini tozalaydi', () => {
    const event = {
      message: 'db down: postgresql://u:pw@host/db',
      exception: {
        values: [
          { value: 'PrismaClientInitializationError: postgresql://u:pw@host/db' },
          { value: 'fetch failed: https://api.example.com/v1?api_key=k9' },
          null,
        ],
      },
      extra: {
        logMessage: 'GET /api/x?token=abc',
        password: 'p',
        userId: 'u1',
      },
    };

    const out = redactEvent(event);

    expect(out.message).toBe('db down: [redacted-dsn]');
    expect(out.exception.values[0]?.value).toBe('PrismaClientInitializationError: [redacted-dsn]');
    expect(out.exception.values[1]?.value).toBe('fetch failed: https://api.example.com/v1?api_key=[redacted]');
    expect(out.extra).toEqual({ logMessage: 'GET /api/x?token=[redacted]', userId: 'u1' });
  });

  it("maydonlari yo'q hodisani o'zgarishsiz qaytaradi", () => {
    const event: { event_id: string; message?: string } = { event_id: 'abc' };
    expect(redactEvent(event)).toEqual({ event_id: 'abc' });
  });
});
