'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Shield, Search, User, Lock, Unlock, Check, X,
  Loader2, RefreshCw,
} from 'lucide-react';

interface CategoryData {
  id: string;
  nameUz: string;
  nameRu: string;
  nameEn: string;
  type: string;
  icon: string | null;
}

interface UserData {
  id: string;
  name: string | null;
  email: string | null;
  telegramUsername: string | null;
  role: string;
}

interface PermissionData {
  id: string;
  userId: string;
  categoryId: string;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  category: { id: string; nameUz: string; type: string; icon: string | null };
}

export default function PermissionsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [userPermissions, setUserPermissions] = useState<PermissionData[]>([]);
  const [searchResults, setSearchResults] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/admin/permissions');
        const data = await res.json();
        if (data.categories) setCategories(data.categories);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    };
    fetchCategories();
  }, []);

  // Search users
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/admin/permissions?search=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        if (data.users) setSearchResults(data.users);
      } catch (error) {
        console.error('Search failed:', error);
      }
      setSearchLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Select user and load permissions
  const selectUser = async (user: UserData) => {
    setSelectedUser(user);
    setSearchResults([]);
    setSearchQuery('');
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/permissions?userId=${user.id}`);
      const data = await res.json();
      if (data.permissions) setUserPermissions(data.permissions);
      if (data.categories) setCategories(data.categories);
    } catch (error) {
      console.error('Failed to load permissions:', error);
    }
    setLoading(false);
  };

  // Check if category is granted
  const isGranted = (categoryId: string) => {
    return userPermissions.some(p => p.categoryId === categoryId && p.isActive);
  };

  // Toggle permission
  const togglePermission = async (categoryId: string) => {
    if (!selectedUser) return;
    setSaving(true);

    try {
      if (isGranted(categoryId)) {
        // Revoke
        const res = await fetch('/api/admin/permissions', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: selectedUser.id, categoryId }),
        });
        if (res.ok) {
          setUserPermissions(prev =>
            prev.map(p => p.categoryId === categoryId ? { ...p, isActive: false } : p)
          );
        }
      } else {
        // Grant
        const res = await fetch('/api/admin/permissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: selectedUser.id, categoryId }),
        });
        if (res.ok) {
          const data = await res.json();
          setUserPermissions(prev => {
            const existing = prev.find(p => p.categoryId === categoryId);
            if (existing) {
              return prev.map(p => p.categoryId === categoryId ? { ...p, isActive: true } : p);
            }
            return [...prev, {
              id: data.permission.id,
              userId: selectedUser.id,
              categoryId,
              isActive: true,
              expiresAt: null,
              createdAt: new Date().toISOString(),
              category: categories.find(c => c.id === categoryId) as any,
            }];
          });
        }
      }
    } catch (error) {
      alert('Xatolik yuz berdi');
    }
    setSaving(false);
  };

  // Grant all
  const grantAll = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      for (const cat of categories) {
        if (!isGranted(cat.id)) {
          await fetch('/api/admin/permissions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: selectedUser.id, categoryId: cat.id }),
          });
        }
      }
      // Reload permissions
      const res = await fetch(`/api/admin/permissions?userId=${selectedUser.id}`);
      const data = await res.json();
      if (data.permissions) setUserPermissions(data.permissions);
    } catch (error) {
      alert('Xatolik yuz berdi');
    }
    setSaving(false);
  };

  // Revoke all
  const revokeAll = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      for (const cat of categories) {
        if (isGranted(cat.id)) {
          await fetch('/api/admin/permissions', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: selectedUser.id, categoryId: cat.id }),
          });
        }
      }
      setUserPermissions(prev => prev.map(p => ({ ...p, isActive: false })));
    } catch (error) {
      alert('Xatolik yuz berdi');
    }
    setSaving(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Shield size={24} className="text-primary-600" />
          Ruxsatlar boshqaruvi
        </h1>
        <p className="text-text-secondary mt-1">
          Foydalanuvchilarga kategoriyalar bo&apos;yicha alohida ruxsat bering yoki barchasini bir vaqtda boshqaring
        </p>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative"
      >
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            placeholder="Foydalanuvchini qidiring (ism, email, telegram)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all"
          />
          {searchLoading && (
            <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-primary-600" />
          )}
        </div>

        {/* Search results dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-border rounded-xl shadow-lg z-10 max-h-64 overflow-y-auto">
            {searchResults.map((user) => (
              <button
                key={user.id}
                onClick={() => selectUser(user)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary-50 transition-colors text-left border-b border-border last:border-b-0"
              >
                <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                  <User size={16} className="text-primary-600" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-text-primary text-sm truncate">{user.name || 'Nomsiz'}</p>
                  <p className="text-xs text-text-secondary truncate">
                    {user.telegramUsername ? `@${user.telegramUsername}` : user.email || ''}
                  </p>
                </div>
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-gray-100 text-text-secondary shrink-0">
                  {user.role}
                </span>
              </button>
            ))}
          </div>
        )}
      </motion.div>

      {/* User permission card */}
      {selectedUser ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-4 sm:p-6"
        >
          {/* User info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-border">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                <User size={18} className="text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-text-primary">{selectedUser.name || 'Nomsiz'}</h3>
                <p className="text-sm text-text-secondary">
                  {selectedUser.telegramUsername ? `@${selectedUser.telegramUsername}` : selectedUser.email || ''}
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-xs font-medium self-start sm:self-auto">
              {selectedUser.role}
            </span>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <Loader2 size={24} className="animate-spin text-primary-600 mx-auto mb-2" />
              <p className="text-text-secondary text-sm">Ruxsatlar yuklanmoqda...</p>
            </div>
          ) : (
            <>
              {/* Categories permission grid */}
              <div className="space-y-2 sm:space-y-3 mb-6">
                {categories.map((category) => {
                  const granted = isGranted(category.id);
                  return (
                    <div
                      key={category.id}
                      className={`flex items-center justify-between p-3 sm:p-4 rounded-xl border transition-all ${
                        granted ? 'border-green-200 bg-green-50/50' : 'border-border'
                      }`}
                    >
                      <div className="flex items-center gap-2 sm:gap-3">
                        <span className="text-sm sm:text-base">{category.icon || '📚'}</span>
                        <span className="font-medium text-text-primary text-xs sm:text-sm">{category.nameUz}</span>
                      </div>
                      <button
                        onClick={() => togglePermission(category.id)}
                        disabled={saving}
                        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all disabled:opacity-50 ${
                          granted
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-text-secondary hover:bg-primary-50 hover:text-primary-600'
                        }`}
                      >
                        {granted ? (
                          <>
                            <Unlock size={12} />
                            <span className="hidden sm:inline">Ochiq</span>
                          </>
                        ) : (
                          <>
                            <Lock size={12} />
                            <span className="hidden sm:inline">Yopiq</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Bulk actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 pt-4 border-t border-border">
                <button
                  onClick={grantAll}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-100 text-green-700 text-sm font-medium hover:bg-green-200 transition-colors disabled:opacity-50"
                >
                  <Unlock size={14} />
                  BARCHASINI OCHISH
                </button>
                <button
                  onClick={revokeAll}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-100 text-red-700 text-sm font-medium hover:bg-red-200 transition-colors disabled:opacity-50"
                >
                  <Lock size={14} />
                  BARCHASINI YOPISH
                </button>
              </div>
            </>
          )}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-12 text-center"
        >
          <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield size={32} className="text-primary-600" />
          </div>
          <h3 className="font-semibold text-text-primary mb-2">Foydalanuvchini tanlang</h3>
          <p className="text-text-secondary text-sm">
            Yuqoridagi qidiruv orqali foydalanuvchini toping va ruxsatlarni boshqaring
          </p>
        </motion.div>
      )}
    </div>
  );
}
