'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { clearSubscriptionStatusCache, loadSubscriptionStatus } from '@/components/ui/useSubscriptionStatus';
import { BUY_BUTTON_STYLES, type BuyButtonVariant } from './buy-button-styles';
import { isTelegramMiniApp, openExternalInMiniApp } from '@/lib/telegram-webapp-client';

const POLL_MS = 20_000;
const POLL_WINDOW_MS = 15 * 60_000;
const button = 'inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-3 text-center font-semibold';

type ErrorKey = 'checkoutError' | 'checkoutExpired';

export function BuyOfferButton({ userId, productId, offerId, needed, choices, knownSubscriptionIds, variant = 'solid' }: {
  userId: string; productId: string; offerId: string; needed: number;
  choices: { id: string; name: string }[]; knownSubscriptionIds: string[]; variant?: BuyButtonVariant;
}) {
  const t = useTranslations('pricing');
  const router = useRouter();
  const [picking, setPicking] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'opened' | 'error'>('idle');
  const [errorKey, setErrorKey] = useState<ErrorKey>('checkoutError');
  // Mini App'da bot havolasi qo'shimcha tugma sifatida ham ko'rinadi: ba'zi
  // Telegram ilovalari havolani faqat to'g'ridan-to'g'ri bosishda ochadi.
  const [miniAppUrl, setMiniAppUrl] = useState<string | null>(null);

  // Bosish hodisasi ichida chaqiriladi: desktop'da oyna fetch'dan OLDIN ochiladi,
  // aks holda brauzer uni popup deb bloklaydi. Telefonda yangi oyna Telegram
  // ilovasiga o'tishni buzadi — shu tabning o'zi havolaga o'tadi.
  function start(subjectIds: string[]) {
    // Telegram Mini App ichida bo'sh oyna ochilmaydi — bot chati Telegram'ning o'zida ochiladi.
    const popup = isTelegramMiniApp() || window.matchMedia('(pointer: coarse)').matches ? null : window.open('', '_blank');
    setStatus('loading');
    fetch('/api/checkout/intent', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, offerId, ...(subjectIds.length ? { subjectIds } : {}) }),
    }).then(async (response) => {
      const body: unknown = await response.json().catch(() => null);
      const url = typeof body === 'object' && body !== null && 'url' in body && typeof body.url === 'string' ? body.url : null;
      if (!response.ok || !url) {
        const code = typeof body === 'object' && body !== null && 'code' in body ? body.code : null;
        throw new Error(code === 'EXPIRED_OFFER' ? 'checkoutExpired' : 'checkoutError');
      }
      setStatus('opened'); setPicking(false);
      if (isTelegramMiniApp()) setMiniAppUrl(url);
      if (popup && !popup.closed) { popup.opener = null; popup.location.href = url; } else if (!openExternalInMiniApp(url)) window.location.href = url;
    }).catch((error: unknown) => {
      popup?.close();
      setErrorKey(error instanceof Error && error.message === 'checkoutExpired' ? 'checkoutExpired' : 'checkoutError');
      setStatus('error');
    });
  }

  function onBuy() {
    if (needed === 0) start([]);
    else if (needed === 1 && choices.length === 1) start([choices[0].id]);
    else { setSelected([]); setPicking(true); }
  }

  function toggle(id: string) {
    setSelected((current) => needed === 1 ? [id] : current.includes(id) ? current.filter((value) => value !== id) : current.length < needed ? [...current, id] : current);
  }

  // Admin chekni tasdiqlagach sahifa o'zi yangilansin. Telegram'dan qaytganda
  // (sahifa yana ko'rinadi) 20 soniya kutmasdan darhol tekshiriladi.
  useEffect(() => {
    if (status !== 'opened') return;
    const startedAt = Date.now();
    let done = false;
    const check = () => {
      if (done || document.visibilityState !== 'visible') return;
      if (Date.now() - startedAt > POLL_WINDOW_MS) { done = true; return; }
      clearSubscriptionStatusCache();
      loadSubscriptionStatus(userId).then((current) => {
        if (!done && current.subscriptions.some((subscription) => !knownSubscriptionIds.includes(subscription.id))) { done = true; setStatus('idle'); router.refresh(); }
      }).catch(() => {});
    };
    const timer = window.setInterval(check, POLL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { done = true; window.clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [status, userId, knownSubscriptionIds, router]);

  return (
    <div className="mt-auto space-y-3">
      {picking ? (
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-text-primary">{t(needed === 2 ? 'chooseTwoTitle' : 'chooseSubjectTitle')}</legend>
          {choices.map((choice) => (
            <label key={choice.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-gray-200 px-3 py-2 text-sm has-checked:border-primary-600">
              <input type={needed === 1 ? 'radio' : 'checkbox'} name={`subject-${offerId}`} checked={selected.includes(choice.id)} onChange={() => toggle(choice.id)}
                disabled={needed === 2 && selected.length >= 2 && !selected.includes(choice.id)} className="h-5 w-5 shrink-0" />
              <span className="min-w-0 wrap-break-word">{choice.name}</span>
            </label>
          ))}
          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" onClick={() => start(selected)} disabled={selected.length !== needed || status === 'loading'}
              className={`${button} flex-1 bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50`}>
              {status === 'loading' ? t('opening') : t('continueToTelegram')}
            </button>
            <button type="button" onClick={() => setPicking(false)} className={`${button} border border-gray-200 text-text-secondary hover:bg-gray-50`}>{t('cancel')}</button>
          </div>
        </fieldset>
      ) : (
        <button type="button" onClick={onBuy} disabled={status === 'loading'} className={`${button} w-full ${BUY_BUTTON_STYLES[variant]} disabled:opacity-50`}>
          {status === 'loading' ? t('opening') : t('buy')}
        </button>
      )}
      {status === 'opened' && <p role="status" className="rounded-xl bg-primary-50 p-3 text-sm text-primary-800">{t('checkoutOpened')}</p>}
      {status === 'opened' && miniAppUrl && (
        <a href={miniAppUrl} className={`${button} w-full bg-[#2AABEE] text-white hover:bg-[#229ED9]`}>{t('continueToTelegram')}</a>
      )}
      {status === 'error' && <p role="alert" className="text-sm text-red-600">{t(errorKey)}</p>}
    </div>
  );
}
