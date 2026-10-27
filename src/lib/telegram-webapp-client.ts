'use client';

import { signIn } from 'next-auth/react';

// Brauzer tomoni: sayt Telegram Mini App ichida ochilganini aniqlash,
// Telegram SDK'ni faqat shunda yuklash va sessiyani initData bilan ochish.
// Oddiy brauzerda bu fayldagi hech narsa ishlamaydi va SDK yuklanmaydi.

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: { user?: { id: number }; start_param?: string };
  version: string;
  platform: string;
  ready(): void;
  expand(): void;
  close(): void;
  isVersionAtLeast(version: string): boolean;
  setHeaderColor(color: string): void;
  setBackgroundColor(color: string): void;
  disableVerticalSwipes?(): void;
  enableClosingConfirmation(): void;
  disableClosingConfirmation(): void;
  openLink(url: string, options?: { try_instant_view?: boolean }): void;
  openTelegramLink(url: string): void;
  HapticFeedback?: { selectionChanged(): void; notificationOccurred(type: 'error' | 'success' | 'warning'): void };
  BackButton: { show(): void; hide(): void; onClick(cb: () => void): void; offClick(cb: () => void): void };
}

declare global {
  interface Window { Telegram?: { WebApp?: TelegramWebApp }; TelegramWebviewProxy?: unknown }
}

const SDK_URL = 'https://telegram.org/js/telegram-web-app.js';
// Telegram initData'ni faqat birinchi URL'ning #hash qismida beradi. Sayt
// ichida sahifadan sahifaga o'tganda hash yo'qoladi — shuning uchun darhol
// sessionStorage'ga olib qo'yamiz (u Mini App oynasi yopilguncha yashaydi).
const STORAGE_KEY = 'ep_tg_init_data';

let launchInitData: string | null | undefined;

function readHashInitData(): string | null {
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
  if (!hash.includes('tgWebAppData=')) return null;
  return new URLSearchParams(hash).get('tgWebAppData');
}

/** Mini App ishga tushgandagi initData (bo'lmasa `null` — oddiy brauzer). */
export function getLaunchInitData(): string | null {
  if (typeof window === 'undefined') return null;
  if (launchInitData !== undefined) return launchInitData;
  let value = readHashInitData();
  try {
    if (value) sessionStorage.setItem(STORAGE_KEY, value);
    else value = sessionStorage.getItem(STORAGE_KEY);
  } catch {
    // sessionStorage yopiq bo'lsa ham hash'dagi qiymat shu sahifada ishlaydi.
  }
  launchInitData = value || null;
  return launchInitData;
}

// Faqat URL'dagi #tgWebAppData ga ishonib bo'lmaydi: hujumchi o'z initData'sini
// havolaga qo'yib, oddiy brauzerdagi odamni o'z akkauntiga kiritib qo'yishi
// mumkin edi (keyin u odamning to'lovi hujumchiga yozilardi). Haqiqiy
// Telegram konteyneri: mobil/desktop ilovalar TelegramWebviewProxy qo'yadi,
// Telegram Web esa saytni iframe ichida ochadi (SDK ham shunday aniqlaydi).
function insideTelegramContainer(): boolean {
  if (window.TelegramWebviewProxy !== undefined) return true;
  try {
    return window.parent !== window;
  } catch {
    return true;
  }
}

export function isTelegramMiniApp(): boolean {
  return typeof window !== 'undefined' && insideTelegramContainer() && getLaunchInitData() !== null;
}

let sdkPromise: Promise<TelegramWebApp | null> | null = null;

/** SDK'ni bir marta yuklaydi. Mini App bo'lmasa yoki yuklanmasa — `null`. */
export function loadTelegramSdk(): Promise<TelegramWebApp | null> {
  if (typeof window === 'undefined' || !isTelegramMiniApp()) return Promise.resolve(null);
  if (window.Telegram?.WebApp) return Promise.resolve(window.Telegram.WebApp);
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => resolve(window.Telegram?.WebApp ?? null);
    script.onerror = () => { sdkPromise = null; resolve(null); };
    document.head.appendChild(script);
  });
  return sdkPromise;
}

export function getWebApp(): TelegramWebApp | null {
  return typeof window === 'undefined' ? null : window.Telegram?.WebApp ?? null;
}

function initDataUserId(initData: string): string | null {
  try {
    const user: unknown = JSON.parse(new URLSearchParams(initData).get('user') ?? '');
    return typeof user === 'object' && user !== null && 'id' in user ? String(user.id) : null;
  } catch {
    return null;
  }
}

export type MiniAppSessionResult = 'not-mini-app' | 'already' | 'signed-in' | 'failed';

let sessionPromise: Promise<MiniAppSessionResult> | null = null;

/**
 * Mini App'da sessiya shu Telegram foydalanuvchisiniki bo'lishini ta'minlaydi.
 * Sessiya yo'q yoki boshqa akkauntniki bo'lsa — initData bilan kiradi.
 * Bir sahifada bir necha joydan chaqirilsa ham so'rov bir marta ketadi.
 */
export function ensureMiniAppSession(): Promise<MiniAppSessionResult> {
  if (sessionPromise) return sessionPromise;
  sessionPromise = (async (): Promise<MiniAppSessionResult> => {
    const initData = isTelegramMiniApp() ? getLaunchInitData() : null;
    if (!initData) return 'not-mini-app';
    const telegramId = initDataUserId(initData);
    try {
      const response = await fetch('/api/auth/session', { cache: 'no-store' });
      const session: unknown = response.ok ? await response.json() : null;
      const user = typeof session === 'object' && session !== null && 'user' in session ? session.user : null;
      const currentTelegramId = typeof user === 'object' && user !== null && 'telegramId' in user ? user.telegramId : null;
      if (user && telegramId && String(currentTelegramId) === telegramId) return 'already';
      // Boshqa akkaunt sessiyasini jimgina almashtirmaymiz — foydalanuvchi
      // o'zi chiqib, qayta kirsin. Faqat sessiya yo'q bo'lsa avtomatik kiramiz.
      if (user) return 'already';
    } catch {
      // Sessiyani bilib bo'lmadi — baribir kirishga urinamiz.
    }
    try {
      const result = await signIn('telegram-webapp', { initData, redirect: false });
      return result && !result.error ? 'signed-in' : 'failed';
    } catch {
      return 'failed';
    }
  })();
  // Xatoda keyingi urinishga yo'l qoldiramiz.
  sessionPromise.then((result) => { if (result === 'failed') sessionPromise = null; });
  return sessionPromise;
}

/**
 * Tashqi havolani Mini App'ga mos ochadi: t.me — Telegram'ning o'zida (bot
 * chati ochiladi, Mini App yopilmaydi), boshqa sayt — tizim brauzerida.
 * `true` qaytsa havola Telegram orqali ochildi.
 */
export function openExternalInMiniApp(url: string): boolean {
  const webApp = getWebApp();
  if (!webApp || !isTelegramMiniApp()) return false;
  let parsed: URL;
  try {
    parsed = new URL(url, window.location.href);
  } catch {
    return false;
  }
  if (parsed.origin === window.location.origin) return false;
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
  if (parsed.hostname === 't.me' || parsed.hostname === 'telegram.me') webApp.openTelegramLink(parsed.toString());
  else webApp.openLink(parsed.toString());
  return true;
}
