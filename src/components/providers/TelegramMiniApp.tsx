'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getCleanPath } from '@/lib/protected-paths';
import { resolveLoginCallback } from '@/lib/safe-return-path';
import {
  ensureMiniAppSession,
  isTelegramMiniApp,
  loadTelegramSdk,
  openExternalInMiniApp,
  type TelegramWebApp,
} from '@/lib/telegram-webapp-client';

// Asosiy bo'limlar — bu yerdan "orqaga" yo'q (Telegram'ning o'z "yopish"
// tugmasi qoladi). Ichki sahifalarda Telegram'ning Back tugmasi chiqadi.
const ROOT_PATHS = new Set(['/', '/tests', '/attestation', '/dashboard', '/rating', '/pricing', '/login', '/tg']);
// Test yechilayotganda tasodifiy yopish javoblarni yo'qotmasin.
const SOLVING_PATTERN = /\/tests\/[^/]+\/solve|\/session\/[^/]+/;
const HEADER_COLOR = '#ffffff';
const BACKGROUND_COLOR = '#fafafa';

/**
 * Sayt Telegram Mini App ichida ochilganda: SDK'ni yuklaydi, oynani to'liq
 * ochadi, foydalanuvchini jimgina tizimga kiritadi, Back tugmasi va tashqi
 * havolalarni Telegram'ga moslaydi. Oddiy brauzerda hech narsa qilmaydi.
 */
export default function TelegramMiniApp() {
  const pathname = usePathname();
  const router = useRouter();
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  useEffect(() => {
    if (!isTelegramMiniApp()) return;
    document.documentElement.dataset.tgMiniapp = '';
    let cancelled = false;

    loadTelegramSdk().then((webApp) => {
      if (cancelled || !webApp) return;
      setWebApp(webApp);
      webApp.ready();
      webApp.expand();
      // Test ichida pastga aylantirish oynani yopib yubormasin.
      if (webApp.isVersionAtLeast('7.7')) webApp.disableVerticalSwipes?.();
      if (webApp.isVersionAtLeast('6.9')) {
        webApp.setHeaderColor(HEADER_COLOR);
        webApp.setBackgroundColor(BACKGROUND_COLOR);
      }
      syncChrome(webApp, pathRef.current);
    });

    // /tg kirish sahifasi sessiyani o'zi ochadi va kerakli joyga o'tadi.
    if (getCleanPath(window.location.pathname) !== '/tg') {
      ensureMiniAppSession().then((result) => {
        if (cancelled || result !== 'signed-in') return;
        // Yangi sessiya bilan sahifa server tomonda qayta chizilsin.
        if (!markReloadOnce()) return;
        if (getCleanPath(window.location.pathname) === '/login') {
          const callback = new URLSearchParams(window.location.search).get('callbackUrl');
          window.location.replace(resolveLoginCallback(callback));
        } else {
          window.location.reload();
        }
      });
    }

    // t.me va boshqa saytlarga havolalar Mini App ichida emas, Telegram'ning
    // o'zida yoki tizim brauzerida ochilsin.
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute('download')) return;
      if (openExternalInMiniApp(anchor.href)) event.preventDefault();
    };
    document.addEventListener('click', onClick, true);

    const originalOpen = window.open.bind(window);
    window.open = (url?: string | URL, target?: string, features?: string) => {
      if (url && openExternalInMiniApp(String(url))) return null;
      return originalOpen(url, target, features);
    };

    return () => {
      cancelled = true;
      document.removeEventListener('click', onClick, true);
      window.open = originalOpen;
    };
  }, []);

  useEffect(() => {
    if (webApp) syncChrome(webApp, pathname);
  }, [webApp, pathname]);

  useEffect(() => {
    if (!webApp) return;
    const onBack = () => {
      if (window.history.length > 1) router.back();
      else router.push('/tests');
    };
    webApp.BackButton.onClick(onBack);
    return () => webApp.BackButton.offClick(onBack);
  }, [webApp, router]);

  return null;
}

const RELOAD_KEY = 'ep_tg_session_reload';
const RELOAD_GUARD_MS = 60_000;

// Kirishdan keyingi qayta yuklash bir daqiqada bir martadan ko'p bo'lmasin:
// cookie saqlanmagan holatda (WebView cheklovi) sahifa cheksiz aylanmaydi,
// 24 soatlik sessiya tugaganda esa keyinroq yana jimgina qayta kiradi.
function markReloadOnce(now = Date.now()): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (now - last < RELOAD_GUARD_MS) return false;
    sessionStorage.setItem(RELOAD_KEY, String(now));
    return true;
  } catch {
    return false;
  }
}

function syncChrome(webApp: TelegramWebApp, pathname: string) {
  const clean = getCleanPath(pathname).replace(/\/$/, '') || '/';
  if (ROOT_PATHS.has(clean)) webApp.BackButton.hide();
  else webApp.BackButton.show();
  if (SOLVING_PATTERN.test(clean)) webApp.enableClosingConfirmation();
  else webApp.disableClosingConfirmation();
}
