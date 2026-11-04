import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Sentry SDK'ni to'liq mock qilamiz — testda hech qanday tarmoq so'rovi
// bo'lmasin. Logger SDK'ni dinamik import qiladi, shuning uchun factory
// faqat birinchi yuborishda ishlaydi — `sdkLoads` aynan shuni sanaydi.
const captureException = vi.fn();
const captureMessage = vi.fn();
const captureRequestErrorMock = vi.fn();
const init = vi.fn();
const flush = vi.fn<(timeout: number) => Promise<boolean>>(async () => true);
let client: object | undefined;
let sdkLoads = 0;

vi.mock('@sentry/nextjs', () => {
  sdkLoads += 1;
  return {
    captureException: (...args: unknown[]) => captureException(...args),
    captureMessage: (...args: unknown[]) => captureMessage(...args),
    captureRequestError: (...args: unknown[]) => captureRequestErrorMock(...args),
    getClient: () => client,
    init: (options: unknown) => { init(options); client = {}; },
    flush: (timeout: number) => flush(timeout),
  };
});

const { logger, sanitizeContext, redactSecrets, redactEvent, flushSentry, captureRequestError } = await import('../logger');

const DSN = 'https://public@o0.ingest.invalid/1';
const enableSentry = () => vi.stubEnv('SENTRY_DSN', DSN);

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
    flush.mockClear();
    vi.stubEnv('SENTRY_DSN', '');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('console chiqishiga ham tozalangan kontekst boradi', async () => {
    logger.error('POST /api/x error', { token: 'abc', userId: 'u1' });
    await flushSentry();

    expect(console.error).toHaveBeenCalledWith('POST /api/x error', { userId: 'u1' });
  });

  it('info va warn mos console kanaliga yozadi', async () => {
    logger.info('salom');
    logger.warn('ogohlantirish');
    await flushSentry();

    expect(console.log).toHaveBeenCalledWith('salom');
    expect(console.warn).toHaveBeenCalledWith('ogohlantirish');
  });

  it('DSN yo\'q bo\'lsa SDK umuman yuklanmaydi va hech narsa yuborilmaydi', async () => {
    logger.error('xato', { error: new Error('boom') });
    expect(await flushSentry()).toBe(false);

    expect(captureException).not.toHaveBeenCalled();
    expect(captureMessage).not.toHaveBeenCalled();
    // Shu fayldagi Sentry yoqilgan birinchi test bundan keyin keladi — SDK
    // hali import qilinmagan bo'lishi kerak (sovuq start narxi shu).
    expect(sdkLoads).toBe(0);
  });

  it('info va warn Sentry\'ga yuborilmaydi', async () => {
    enableSentry();

    logger.info('salom', { a: 1 });
    logger.warn('ogohlantirish', { a: 1 });
    await flushSentry();

    expect(captureException).not.toHaveBeenCalled();
    expect(captureMessage).not.toHaveBeenCalled();
  });

  it('DSN bor bo\'lsa Error\'ni exception sifatida, tozalangan extra bilan yuboradi', async () => {
    enableSentry();
    const err = new Error('boom');

    logger.error('POST /api/x error', { error: err, password: 'p', userId: 'u1' });

    await flushSentry();

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

  it('kontekstda Error bo\'lmasa xabar sifatida yuboradi', async () => {
    enableSentry();

    logger.error('nimadir noto\'g\'ri', { apiKey: 'k', testId: 't1' });

    await flushSentry();

    expect(captureMessage).toHaveBeenCalledTimes(1);
    const [message, options] = captureMessage.mock.calls[0] as [
      string,
      { level: string; extra: Record<string, unknown> },
    ];
    expect(message).toBe('nimadir noto\'g\'ri');
    expect(options.level).toBe('error');
    expect(options.extra).toEqual({ testId: 't1' });
  });

  it("`tags` Sentry tegiga aylanadi va `extra` da takrorlanmaydi", async () => {
    enableSentry();
    const err = new Error('boom');

    logger.error('struktura yiqildi', { error: err, tags: { jobId: 'j1', order: 7, attempt: 3 } });

    await flushSentry();

    const [, options] = captureException.mock.calls[0] as [
      unknown,
      { tags: Record<string, string>; extra: Record<string, unknown> },
    ];
    expect(options.tags).toEqual({ jobId: 'j1', order: '7', attempt: '3' });
    expect(options.extra).not.toHaveProperty('tags');
  });

  it("teg qiymatidagi maxfiy matn ham tozalanadi", async () => {
    enableSentry();

    logger.error('xato', { tags: { url: 'https://api.example.com/x?api_key=SECRET' } });

    await flushSentry();

    const [, options] = captureMessage.mock.calls[0] as [string, { tags: Record<string, string> }];
    expect(options.tags.url).not.toContain('SECRET');
  });

  it("`report: true` bo'lmasa warn Sentry'ga umuman ketmaydi", async () => {
    // Kvota sababli sukut bo'yicha jim: barcha `warn` lar oqib ketsa bepul
    // tarif bir kunda tugaydi va haqiqiy xatolar shovqin ichida qoladi.
    enableSentry();

    logger.warn('sekin javob', { error: new Error('slow'), ms: 900 });

    await flushSentry();

    expect(captureException).not.toHaveBeenCalled();
    expect(captureMessage).not.toHaveBeenCalled();
  });

  it("`report: true` bilan warn `warning` darajasida yuboriladi", async () => {
    enableSentry();
    const err = new Error('429');

    logger.warn('qayta uriniladi', { error: err, report: true, tags: { order: 2 } });

    await flushSentry();

    expect(captureException).toHaveBeenCalledTimes(1);
    const [captured, options] = captureException.mock.calls[0] as [
      unknown,
      { level: string; tags: Record<string, string>; extra: Record<string, unknown> },
    ];
    expect(captured).toBe(err);
    expect(options.level).toBe('warning');
    expect(options.tags).toEqual({ order: '2' });
    // Boshqaruv bayrog'i log ma'lumoti emas.
    expect(options.extra).not.toHaveProperty('report');
  });

  it("`report` bayrogi konsol satriga chiqmaydi, `tags` esa chiqadi", async () => {
    logger.warn('qayta uriniladi', { report: true, tags: { order: 2 } });
    await flushSentry();

    expect(console.warn).toHaveBeenCalledWith('qayta uriniladi', { tags: { order: 2 } });
  });
});

