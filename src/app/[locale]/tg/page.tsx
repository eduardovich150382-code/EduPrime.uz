'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { sanitizeReturnPath } from '@/lib/safe-return-path';
import { miniAppStartTarget } from '@/lib/telegram-bot-links';
import {
  ensureMiniAppSession, getLaunchInitData, isDesktopTelegram, loadTelegramSdk, requestBrowserHandoff, type TelegramWebApp,
} from '@/lib/telegram-webapp-client';

// Botdagi "Platformani ochish" va boshqa Mini App tugmalari shu sahifani
// ochadi: foydalanuvchi jimgina tizimga kiradi va `?to=` dagi bo'limga
// o'tadi. Oddiy brauzerda ochilsa — darhol o'sha bo'limga.
const DEFAULT_TARGET = '/attestation';
const REFRESH_MS = 4 * 60 * 1000;

function resolveTarget(to: string | null): string {
  const fromQuery = sanitizeReturnPath(to);
  if (fromQuery) return fromQuery;
  // t.me/EduPrimeuzbot?startapp=tests kabi to'g'ridan-to'g'ri havolalar.
  const initData = getLaunchInitData();
  const startParam = initData ? new URLSearchParams(initData).get('start_param') : null;
  return miniAppStartTarget(startParam) ?? DEFAULT_TARGET;
}

function MiniAppEntry() {
  const t = useTranslations('telegramMiniApp');
  const searchParams = useSearchParams();
  const [failed, setFailed] = useState(false);
  // Kompyuterdagi Telegram: sayt brauzerda ochilishi taklif qilinadi.
  const [desktop, setDesktop] = useState<{ webApp: TelegramWebApp; url: string | null } | null>(null);
  const target = resolveTarget(searchParams.get('to'));

  useEffect(() => {
    let cancelled = false;
    let refresh: number | undefined;
    loadTelegramSdk().then(async (webApp) => {
      if (cancelled || !isDesktopTelegram(webApp) || !webApp) return;
      setDesktop({ webApp, url: null });
      // Havola oldindan tayyorlanadi: openLink bosish hodisasi ichida
      // sinxron chaqirilishi kerak, aks holda Telegram uni bloklashi mumkin.
      // Token olinmasa ham sayt ochiladi — faqat brauzerda qayta kirish kerak bo'ladi.
      const prepare = async () => {
        const url = (await requestBrowserHandoff(target)) ?? `${window.location.origin}${target}`;
        if (!cancelled) setDesktop({ webApp, url });
      };
      await prepare();
      // Havola 5 daqiqa amal qiladi; ekran uzoq ochiq qolsa foydalanuvchi
      // sezmagan holda yangisi tayyorlanib turadi.
      refresh = window.setInterval(prepare, REFRESH_MS);
    });
    return () => { cancelled = true; window.clearInterval(refresh); };
  }, [target]);

  const openInBrowser = () => {
    if (!desktop?.url) return;
    desktop.webApp.openLink(desktop.url);
    window.setTimeout(() => desktop.webApp.close(), 400);
  };

  const enter = useCallback(() => {
    setFailed(false);
    // SDK ham yuklanib bo'lsin: u Telegram parametrlarini (versiya, platforma)
    // faqat birinchi sahifa URL'idan o'qib saqlaydi — erta o'tib ketsak,
    // keyingi sahifalarda Back tugmasi va boshqa sozlamalar ishlamay qoladi.
    Promise.all([ensureMiniAppSession(), loadTelegramSdk()]).then(([result, webApp]) => {
      // Kompyuterda foydalanuvchi o'zi tanlaydi — avtomatik o'tib ketmaymiz.
      if (isDesktopTelegram(webApp)) return;
      if (result === 'failed') setFailed(true);
      else window.location.replace(target);
    });
  }, [target]);

  useEffect(() => { enter(); }, [enter]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <div className="flex items-center gap-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600 to-primary-500 shadow-lg shadow-primary-500/30">
          <span className="text-2xl font-bold text-white">E</span>
        </div>
        <span className="text-3xl font-bold">
          Edu<span className="gradient-text">Prime</span>
        </span>
      </div>

      {desktop ? (
        <div className="w-full max-w-sm space-y-4">
          <p className="text-lg font-semibold text-text-primary">{t('desktopTitle')}</p>
          <p className="text-sm text-text-secondary">{t('desktopText')}</p>
          <button type="button" onClick={openInBrowser} disabled={!desktop.url}
            className="min-h-11 w-full rounded-xl bg-primary-600 px-4 py-3 font-semibold text-white hover:bg-primary-700 disabled:opacity-60">
            {desktop.url ? t('openInBrowser') : t('preparing')}
          </button>
          <button type="button" onClick={() => { ensureMiniAppSession().then(() => window.location.replace(target)); }}
            className="min-h-11 w-full rounded-xl border border-gray-200 px-4 py-3 font-semibold text-text-secondary hover:bg-gray-50">
            {t('stayInTelegram')}
          </button>
        </div>
      ) : failed ? (
        <div className="w-full max-w-sm space-y-4">
          <p className="font-semibold text-text-primary">{t('failedTitle')}</p>
          <p className="text-sm text-text-secondary">{t('failedText')}</p>
          <button type="button" onClick={enter}
            className="min-h-11 w-full rounded-xl bg-primary-600 px-4 py-3 font-semibold text-white hover:bg-primary-700">
            {t('retry')}
          </button>
          <button type="button" onClick={() => window.location.replace(target)}
            className="min-h-11 w-full rounded-xl border border-gray-200 px-4 py-3 font-semibold text-text-secondary hover:bg-gray-50">
            {t('continue')}
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3" role="status">
          <Loader2 size={32} className="animate-spin text-primary-600" />
          <p className="text-sm text-text-secondary">{t('loading')}</p>
        </div>
      )}
    </div>
  );
}

export default function TelegramEntryPage() {
  return (
    <Suspense fallback={null}>
      <MiniAppEntry />
    </Suspense>
  );
}
