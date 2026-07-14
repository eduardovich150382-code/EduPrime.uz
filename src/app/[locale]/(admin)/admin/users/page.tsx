'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import {
  Users, Search, Shield, GraduationCap, User, Crown, 
  MoreVertical, Check, X, Mail, MessageCircle,
} from 'lucide-react';

// Mock users
const mockUsers = [
  { id: '1', name: 'Elton Elton', email: 'elton@gmail.com', telegramUsername: '@elton', role: 'USER', plan: 'Bepul', createdAt: '2026-07-14' },
  { id: '2', name: 'Sardor Aliyev', email: 'sardor@mail.ru', telegramUsername: '@sardor_a', role: 'USER', plan: 'Premium', createdAt: '2026-07-13' },
  { id: '3', name: 'Nilufar Karimova', email: null, telegramUsername: '@nilufar_k', role: 'TEACHER', plan: 'Ustoz', createdAt: '2026-07-12' },
  { id: '4', name: 'Admin User', email: 'admin@eduprime.uz', telegramUsername: '@admin', role: 'ADMIN', plan: 'Full', createdAt: '2026-07-10' },
];

function getRoleBadge(role: string) {
  switch (role) {
    case 'ADMIN': return <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium flex items-center gap-1"><Shield size={10} /> Admin</span>;
    case 'TEACHER': return <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-medium flex items-center gap-1"><GraduationCap size={10} /> Ustoz</span>;
    default: return <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium flex items-center gap-1"><User size={10} /> User</span>;
  }
}

export default function AdminUsersPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsers = mockUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.telegramUsername?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Users size={24} className="text-primary-600" />
            Foydalanuvchilar
          </h1>
          <p className="text-text-secondary mt-1">Jami: {mockUsers.length} ta foydalanuvchi</p>
        </div>
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

      {/* Users table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase">Foydalanuvchi</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase">Rol</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase">Tarif</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase">Sana</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase">Amallar</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-border hover:bg-primary-50/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center">
                        <User size={16} className="text-primary-600" />
                      </div>
                      <div>
                        <p className="font-medium text-text-primary text-sm">{user.name}</p>
                        <div className="flex items-center gap-2 text-xs text-text-secondary">
                          {user.email && <span className="flex items-center gap-0.5"><Mail size={10} />{user.email}</span>}
                          {user.telegramUsername && <span className="flex items-center gap-0.5"><MessageCircle size={10} />{user.telegramUsername}</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      user.plan === 'Bepul' ? 'bg-gray-100 text-gray-700' :
                      user.plan === 'Premium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {user.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-text-secondary">{user.createdAt}</td>
                  <td className="px-6 py-4">
                    <button className="p-2 rounded-lg hover:bg-primary-50 transition-colors text-text-secondary">
                      <MoreVertical size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
