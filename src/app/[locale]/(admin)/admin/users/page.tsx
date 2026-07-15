'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Search, Shield, GraduationCap, User, Crown,
  Mail, MessageCircle, Loader2, RefreshCw,
} from 'lucide-react';

interface UserData {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  telegramUsername: string | null;
  role: string;
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
                    </div>
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

                  <p className="text-xs text-text-secondary">
                    Ro&apos;yxatdan: {new Date(user.createdAt).toLocaleDateString('uz-UZ')}
                  </p>
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
                      <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase">Rol o&apos;zgartirish</th>
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
    </div>
  );
}
