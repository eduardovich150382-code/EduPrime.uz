import { afterEach, describe, expect, it, vi } from 'vitest';
import { decidePersonal, fetchPersonal, type PersonalResult, type SessionState, type Settled } from '../personal-data';

const loading: SessionState = { status: 'loading', userId: null };
const guest: SessionState = { status: 'unauthenticated', userId: null };
const authed = (userId: string): SessionState => ({ status: 'authenticated', userId });
const ok = (userId: string): PersonalResult<{ v: string }> => ({ kind: 'ok', userId, data: { v: userId } });
const early = (result: PersonalResult<{ v: string }>): Settled<{ v: string }> => ({ result, forUser: null });
const forUser = (userId: string, result: PersonalResult<{ v: string }>): Settled<{ v: string }> => ({ result, forUser: userId });

describe('decidePersonal', () => {
  it('sessiya noma’lum — javob kelgan bo‘lsa ham ko‘rsatilmaydi', () => {
    expect(decidePersonal(null, loading).action).toBe('wait');
    expect(decidePersonal(early(ok('u1')), loading)).toEqual({ action: 'wait', data: null, failed: false });
  });

  it('ishorasiz (javob yo‘q) — sessiya aniqlangach so‘raladi', () => {
    expect(decidePersonal(null, authed('u1')).action).toBe('fetch');
  });

  it('ishora bilan kelgan javob — userId mos bo‘lsa qayta so‘ramasdan ko‘rsatiladi', () => {
    expect(decidePersonal(early(ok('u1')), authed('u1'))).toEqual({ action: 'show', data: { v: 'u1' }, failed: false });
  });

  it('ishora bilan kelgan boshqa foydalanuvchi javobi tashlanadi va qayta so‘raladi', () => {
    expect(decidePersonal(early(ok('u2')), authed('u1')).action).toBe('fetch');
  });

  it('sessiya bo‘yicha so‘ralgan javob ham mos kelmasa — xato, tsikl yo‘q', () => {
    expect(decidePersonal(forUser('u1', ok('u2')), authed('u1'))).toEqual({ action: 'show', data: null, failed: true });
  });

  it('mehmon — ishora bilan kelgan javob ham tashlanadi', () => {
    expect(decidePersonal(early(ok('u1')), guest)).toEqual({ action: 'show', data: null, failed: false });
    expect(decidePersonal(null, guest)).toEqual({ action: 'show', data: null, failed: false });
  });

  it('ishora bilan 401 — eskirgan ishora: mehmonda jimgina, failed emas', () => {
    expect(decidePersonal(early({ kind: 'unauthorized' }), loading).action).toBe('wait');
    expect(decidePersonal(early({ kind: 'unauthorized' }), guest)).toEqual({ action: 'show', data: null, failed: false });
  });

  it('ishora bilan 401, sessiya esa kirgan — bir marta qayta so‘raladi', () => {
    expect(decidePersonal(early({ kind: 'unauthorized' }), authed('u1')).action).toBe('fetch');
  });

  it('sessiya bo‘yicha so‘ralgan 401 yoki xato — failed (mehmon ko‘rinishi)', () => {
    expect(decidePersonal(forUser('u1', { kind: 'unauthorized' }), authed('u1'))).toEqual({ action: 'show', data: null, failed: true });
    expect(decidePersonal(forUser('u1', { kind: 'failed' }), authed('u1'))).toEqual({ action: 'show', data: null, failed: true });
    expect(decidePersonal(early({ kind: 'failed' }), authed('u1'))).toEqual({ action: 'show', data: null, failed: true });
  });

  it('foydalanuvchi almashsa eski javob yaroqsiz — qayta so‘raladi', () => {
    expect(decidePersonal(forUser('u1', ok('u1')), authed('u2')).action).toBe('fetch');
  });
});

describe('fetchPersonal', () => {
  afterEach(() => vi.unstubAllGlobals());
  const stub = (response: Response) => {
    const fetch = vi.fn().mockResolvedValue(response);
    vi.stubGlobal('fetch', fetch);
    return fetch;
  };

  it('200 — javob va undagi userId, keshsiz', async () => {
    const fetch = stub(Response.json({ userId: 'u1', rows: [] }));
    const result = await fetchPersonal('/api/attestation/me', new AbortController().signal);
    expect(result).toEqual({ kind: 'ok', userId: 'u1', data: { userId: 'u1', rows: [] } });
    expect(fetch).toHaveBeenCalledWith('/api/attestation/me', expect.objectContaining({ cache: 'no-store' }));
  });

  it('401 — unauthorized (failed emas)', async () => {
    stub(new Response(null, { status: 401 }));
    expect(await fetchPersonal('/api/pricing/me', new AbortController().signal)).toEqual({ kind: 'unauthorized' });
  });

  it('500, userId’siz javob yoki tarmoq xatosi — failed', async () => {
    stub(new Response(null, { status: 500 }));
    expect(await fetchPersonal('/x', new AbortController().signal)).toEqual({ kind: 'failed' });
    stub(Response.json({ rows: [] }));
    expect(await fetchPersonal('/x', new AbortController().signal)).toEqual({ kind: 'failed' });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network')));
    expect(await fetchPersonal('/x', new AbortController().signal)).toEqual({ kind: 'failed' });
  });

  it('bekor qilingan so‘rov — xato chaqiruvchiga o‘tadi', async () => {
    const controller = new AbortController();
    controller.abort();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('aborted', 'AbortError')));
    await expect(fetchPersonal('/x', controller.signal)).rejects.toThrow('aborted');
  });
});
