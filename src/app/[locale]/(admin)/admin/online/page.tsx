'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Activity, Crown, Eye, Loader2, MessageSquare, PencilLine, RefreshCw } from 'lucide-react';
import RoleBadge from '@/components/admin/RoleBadge';
import UserProfileModal from '@/components/admin/UserProfileModal';
import SendMessageDialog, { type MessageRecipient } from '@/components/admin/SendMessageDialog';
import { actionButtonClass } from '@/components/admin/AdminFields';

interface OnlineUser {
  id: string; name: string | null; telegramUsername: string | null; email: string | null;
  role: string; lastActiveAt: string | null; hasSubscription: boolean; hasTelegram: boolean; inTest: boolean;
}
interface OnlineData {
  counts: { onlineNow: number; activeToday: number; active7d: number };
  users: OnlineUser[];
}

// Avtoyangilash faqat sahifa ko'rinib turganda — yashirin tab adminning
// kompyuterida ochiq qolib ketsa ham serverga so'rov yubormaydi.
const REFRESH_MS = 60_000;

export default function AdminOnlinePage() {
  const t = useTranslations('adminOnline');
  const tc = useTranslations('adminCommon');
  const tu = useTranslations('adminUsers');
  const locale = useLocale();
  const [data, setData] = useState<OnlineData | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [messageTarget, setMessageTarget] = useState<MessageRecipient | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/online', { cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      setData(await res.json());
      setFailed(false);
      setUpdatedAt(new Date());
    } catch {
      setFailed(true);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    const start = () => { stop(); void load(); timer = setInterval(() => void load(), REFRESH_MS); };
    const onVisibility = () => { if (document.visibilityState === 'visible') start(); else stop(); };
    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => { stop(); document.removeEventListener('visibilitychange', onVisibility); };
  }, [load]);

  const ago = (value: string | null) => {
    if (!value || !updatedAt) return '—';
    const minutes = Math.max(0, Math.floor((updatedAt.getTime() - new Date(value).getTime()) / 60_000));
    return minutes === 0 ? t('justNow') : t('minutesAgo', { count: minutes });
  };

  const badges = (user: OnlineUser) => (
    <div className="flex flex-wrap items-center gap-1.5">
      <RoleBadge role={user.role} />
      {user.hasSubscription && (
        <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
          <Crown size={10} aria-hidden /> {t('subscribed')}
        </span>
      )}
      {user.inTest && (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
          <PencilLine size={10} aria-hidden /> {t('inTest')}
        </span>
      )}
    </div>
  );

  const contact = (user: OnlineUser) => [user.telegramUsername && `@${user.telegramUsername}`, user.email].filter(Boolean).join(' · ') || '—';

  const actions = (user: OnlineUser) => (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => setProfileId(user.id)} className={`${actionButtonClass} bg-primary-50 text-primary-700 hover:bg-primary-100`}>
        <Eye size={16} aria-hidden /> {tu('profile')}
      </button>
      <button type="button"
        onClick={() => setMessageTarget({ id: user.id, name: user.name, username: user.telegramUsername, hasTelegram: user.hasTelegram })}
        className={`${actionButtonClass} border border-border text-text-primary hover:bg-gray-50`}>
        <MessageSquare size={16} aria-hidden /> {tu('message')}
      </button>
    </div>
  );

  const users = data?.users ?? [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Activity size={24} className="text-green-600" aria-hidden /> {t('title')}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {updatedAt ? t('updatedAt', { time: updatedAt.toLocaleTimeString(locale, { timeZone: 'Asia/Tashkent', hour12: false }) }) : tc('loading')}
          </p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="btn-ghost min-h-11 flex items-center gap-2 self-start">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} aria-hidden /> {tc('refresh')}
        </button>
      </div>

      {data && (
        <div className="grid grid-cols-3 gap-3">
          {([['onlineNow', 'text-green-700'], ['activeToday', 'text-text-primary'], ['active7d', 'text-text-primary']] as const).map(([key, color]) => (
            <div key={key} className="card p-3 sm:p-4">
              <p className={`text-xl sm:text-2xl font-bold ${color}`}>{data.counts[key]}</p>
              <p className="text-xs text-text-secondary">{t(`counts.${key}`)}</p>
            </div>
          ))}
        </div>
      )}

      {failed && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{tc('error')}</p>}

      {!data && !failed ? (
        <div className="card p-12 text-center"><Loader2 size={32} className="animate-spin text-primary-600 mx-auto" /></div>
      ) : data && users.length === 0 ? (
        <p className="card p-8 text-center text-text-secondary">{t('empty')}</p>
      ) : data && (
        <>
          {data.counts.onlineNow > users.length && <p className="text-xs text-text-secondary">{t('limited', { shown: users.length })}</p>}
          <div className="space-y-3 md:hidden">
            {users.map((user) => (
              <div key={user.id} className="card p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-text-primary text-sm break-words">{user.name || tc('unnamed')}</p>
                    <p className="text-xs text-text-secondary break-all">{contact(user)}</p>
                  </div>
                  <span className="flex-shrink-0 text-xs text-green-700">{ago(user.lastActiveAt)}</span>
                </div>
                {badges(user)}
                {actions(user)}
              </div>
            ))}
          </div>
          <div className="card overflow-hidden hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-gray-50">
                    {(['user', 'status', 'lastSeen', 'actions'] as const).map((col) => (
                      <th key={col} className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase">{t(`columns.${col}`)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-border">
                      <td className="px-4 py-3">
                        <p className="font-medium text-text-primary text-sm">{user.name || tc('unnamed')}</p>
                        <p className="text-xs text-text-secondary break-all">{contact(user)}</p>
                      </td>
                      <td className="px-4 py-3">{badges(user)}</td>
                      <td className="px-4 py-3 text-sm text-green-700 whitespace-nowrap">{ago(user.lastActiveAt)}</td>
                      <td className="px-4 py-3">{actions(user)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {profileId && <UserProfileModal userId={profileId} onClose={() => setProfileId(null)} />}
      {messageTarget && <SendMessageDialog open user={messageTarget} onClose={() => setMessageTarget(null)} />}
    </div>
  );
}
