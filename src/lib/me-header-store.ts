import type { SubscriptionStatus } from './subscription-display';

// `/api/me/header` javobi va uning klientdagi umumiy keshi.
//
// Header (son), Sidebar, ikki banner, CTA va obuna belgisi bitta sahifada
// birga turadi — hammasi shu bitta so'rovdan oladi. Kesh foydalanuvchi
// ID'si bilan bog'langan: boshqa akkauntga o'tilsa eski obunalar yoki son
// bir lahza ham ko'rinmasin.

export interface MeHeader {
  unreadCount: number;
  /** Mehmonda (401) `null`. */
  subscription: SubscriptionStatus | null;
}

export const ME_HEADER_URL = '/api/me/header';
const TTL_MS = 60_000;

let cache: { userId: string; at: number; promise: Promise<MeHeader> } | null = null;

// O'qilmaganlar soni alohida saqlanadi: kesh hit'i uni qayta yozmasligi kerak
// — aks holda bildirishnoma o'qilgach header 60 soniya ichida eski sonni
// qaytarib qo'yardi. Faqat haqiqiy javob kelganda yoki o'qilganda o'zgaradi.
let unread: { userId: string; count: number } | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

function setUnread(userId: string, count: number) {
  unread = { userId, count: Math.max(0, count) };
  emit();
}

export function loadMeHeader(userId: string, now = Date.now()): Promise<MeHeader> {
  if (cache && cache.userId === userId && now - cache.at < TTL_MS) return cache.promise;
  const promise = fetch(ME_HEADER_URL).then((response) => {
    if (!response.ok) throw new Error('STATUS_UNAVAILABLE');
    return response.json() as Promise<MeHeader>;
  });
  const entry = { userId, at: now, promise };
  cache = entry;
  promise.then(
    (header) => { if (cache === entry) setUnread(userId, header.unreadCount); },
    // Xato (401/500/tarmoq) keshlanmaydi — keyingi chaqiruv qayta so'raydi.
    () => { if (cache === entry) cache = null; },
  );
  return promise;
}

export function clearMeHeaderCache() {
  cache = null;
}

export function subscribeUnread(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Boshqa foydalanuvchining soni yoki hali yuklanmagan — 0. */
export function getUnread(userId: string | null): number {
  return userId && unread?.userId === userId ? unread.count : 0;
}

/** Bildirishnoma o'qilganda header darhol yangilansin — keyingi so'rovni kutmasdan. */
export function markNotificationsRead(read: number | 'all') {
  if (!unread) return;
  setUnread(unread.userId, read === 'all' ? 0 : unread.count - read);
}
