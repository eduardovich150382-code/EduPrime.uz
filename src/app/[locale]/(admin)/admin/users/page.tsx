'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Search, Shield, GraduationCap, User, Crown,
  Mail, MessageCircle, Loader2, RefreshCw, Eye, Ban, X, BookOpen, Clock,
} from 'lucide-react';
import BackButton from '@/components/ui/BackButton';

interface UserData {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  telegramUsername: string | null;
  role: string;
  lastActiveAt: string | null;
  isBanned: boolean;
  createdAt: string;
  _count: { testResults: number };
}

function getRoleBadge(role: string) {
  switch (role) {
    case 'ADMIN': return <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium flex items-center gap-1"><Shield size={10} /> Admin</span>;
    case 'TEACHER': return <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-medium flex items-center gap-1"><GraduationCap size={10} /> Ustoz</span>;
    default: return <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium flex items-center gap-1"><User size={10} /> User</span>;
  }
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [total, setTotal] = useState(0);
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const viewProfile = async (userId: string) => {
    setSelectedUserId(userId);
    setProfileLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      const data = await res.json();
      if (res.ok) setProfileData(data);
    } catch {}
    setProfileLoading(false);
  };

  const toggleBan = async (userId: string, currentBanned: boolean) => {
    const reason = currentBanned ? '' : prompt('Ban sababi (ixtiyoriy):') || '';
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ban: !currentBanned, banReason: reason }),
      });
      if (res.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, isBanned: !currentBanned } : u));
        if (profileData?.user?.id === userId) {
          setProfileData({ ...profileData, user: { ...profileData.user, isBanned: !currentBanned } });
        }
      }
    } catch { alert('Xatolik'); }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(searchQuery)}`);
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

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const timer = setTimeout(fetchUsers, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const changeRole = async (userId: string, newRole: string) => {
    setChangingRole(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newRole }),
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      } else {
        alert(data.error || 'Xatolik');
      }
    } catch (error) {
      alert('Server xatolik');
    }
    setChangingRole(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <BackButton className="mb-2" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Users size={24} className="text-primary-600" />
            Foydalanuvchilar
          </h1>
          <p className="text-text-secondary mt-1">Jami: {total} ta</p>
        </div>
        <button onClick={fetchUsers} className="btn-ghost flex items-center gap-2 self-start">
          <RefreshCw size={16} />
          Yangilash
        </button>
      </motion.div>

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
        <input
          type="text"
          placeholder="Ism, email yoki telegram bo'yicha qidiring..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all"
        />
      </div>

      {/* Users */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {loading ? (
          <div className="card p-12 text-center">
            <Loader2 size={32} className="animate-spin text-primary-600 mx-auto mb-2" />
            <p className="text-text-secondary text-sm">Yuklanmoqda...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="card p-12 text-center">
            <Users size={48} className="text-text-secondary mx-auto mb-4 opacity-30" />
            <p className="text-text-secondary">Foydalanuvchilar topilmadi</p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {users.map((user) => (
                <div key={user.id} className="card p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    {user.image ? (
                      <img src={user.image} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                        <User size={18} className="text-primary-600" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-text-primary text-sm truncate">{user.name || 'Nomsiz'}</p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-text-secondary">
                        {user.email && (
                          <span className="flex items-center gap-0.5 truncate">
                            <Mail size={10} />{user.email}
                          </span>
                        )}
                        {user.telegramUsername && (
                          <span className="flex items-center gap-0.5">
                            <MessageCircle size={10} />@{user.telegramUsername}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getRoleBadge(user.role)}
                      <span className="text-xs text-text-secondary">{user._count.testResults} test</span>
                      {user.isBanned && <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-medium">Bloklangan</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => viewProfile(user.id)} className="p-1.5 rounded-lg hover:bg-primary-50 text-primary-600" title="Profil">
                        <Eye size={14} />
                      </button>
                      <button onClick={() => toggleBan(user.id, user.isBanned)} className={`p-1.5 rounded-lg ${user.isBanned ? 'hover:bg-green-50 text-green-600' : 'hover:bg-red-50 text-red-500'}`} title={user.isBanned ? 'Blokni olish' : 'Bloklash'}>
                        <Ban size={14} />
                      </button>
                      <select
                        value={user.role}
                        onChange={(e) => changeRole(user.id, e.target.value)}
                        disabled={changingRole === user.id}
                        className="px-2 py-1 rounded-lg border border-border text-xs font-medium bg-white focus:ring-2 focus:ring-primary-500/20 disabled:opacity-50"
                      >
                        <option value="USER">USER</option>
                        <option value="TEACHER">TEACHER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-text-secondary">
                    <span>Ro&apos;yxatdan: {new Date(user.createdAt).toLocaleDateString('uz-UZ')}</span>
                    {user.lastActiveAt && (
                      <span className="flex items-center gap-0.5"><Clock size={10} /> {new Date(user.lastActiveAt).toLocaleDateString('uz-UZ')}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="card overflow-hidden hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-gray-50">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase">Foydalanuvchi</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase">Rol</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase">Testlar</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase">Sana</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase">Amallar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b border-border hover:bg-primary-50/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {user.image ? (
                              <img src={user.image} alt="" className="w-9 h-9 rounded-full object-cover" />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center">
                                <User size={16} className="text-primary-600" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-text-primary text-sm">{user.name || 'Nomsiz'}</p>
                              <div className="flex items-center gap-2 text-xs text-text-secondary">
                                {user.email && <span className="flex items-center gap-0.5"><Mail size={10} />{user.email}</span>}
                                {user.telegramUsername && <span className="flex items-center gap-0.5"><MessageCircle size={10} />@{user.telegramUsername}</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                        <td className="px-6 py-4 text-sm text-text-secondary">{user._count.testResults} ta</td>
                        <td className="px-6 py-4 text-sm text-text-secondary">
                          {new Date(user.createdAt).toLocaleDateString('uz-UZ')}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            <button onClick={() => viewProfile(user.id)} className="p-2 rounded-lg hover:bg-primary-50 text-primary-600 transition-colors" title="Profil ko'rish">
                              <Eye size={15} />
                            </button>
                            <button onClick={() => toggleBan(user.id, user.isBanned)} className={`p-2 rounded-lg transition-colors ${user.isBanned ? 'hover:bg-green-50 text-green-600' : 'hover:bg-red-50 text-red-500'}`} title={user.isBanned ? 'Blokni olish' : 'Bloklash'}>
                              <Ban size={15} />
                            </button>
                            <select
                              value={user.role}
                              onChange={(e) => changeRole(user.id, e.target.value)}
                              disabled={changingRole === user.id}
                              className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium bg-white focus:ring-2 focus:ring-primary-500/20 disabled:opacity-50"
                            >
                              <option value="USER">USER</option>
                              <option value="TEACHER">TEACHER</option>
                              <option value="ADMIN">ADMIN</option>
                            </select>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </motion.div>

      {/* Profile Modal */}
      {selectedUserId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setSelectedUserId(null); setProfileData(null); }}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold text-text-primary">Foydalanuvchi profili</h3>
              <button onClick={() => { setSelectedUserId(null); setProfileData(null); }} className="p-2 rounded-lg hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[70vh]">
              {profileLoading ? (
                <div className="text-center py-8"><Loader2 size={24} className="animate-spin text-primary-600 mx-auto" /></div>
              ) : profileData ? (
                <div className="space-y-4">
                  {/* User info */}
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden">
                      {profileData.user.image ? <img src={profileData.user.image} alt="" className="w-full h-full object-cover" /> : <User size={20} className="text-primary-600" />}
                    </div>
                    <div>
                      <p className="font-semibold text-text-primary">{profileData.user.name || 'Nomsiz'}</p>
                      <p className="text-xs text-text-secondary">{profileData.user.email || profileData.user.telegramUsername ? `@${profileData.user.telegramUsername}` : ''}</p>
                    </div>
                    {profileData.user.isBanned && <span className="ml-auto px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium">Bloklangan</span>}
                  </div>
                  {/* Details */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-gray-50"><span className="text-text-secondary">Rol:</span> <span className="font-medium">{profileData.user.role}</span></div>
                    <div className="p-2.5 rounded-lg bg-gray-50"><span className="text-text-secondary">Testlar:</span> <span className="font-medium">{profileData.user._count.testResults}</span></div>
                    <div className="p-2.5 rounded-lg bg-gray-50"><span className="text-text-secondary">Referral:</span> <span className="font-medium">{profileData.user._count.referralsMade}</span></div>
                    <div className="p-2.5 rounded-lg bg-gray-50"><span className="text-text-secondary">To&apos;lovlar:</span> <span className="font-medium">{profileData.user._count.payments}</span></div>
                    <div className="p-2.5 rounded-lg bg-gray-50"><span className="text-text-secondary">Ro&apos;yxatdan:</span> <span className="font-medium">{new Date(profileData.user.createdAt).toLocaleDateString('uz-UZ')}</span></div>
                    <div className="p-2.5 rounded-lg bg-gray-50"><span className="text-text-secondary">Oxirgi:</span> <span className="font-medium">{profileData.user.lastActiveAt ? new Date(profileData.user.lastActiveAt).toLocaleDateString('uz-UZ') : '—'}</span></div>
                  </div>
                  {/* Subscriptions */}
                  {profileData.subscriptions.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-text-primary mb-2">Aktiv obunalar</h4>
                      {profileData.subscriptions.map((s: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-purple-50 text-xs mb-1">
                          <span className="font-medium text-purple-700">{s.plan === 'PREMIUM' ? 'Premium' : 'Ustoz'}</span>
                          <span className="text-text-secondary">gacha: {new Date(s.endDate).toLocaleDateString('uz-UZ')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Test history */}
                  {profileData.testResults.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-1"><BookOpen size={14} /> Test tarixi (oxirgi 20)</h4>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {profileData.testResults.map((r: any) => (
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
                  {/* Ban button */}
                  <button
                    onClick={() => toggleBan(profileData.user.id, profileData.user.isBanned)}
                    className={`w-full py-2.5 rounded-xl text-sm font-medium ${profileData.user.isBanned ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'} transition-colors`}
                  >
                    {profileData.user.isBanned ? 'Blokni olib tashlash' : 'Foydalanuvchini bloklash'}
                  </button>
                </div>
              ) : (
                <p className="text-center text-text-secondary py-4">Ma&apos;lumot topilmadi</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