describe('logger — Sentry SDK faqat kerak bo\'lganda yuklanadi', () => {
  const contextKey = Symbol.for('@vercel/request-context');

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    captureException.mockClear();
    captureMessage.mockClear();
    captureRequestErrorMock.mockClear();
    flush.mockClear();
    enableSentry();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    delete (globalThis as Record<symbol, unknown>)[contextKey];
  });

  it('SDK bir marta yuklanadi va bir marta init qilinadi', async () => {
    logger.error('birinchi', { error: new Error('a') });
    logger.error('ikkinchi', { error: new Error('b') });
    await flushSentry();

    expect(sdkLoads).toBe(1);
    expect(init).toHaveBeenCalledTimes(1);
  });

  it('init: tracing berilmaydi, OpenTelemetry sozlanmaydi, PII yo\'q, beforeSend tozalaydi', async () => {
    logger.error('xato');
    await flushSentry();

    const options = init.mock.calls[0][0] as {
      dsn: string;
      tracesSampleRate?: number;
      skipOpenTelemetrySetup: boolean;
      sendDefaultPii: boolean;
      beforeSend: (event: { message?: string }) => { message?: string };
    };
    expect(options.dsn).toBe(DSN);
    // `0` ham SDK uchun "tracing yoqilgan" — kalit umuman bo'lmasligi shart.
    expect(options).not.toHaveProperty('tracesSampleRate');
    expect(options.skipOpenTelemetrySetup).toBe(true);
    expect(options.sendDefaultPii).toBe(false);
    expect(options.beforeSend({ message: 'postgresql://u:p@h/db' }).message).toBe('[redacted-dsn]');
  });

  it('yuklanish tugaguncha kelgan xatolar yo\'qolmaydi, tartibi saqlanadi va flush ulardan keyin', async () => {
    const first = new Error('1');
    const second = new Error('2');

    logger.error('a', { error: first });
    logger.error('b', { error: second });
    logger.error('c');
    // Hali hech narsa yuborilmagan — SDK yuklanmoqda.
    expect(captureException).not.toHaveBeenCalled();

    expect(await flushSentry()).toBe(true);
    expect(captureException.mock.calls.map(([error]) => error)).toEqual([first, second]);
    expect(captureMessage).toHaveBeenCalledTimes(1);
    // Har capture'dan keyin flush bor — oxirgisi ham yuborilmay qolmaydi.
    const captures = [...captureException.mock.invocationCallOrder, ...captureMessage.mock.invocationCallOrder];
    const flushes = flush.mock.invocationCallOrder;
    for (const order of captures) {
      expect(flushes.some((flushOrder) => flushOrder > order)).toBe(true);
    }
  });

  it('yuborish Vercel waitUntil\'ga beriladi — javobdan keyin ham funksiya tirik qoladi', async () => {
    const waitUntil = vi.fn();
    (globalThis as Record<symbol, unknown>)[contextKey] = { get: () => ({ waitUntil }) };

    logger.error('xato', { error: new Error('boom') });

    expect(waitUntil).toHaveBeenCalledTimes(1);
    const pending = waitUntil.mock.calls[0][0] as Promise<unknown>;
    await pending;
    expect(captureException).toHaveBeenCalledTimes(1);
    expect(flush).toHaveBeenCalled();
  });

  it('so\'rov konteksti yo\'q joyda (skript, cron emas) ham yiqilmaydi', async () => {
    logger.error('xato');
    await flushSentry();
    expect(captureMessage).toHaveBeenCalledTimes(1);
  });

  it('onRequestError o\'rami SDK\'ning captureRequestError\'iga aynan o\'sha argumentlarni uzatadi', async () => {
    const error = new Error('render');
    const request = { path: '/api/x', method: 'GET', headers: {} };
    const context = { routerKind: 'App Router', routePath: '/api/x', routeType: 'route' } as const;

    await captureRequestError(error, request, context);

    expect(captureRequestErrorMock).toHaveBeenCalledWith(error, request, context);
  });

  it('DSN yo\'q bo\'lsa onRequestError o\'rami hech narsa qilmaydi', async () => {
    vi.stubEnv('SENTRY_DSN', '');
    await captureRequestError(new Error('x'), { path: '/', method: 'GET', headers: {} }, { routerKind: 'App Router', routePath: '/', routeType: 'render' });
    expect(captureRequestErrorMock).not.toHaveBeenCalled();
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

  it("so'rov URL, query_string va string tanasini tozalaydi", () => {
    const event = {
      request: {
        url: 'https://eduprime.uz/api/x?userId=1&token=abc123',
        query_string: 'userId=1&api_key=k9&lang=uz',
        data: 'connect failed: postgresql://u:pw@host/db',
      },
    };

    const out = redactEvent(event);

    expect(out.request.url).toBe('https://eduprime.uz/api/x?userId=1&token=[redacted]');
    // `?` vaqtincha qo'shilib olib tashlanadi — natijada qolmasin.
    expect(out.request.query_string).toBe('userId=1&api_key=[redacted]&lang=uz');
    expect(out.request.data).toBe('connect failed: [redacted-dsn]');
  });

  it("string bo'lmagan so'rov tanasiga tegmaydi", () => {
    const body = { token: 'abc' };
    const event = { request: { data: body } };

    expect(redactEvent(event).request.data).toBe(body);
  });

  it('breadcrumb xabari va kontekstini tozalaydi', () => {
    const event = {
      breadcrumbs: [
        { message: 'GET /api/x?token=abc123' },
        { message: 'console', data: { url: '/cb?access_token=zzz', authorization: 'Bearer x', ok: 1 } },
        null,
      ],
    };

    const out = redactEvent(event);

    expect(out.breadcrumbs[0]?.message).toBe('GET /api/x?token=[redacted]');
    expect(out.breadcrumbs[1]?.data).toEqual({ url: '/cb?access_token=[redacted]', ok: 1 });
  });

  it("maydonlari yo'q hodisani o'zgarishsiz qaytaradi", () => {
    const event: { event_id: string; message?: string } = { event_id: 'abc' };
    expect(redactEvent(event)).toEqual({ event_id: 'abc' });
  });

  it("onRequestError hodisasi: cookie'lar tashlanadi, maxfiy sarlavhalar va request_path query'si tozalanadi", () => {
    // `captureRequestError` `sendDefaultPii: false` da ham aynan shu shaklni
    // yuboradi (haqiqiy SDK bilan lokal ingest'da tekshirilgan).
    const event = redactEvent({
      request: {
        method: 'GET',
        headers: { cookie: '__Secure-authjs.session-token=SECRET', authorization: 'Bearer SECRETSECRET', 'x-api-key': 'SECRET', 'user-agent': 'Android', host: 'eduprime.uz' },
        cookies: { '__Secure-authjs.session-token': 'SECRET' },
      },
      contexts: { nextjs: { request_path: '/api/x?token=SECRET&lang=uz', router_kind: 'App Router' } },
    });

    expect(JSON.stringify(event)).not.toContain('SECRET');
    expect(event.request).not.toHaveProperty('cookies');
    expect(event.request?.headers).toEqual({ 'user-agent': 'Android', host: 'eduprime.uz' });
    expect((event.contexts?.nextjs as { request_path: string }).request_path).toBe('/api/x?token=[redacted]&lang=uz');
  });
});
