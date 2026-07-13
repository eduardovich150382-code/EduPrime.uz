'use client';

import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { User, Mail, MessageCircle, Globe, Crown, Calendar, Edit } from 'lucide-react';

export default function ProfilePage() {
  const { data: session } = useSession();

  const user = session?.user;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-text-primary">Profil</h1>
        <p className="text-text-secondary mt-1">Shaxsiy ma&apos;lumotlaringiz</p>
      </motion.div>

      {/* Profile card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card-elevated p-8"
      >
        <div className="flex items-center gap-5 mb-8">
          {user?.image ? (
            <img
              src={user.image}
              alt={user.name || ''}
              className="w-20 h-20 rounded-2xl object-cover border-4 border-primary-100"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-primary-100 flex items-center justify-center">
              <User size={36} className="text-primary-600" />
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold text-text-primary">{user?.name || 'Foydalanuvchi'}</h2>
            <p className="text-sm text-text-secondary">{user?.email || 'Email kiritilmagan'}</p>
            <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-xs font-medium">
              <Crown size={12} />
              Bepul reja
            </span>
          </div>
        </div>

        {/* Info fields */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-background">
            <div className="flex items-center gap-3">
              <User size={18} className="text-text-secondary" />
              <div>
                <p className="text-xs text-text-secondary">Ism</p>
                <p className="text-sm font-medium text-text-primary">{user?.name || '-'}</p>
              </div>
            </div>
            <button className="p-2 rounded-lg hover:bg-primary-50 transition-colors">
              <Edit size={14} className="text-text-secondary" />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-background">
            <div className="flex items-center gap-3">
              <Mail size={18} className="text-text-secondary" />
              <div>
                <p className="text-xs text-text-secondary">Email</p>
                <p className="text-sm font-medium text-text-primary">{user?.email || '-'}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-background">
            <div className="flex items-center gap-3">
              <MessageCircle size={18} className="text-text-secondary" />
              <div>
                <p className="text-xs text-text-secondary">Telegram</p>
                <p className="text-sm font-medium text-text-primary">{(session?.user as any)?.telegramId ? 'Ulangan' : 'Ulanmagan'}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-background">
            <div className="flex items-center gap-3">
              <Globe size={18} className="text-text-secondary" />
              <div>
                <p className="text-xs text-text-secondary">Til</p>
                <p className="text-sm font-medium text-text-primary">O&apos;zbekcha</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-background">
            <div className="flex items-center gap-3">
              <Calendar size={18} className="text-text-secondary" />
              <div>
                <p className="text-xs text-text-secondary">Ro&apos;yxatdan o&apos;tgan</p>
                <p className="text-sm font-medium text-text-primary">Iyul 2026</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
