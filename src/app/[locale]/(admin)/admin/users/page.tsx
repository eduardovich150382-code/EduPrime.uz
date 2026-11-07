'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Search, User,
  Mail, MessageCircle, Loader2, RefreshCw, Eye, Clock, MessageSquare,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import BackButton from '@/components/ui/BackButton';
import SendMessageDialog, { type MessageRecipient } from '@/components/admin/SendMessageDialog';
import UserProfileModal, { type AdminRole, type UserPatch } from '@/components/admin/UserProfileModal';
import RoleBadge from '@/components/admin/RoleBadge';
import { actionButtonClass } from '@/components/admin/AdminFields';

interface UserData {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  telegramUsername: string | null;
  hasTelegram: boolean;
  role: AdminRole;
  lastActiveAt: string | null;
  isBanned: boolean;
  createdAt: string;
  _count: { testResults: number };
}

// API bir so'rovda ko'pi bilan 100 ta qaytaradi (sanitizePagination); 50 — mobil uchun yengil sahifa.
const PAGE_SIZE = 50;

function recipient(user: UserData): MessageRecipient {
  return { id: user.id, name: user.name, username: user.telegramUsername, hasTelegram: user.hasTelegram };
}

export default function AdminUsersPage() {
  const t = useTranslations('adminUsers');
  const tc = useTranslations('adminCommon');
  const tp = useTranslations('adminUsersPager');
  const locale = useLocale();
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [messageTarget, setMessageTarget] = useState<MessageRecipient | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [total, setTotal] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const day = (value: string) => new Date(value).toLocaleDateString(locale, { timeZone: 'Asia/Tashkent' });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search: debouncedSearch,
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
    setLoading(false);
  };

  // Qidiruv o'zgarsa birinchi sahifaga qaytamiz — aks holda 5-sahifada qolib, natija bo'sh ko'rinadi.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchUsers();
  }, [page, debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const goToPage = (next: number) => {
    setPage(Math.min(Math.max(1, next), totalPages));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Profil oynasida ban/rol o'zgarsa ro'yxat qayta yuklanmaydi — qator joyida yangilanadi.
  const applyPatch = (userId: string, patch: UserPatch) => {
    setUsers((list) => list.map((u) => (u.id === userId ? { ...u, ...patch } : u)));
  };

  const rowActions = (user: UserData) => (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => setSelectedUserId(user.id)} className={`${actionButtonClass} bg-primary-50 text-primary-700 hover:bg-primary-100`}>
        <Eye size={16} aria-hidden /> {t('profile')}
      </button>
      <button type="button" onClick={() => setMessageTarget(recipient(user))} className={`${actionButtonClass} border border-border text-text-primary hover:bg-gray-50`}>
        <MessageSquare size={16} aria-hidden /> {t('message')}
      </button>
    </div>
  );

  const contacts = (user: UserData) => (
    <>
      {user.email && <span className="flex items-center gap-0.5 min-w-0 break-all"><Mail size={10} aria-hidden />{user.email}</span>}
      {user.telegramUsername && <span className="flex items-center gap-0.5"><MessageCircle size={10} aria-hidden />@{user.telegramUsername}</span>}
    </>
  );

  const avatar = (user: UserData, size: string) => user.image ? (
    <img src={user.image} alt="" className={`${size} rounded-full object-cover flex-shrink-0`} />
  ) : (
    <div className={`${size} rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0`}>
      <User size={16} className="text-primary-600" aria-hidden />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <BackButton className="mb-2 min-h-11" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Users size={24} className="text-primary-600" aria-hidden />
            {t('title')}
          </h1>
          <p className="text-text-secondary mt-1">{t('total', { count: total })}</p>
        </div>
        <button type="button" onClick={fetchUsers} className="btn-ghost min-h-11 flex items-center gap-2 self-start">
          <RefreshCw size={16} aria-hidden />
          {tc('refresh')}
        </button>
      </motion.div>

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" aria-hidden />
        <input
          type="text"
          aria-label={t('searchPlaceholder')}
          placeholder={t('searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all"
        />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        {loading ? (
          <div className="card p-12 text-center">
            <Loader2 size={32} className="animate-spin text-primary-600 mx-auto mb-2" />
            <p className="text-text-secondary text-sm">{tc('loading')}</p>
          </div>
        ) : users.length === 0 ? (
          <div className="card p-12 text-center">
            <Users size={48} className="text-text-secondary mx-auto mb-4 opacity-30" aria-hidden />
            <p className="text-text-secondary">{t('empty')}</p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {users.map((user) => (
                <div key={user.id} className="card p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    {avatar(user, 'w-10 h-10')}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-text-primary text-sm truncate">{user.name || tc('unnamed')}</p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-text-secondary">{contacts(user)}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <RoleBadge role={user.role} />
                    <span className="text-xs text-text-secondary">{t('testsCount', { count: user._count.testResults })}</span>
                    {user.isBanned && <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-medium">{t('banned')}</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary">
                    <span>{t('registeredAt', { date: day(user.createdAt) })}</span>
                    {user.lastActiveAt && <span className="flex items-center gap-0.5"><Clock size={10} aria-hidden /> {day(user.lastActiveAt)}</span>}
                  </div>
                  {rowActions(user)}
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="card overflow-hidden hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-gray-50">
                      {(['user', 'role', 'tests', 'date', 'actions'] as const).map((col) => (
                        <th key={col} className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase">{t(`columns.${col}`)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b border-border hover:bg-primary-50/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {avatar(user, 'w-9 h-9')}
                            <div className="min-w-0">
                              <p className="font-medium text-text-primary text-sm">
                                {user.name || tc('unnamed')}
                                {user.isBanned && <span className="ml-2 px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-medium">{t('banned')}</span>}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-text-secondary">{contacts(user)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4"><RoleBadge role={user.role} /></td>
                        <td className="px-6 py-4 text-sm text-text-secondary">{user._count.testResults}</td>
                        <td className="px-6 py-4 text-sm text-text-secondary">{day(user.createdAt)}</td>
                        <td className="px-6 py-4">{rowActions(user)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sahifalash */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1}
                  aria-label={tp('prev')}
                  className="min-h-11 px-4 rounded-xl border border-border bg-white text-sm font-medium flex items-center gap-1 hover:bg-primary-50 disabled:opacity-40 disabled:hover:bg-white"
                >
                  <ChevronLeft size={16} aria-hidden />
                  <span className="hidden sm:inline">{tp('prev')}</span>
                </button>
                <div className="text-center text-sm text-text-secondary">
                  <p className="font-medium text-text-primary">{tp('pageOf', { page, pages: totalPages })}</p>
                  <p className="text-xs">
                    {tp('range', {
                      from: (page - 1) * PAGE_SIZE + 1,
                      to: Math.min(page * PAGE_SIZE, total),
                      total,
                    })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= totalPages}
                  aria-label={tp('next')}
                  className="min-h-11 px-4 rounded-xl border border-border bg-white text-sm font-medium flex items-center gap-1 hover:bg-primary-50 disabled:opacity-40 disabled:hover:bg-white"
                >
                  <span className="hidden sm:inline">{tp('next')}</span>
                  <ChevronRight size={16} aria-hidden />
                </button>
              </div>
            )}
          </>
        )}
      </motion.div>

      {messageTarget && (
        <SendMessageDialog open user={messageTarget} onClose={() => setMessageTarget(null)} />
      )}

      {selectedUserId && (
        <UserProfileModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} onChanged={applyPatch} />
      )}
    </div>
  );
}
