// `usePersonalData` qarorlari — React'siz, alohida test qilinadi.
//
// Ishora (lib/auth-hint) bor bo'lsa `/me` sessiya javobini kutmasdan
// yuboriladi: ikkala so'rov parallel, kechikish yig'indi emas, kattasi.
// Ishora faqat taxmin — javob baribir sessiya aniqlangach, `userId` mos
// kelsagina ko'rsatiladi; boshqa foydalanuvchining ma'lumoti chiqmasin.

export type PersonalResult<T> =
  | { kind: 'ok'; userId: string; data: T }
  | { kind: 'unauthorized' }
  | { kind: 'failed' };

export interface Settled<T> {
  result: PersonalResult<T>;
  /** Qaysi sessiya foydalanuvchisi uchun yuborilgan; `null` — ishora bilan, sessiyadan oldin. */
  forUser: string | null;
}

export type SessionState = { status: 'loading' | 'unauthenticated'; userId: null } | { status: 'authenticated'; userId: string | null };

export type PersonalDecision<T> =
  | { action: 'wait' | 'fetch'; data: null; failed: false }
  | { action: 'show'; data: T | null; failed: boolean };

const WAIT = { action: 'wait', data: null, failed: false } as const;
const FETCH = { action: 'fetch', data: null, failed: false } as const;

/** Abort xatosi chaqiruvchiga o'tadi — u bekor qilingan so'rov natijasini e'tiborsiz qoldiradi. */
export async function fetchPersonal<T>(url: string, signal: AbortSignal): Promise<PersonalResult<T>> {
  let res: Response;
  try {
    res = await fetch(url, { cache: 'no-store', signal });
  } catch (err) {
    if (signal.aborted) throw err;
    return { kind: 'failed' };
  }
  if (res.status === 401) return { kind: 'unauthorized' };
  if (!res.ok) return { kind: 'failed' };
  try {
    const body = (await res.json()) as T & { userId?: unknown };
    return typeof body.userId === 'string' ? { kind: 'ok', userId: body.userId, data: body } : { kind: 'failed' };
  } catch (err) {
    if (signal.aborted) throw err;
    return { kind: 'failed' };
  }
}

export function decidePersonal<T>(settled: Settled<T> | null, session: SessionState): PersonalDecision<T> {
  // Mehmon: ishora bilan kelgan javob ham tashlanadi (eskirgan ishora).
  if (session.status === 'unauthenticated') return { action: 'show', data: null, failed: false };
  // Sessiya noma'lum — javob kimniki ekanini hali tekshirib bo'lmaydi.
  if (session.status === 'loading' || !session.userId) return WAIT;
  if (!settled) return FETCH;
  const { result, forUser } = settled;
  const mine = result.kind === 'ok' && result.userId === session.userId;
  if (mine) return { action: 'show', data: result.data, failed: false };
  if (forUser === null) {
    // Ishora bilan yuborilgan so'rov boshqa (yoki eski) cookie bilan ketgan
    // bo'lishi mumkin — sessiya foydalanuvchisi uchun bir marta qayta so'raladi.
    return result.kind === 'failed' ? { action: 'show', data: null, failed: true } : FETCH;
  }
  // Foydalanuvchi almashgan — eski javob yaroqsiz.
  if (forUser !== session.userId) return FETCH;
  // Sessiya bo'yicha so'ralgan va baribir mos emas — tsiklga tushmasdan xato.
  return { action: 'show', data: null, failed: true };
}
