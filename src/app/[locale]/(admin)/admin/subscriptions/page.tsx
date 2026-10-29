'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import SubscriptionGrantForm from '@/components/admin/SubscriptionGrantForm';
import SubscriptionItem, { type AdminSubscription } from '@/components/admin/SubscriptionItem';
import { adminFetch, buttonClass, ErrorMessage, errorCode } from '@/components/admin/AdminFields';
import { localName, type AdminUser, type LocalName } from '@/components/admin/product-types';

interface SubUser extends AdminUser { subscriptions: AdminSubscription[] }
interface Stats { totalUsers: number; premiumCount: number; teacherCount: number; freeCount: number; expiringCount: number; products: { id: string; name: LocalName; count: number }[] }
const filters = ['all', 'premium', 'teacher', 'legacy', 'category', 'bundle', 'free', 'expiring', 'cancelled'] as const;

export default function SubscriptionsPage() {
  const t = useTranslations('adminProducts');
  const tSubscription = useTranslations('subscriptionUi');
  const locale = useLocale();
  const [filter, setFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [users, setUsers] = useState<SubUser[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async (signal?: AbortSignal) => {
    const data = await adminFetch<{ users: SubUser[]; total: number; stats: Stats }>(`/api/admin/subscriptions?filter=${filter}&page=${page}&limit=30`, { signal });
    setUsers(data.users); setStats(data.stats); setTotal(data.total);
  }, [filter, page]);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    reload(controller.signal).catch((error) => { if (!controller.signal.aborted) setError(errorCode(error)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload]);
  return <div className="mx-auto max-w-6xl space-y-4"><h1 className="text-2xl font-bold">{t('subscriptions')}</h1>
    {stats && <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">{(['totalUsers', 'premiumCount', 'teacherCount', 'freeCount', 'expiringCount'] as const).map((key) => <div className="card p-3 text-center" key={key}><p className="text-xl font-bold">{stats[key]}</p><p className="text-sm">{t(`stats.${key}`)}</p></div>)}</div>}
    {stats && <section className="card space-y-2 p-3"><h2 className="font-semibold">{tSubscription('productStats')}</h2><div className="grid grid-cols-1 gap-2 sm:grid-cols-3">{stats.products.map((product) => <p key={product.id} className="min-w-0 break-words [overflow-wrap:anywhere]">{localName(product.name, locale)}: <strong>{product.count}</strong></p>)}</div></section>}
    <SubscriptionGrantForm onSaved={() => reload()} />
    <div className="flex flex-wrap gap-2">{filters.map((key) => <button type="button" key={key} aria-pressed={filter === key} className={`${buttonClass} ${filter === key ? 'bg-primary-50 text-primary-700' : ''}`} onClick={() => { setFilter(key); setPage(1); }}>{t(`filters.${key}`)}</button>)}</div>
    <ErrorMessage error={error} />
    {loading ? <p role="status">{t('loading')}</p> : !users.length ? <p>{t('noUsers')}</p> : users.map((user) => <div key={user.id} className="card space-y-3 p-4"><div className="break-words"><p className="font-semibold">{user.name || user.id}</p><p className="text-sm text-text-secondary">{user.email || user.telegramUsername}</p></div>{!user.subscriptions.length && <p>{t('filters.free')}</p>}{user.subscriptions.map((sub) => <SubscriptionItem key={sub.id} sub={sub} onChanged={() => reload()} />)}</div>)}
    <div className="flex items-center justify-between gap-3"><button type="button" className={buttonClass} disabled={page === 1 || loading} onClick={() => setPage(page - 1)}>{t('previous')}</button><span>{t('page', { page, total })}</span><button type="button" className={buttonClass} disabled={page * 30 >= total || loading} onClick={() => setPage(page + 1)}>{t('next')}</button></div>
  </div>;
}
