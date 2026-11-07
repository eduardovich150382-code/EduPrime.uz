'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { BookOpen, Loader2, User, X, Ban, ShieldCheck } from 'lucide-react';
import SubscriptionSummary from '@/components/ui/SubscriptionSummary';
import type { SubscriptionView } from '@/lib/subscription-display';
import ConfirmDialog from './ConfirmDialog';
import { adminFetch, actionButtonClass, dangerOutlineClass, errorCode, fieldClass, iconButtonClass } from './AdminFields';

export type AdminRole = 'USER' | 'TEACHER' | 'ADMIN';
export const ADMIN_ROLES: AdminRole[] = ['USER', 'TEACHER', 'ADMIN'];

interface AdminUserProfile {
  user: {
    id: string; name: string | null; email: string | null; image: string | null;
    telegramUsername: string | null; role: AdminRole; lastActiveAt: string | null;
    isBanned: boolean; createdAt: string;
    _count: { testResults: number; payments: number; referralsMade: number };
  };
  subscriptions: SubscriptionView[];
  testResults: { id: string; testTitle: string; subject: string; percentage: number }[];
}

export interface UserPatch { isBanned?: boolean; role?: AdminRole }

type Pending = { kind: 'ban' } | { kind: 'role'; role: AdminRole };

const day = (value: string, locale: string) => new Date(value).toLocaleDateString(locale, { timeZone: 'Asia/Tashkent' });

