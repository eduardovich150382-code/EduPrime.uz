'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { sanitizeReturnPath } from '@/lib/safe-return-path';
import { miniAppStartTarget } from '@/lib/telegram-bot-links';
import { ensureMiniAppSession, getLaunchInitData, loadTelegramSdk } from '@/lib/telegram-webapp-client';

// Botdagi "Platformani ochish" va boshqa Mini App tugmalari shu sahifani
// ochadi: foydalanuvchi jimgina tizimga kiradi va `?to=` dagi bo'limga
// o'tadi. Oddiy brauzerda ochilsa — darhol o'sha bo'limga.
const DEFAULT_TARGET = '/attestation';

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
  const target = resolveTarget(searchParams.get('to'));

  const enter = useCallback(() => {
    setFailed(false);
    // SDK ham yuklanib bo'lsin: u Telegram parametrlarini (versiya, platforma)
    // faqat birinchi sahifa URL'idan o'qib saqlaydi — erta o'tib ketsak,
    // keyingi sahifalarda Back tugmasi va boshqa sozlamalar ishlamay qoladi.
    Promise.all([ensureMiniAppSession(), loadTelegramSdk()]).then(([result]) => {
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

      {failed ? (
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
