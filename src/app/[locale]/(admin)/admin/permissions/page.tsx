'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Shield, Search, User, Lock, Unlock, Check, X,
  GraduationCap, School, Award, Globe2, Atom, FileCheck,
} from 'lucide-react';

const categories = [
  { id: 'dtm', name: 'DTM testlari', icon: GraduationCap },
  { id: 'school', name: 'Maktab testlari', icon: School },
  { id: 'attestation_math', name: 'Attestatsiya (Matematika)', icon: Award },
  { id: 'attestation_physics', name: 'Attestatsiya (Fizika)', icon: Award },
  { id: 'attestation_chemistry', name: 'Attestatsiya (Kimyo)', icon: Award },
  { id: 'sat', name: 'SAT', icon: Globe2 },
  { id: 'gre', name: 'GRE Physics', icon: Atom },
  { id: 'certificate', name: 'Milliy Sertifikat', icon: FileCheck },
];

// Mock user for permission management
const mockUser = {
  id: '1',
  name: 'Alisher Karimov',
  telegramUsername: '@alisher_k',
  plan: 'Premium',
  permissions: ['dtm', 'school', 'certificate'],
};

export default function PermissionsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(mockUser);
  const [userPermissions, setUserPermissions] = useState<string[]>(mockUser.permissions);

  const togglePermission = (categoryId: string) => {
    if (userPermissions.includes(categoryId)) {
      setUserPermissions(userPermissions.filter((p) => p !== categoryId));
    } else {
      setUserPermissions([...userPermissions, categoryId]);
    }
  };

  const grantAll = () => {
    setUserPermissions(categories.map((c) => c.id));
  };

  const revokeAll = () => {
    setUserPermissions([]);
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
      >
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            placeholder="Foydalanuvchini qidiring (ism, telegram username)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all"
          />
        </div>
      </motion.div>

      {/* User permission card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card p-6"
      >
        {/* User info */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
              <User size={20} className="text-primary-600" />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary">{selectedUser.name}</h3>
              <p className="text-sm text-text-secondary">{selectedUser.telegramUsername}</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-xs font-medium">
            {selectedUser.plan}
          </span>
        </div>

        {/* Categories permission grid */}
        <div className="space-y-3 mb-6">
          {categories.map((category) => {
            const isGranted = userPermissions.includes(category.id);
            const Icon = category.icon;
            return (
              <div
                key={category.id}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                  isGranted ? 'border-green-200 bg-green-50/50' : 'border-border'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} className={isGranted ? 'text-green-600' : 'text-text-secondary'} />
                  <span className="font-medium text-text-primary text-sm">{category.name}</span>
                </div>
                <button
                  onClick={() => togglePermission(category.id)}
                  className={`px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                    isGranted
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 text-text-secondary hover:bg-primary-50 hover:text-primary-600'
                  }`}
                >
                  {isGranted ? (
                    <>
                      <Unlock size={12} />
                      Ochiq
                    </>
                  ) : (
                    <>
                      <Lock size={12} />
                      Yopiq
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Bulk actions */}
        <div className="flex items-center gap-3 pt-4 border-t border-border">
          <button
            onClick={grantAll}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-100 text-green-700 text-sm font-medium hover:bg-green-200 transition-colors"
          >
            <Unlock size={14} />
            BARCHASINI OCHISH
          </button>
          <button
            onClick={revokeAll}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-100 text-red-700 text-sm font-medium hover:bg-red-200 transition-colors"
          >
            <Lock size={14} />
            BARCHASINI YOPISH
          </button>
          <button className="ml-auto btn-primary !py-2.5 text-sm flex items-center gap-2">
            <Check size={14} />
            Saqlash
          </button>
        </div>
      </motion.div>
    </div>
  );
}