// Foydalanuvchilar, Onlayn va Reyting sahifalari uchun umumiy profil oynasi.
// Bloklash va rolni o'zgartirish faqat shu yerda va faqat tasdiq bilan —
// ro'yxat qatorida tasodifan bosib yuborish xavfi bo'lmasin.
export default function UserProfileModal({ userId, onClose, onChanged }: {
  userId: string;
  onClose: () => void;
  onChanged?: (userId: string, patch: UserPatch) => void;
}) {
  const t = useTranslations('adminUsers');
  const tc = useTranslations('adminCommon');
  const locale = useLocale();
  const [profile, setProfile] = useState<AdminUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<Pending | null>(null);
  const [banReason, setBanReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    adminFetch<AdminUserProfile>(`/api/admin/users/${encodeURIComponent(userId)}`, { signal: controller.signal })
      .then(setProfile)
      .catch(() => { if (!controller.signal.aborted) setProfile(null); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [userId]);

  // Tasdiq oynasi ochiq bo'lsa Escape uni yopadi (ExamDialog), profilni emas.
  useEffect(() => {
    if (pending) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [pending, onClose]);

  const user = profile?.user;

  const apply = async () => {
    if (!user || !pending) return;
    setBusy(true); setError('');
    const patch: UserPatch = pending.kind === 'ban' ? { isBanned: !user.isBanned } : { role: pending.role };
    const body = pending.kind === 'ban'
      ? { ban: !user.isBanned, banReason: user.isBanned ? '' : banReason.trim() }
      : { newRole: pending.role };
    try {
      await adminFetch(`/api/admin/users/${encodeURIComponent(user.id)}`, { method: 'PATCH', body: JSON.stringify(body) });
      setProfile((current) => current && { ...current, user: { ...current.user, ...patch } });
      onChanged?.(user.id, patch);
      setPending(null); setBanReason('');
    } catch (err) {
      setError(errorCode(err));
    } finally { setBusy(false); }
  };

  const contact = user ? [user.email, user.telegramUsername && `@${user.telegramUsername}`].filter(Boolean).join(' · ') : '';
  const displayName = user?.name || tc('unnamed');

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={t('profileTitle')} className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-text-primary">{t('profileTitle')}</h3>
          <button type="button" onClick={onClose} className={`${iconButtonClass} hover:bg-gray-100`} aria-label={tc('close')} title={tc('close')}>
            <X size={18} aria-hidden />
          </button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[70vh]">
          {loading ? (
            <div className="text-center py-8"><Loader2 size={24} className="animate-spin text-primary-600 mx-auto" /></div>
          ) : !profile || !user ? (
            <p className="text-center text-text-secondary py-4">{t('profileNotFound')}</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {user.image ? <img src={user.image} alt="" className="w-full h-full object-cover" /> : <User size={20} className="text-primary-600" />}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-text-primary break-words">{displayName}</p>
                  {contact && <p className="text-xs text-text-secondary break-all">{contact}</p>}
                </div>
                {user.isBanned && <span className="ml-auto px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium">{t('banned')}</span>}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-gray-50"><span className="text-text-secondary">{t('fields.tests')}</span> <span className="font-medium">{user._count.testResults}</span></div>
                <div className="p-2.5 rounded-lg bg-gray-50"><span className="text-text-secondary">{t('fields.referrals')}</span> <span className="font-medium">{user._count.referralsMade}</span></div>
                <div className="p-2.5 rounded-lg bg-gray-50"><span className="text-text-secondary">{t('fields.payments')}</span> <span className="font-medium">{user._count.payments}</span></div>
                <div className="p-2.5 rounded-lg bg-gray-50"><span className="text-text-secondary">{t('fields.registered')}</span> <span className="font-medium">{day(user.createdAt, locale)}</span></div>
                <div className="col-span-2 p-2.5 rounded-lg bg-gray-50"><span className="text-text-secondary">{t('fields.lastActive')}</span> <span className="font-medium">{user.lastActiveAt ? day(user.lastActiveAt, locale) : '—'}</span></div>
              </div>

              <label className="flex flex-col gap-1 text-sm">
                <span className="text-text-secondary">{t('fields.role')}</span>
                <select
                  className={fieldClass}
                  value={user.role}
                  disabled={busy}
                  onChange={(e) => { setError(''); setPending({ kind: 'role', role: e.target.value as AdminRole }); }}
                >
                  {ADMIN_ROLES.map((role) => <option key={role} value={role}>{t(`roles.${role}`)}</option>)}
                </select>
              </label>

              {profile.subscriptions.length > 0 && <SubscriptionSummary subscriptions={profile.subscriptions} showPeriod />}

              {profile.testResults.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-1"><BookOpen size={14} aria-hidden /> {t('testHistory')}</h4>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {profile.testResults.map((r) => (
                      <div key={r.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 text-xs">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-text-primary truncate">{r.testTitle}</p>
                          <p className="text-text-secondary">{r.subject}</p>
                        </div>
                        <span className={`font-bold ml-2 ${r.percentage >= 70 ? 'text-green-600' : r.percentage >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>{r.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!pending && error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{tc('error')}</p>}

              <button
                type="button"
                onClick={() => { setError(''); setPending({ kind: 'ban' }); }}
                className={user.isBanned ? `${actionButtonClass} w-full bg-green-100 text-green-700 hover:bg-green-200` : `${dangerOutlineClass} w-full`}
              >
                {user.isBanned ? <ShieldCheck size={16} aria-hidden /> : <Ban size={16} aria-hidden />}
                {user.isBanned ? t('unban') : t('ban')}
              </button>
            </div>
          )}
        </div>
      </div>

      {pending && user && (
        <div onClick={(e) => e.stopPropagation()}>
          <ConfirmDialog
            title={pending.kind === 'ban' ? t(user.isBanned ? 'unbanTitle' : 'banTitle') : t('roleTitle')}
            body={pending.kind === 'ban'
              ? t(user.isBanned ? 'unbanBody' : 'banBody', { name: displayName })
              : t('roleBody', { name: displayName, from: t(`roles.${user.role}`), to: t(`roles.${pending.role}`) })}
            confirmLabel={pending.kind === 'ban' ? t(user.isBanned ? 'unban' : 'ban') : t('roleConfirm')}
            danger={pending.kind === 'role' ? pending.role === 'ADMIN' : !user.isBanned}
            busy={busy}
            onConfirm={() => void apply()}
            onClose={() => { setPending(null); setBanReason(''); setError(''); }}
          >
            {pending.kind === 'ban' && !user.isBanned && (
              <label className="flex flex-col gap-1 text-sm">
                <span>{t('banReason')}</span>
                <textarea className={`${fieldClass} min-h-20`} maxLength={300} value={banReason} onChange={(e) => setBanReason(e.target.value)} />
              </label>
            )}
            {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{tc('error')}</p>}
          </ConfirmDialog>
        </div>
      )}
    </div>
  );
}
