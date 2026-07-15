'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  MessageCircle,
  Globe,
  Crown,
  Calendar,
  Edit,
  Check,
  X,
  Camera,
  Shield,
  Link as LinkIcon,
} from 'lucide-react';
import { UploadButton } from '@/lib/uploadthing';

interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  telegramId: string | null;
  telegramUsername: string | null;
  googleId: string | null;
  role: string;
  lang: string;
  createdAt: string;
}

function formatDate(dateStr: string): string {
  const months = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
    'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr',
  ];
  const date = new Date(dateStr);
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month}, ${year}`;
}

function getRoleLabel(role: string): string {
  switch (role) {
    case 'ADMIN':
      return 'Admin';
    case 'TEACHER':
      return 'Ustoz';
    default:
      return 'Foydalanuvchi';
  }
}

function getRoleBadgeClasses(role: string): string {
  switch (role) {
    case 'ADMIN':
      return 'bg-red-100 text-red-700';
    case 'TEACHER':
      return 'bg-purple-100 text-purple-700';
    default:
      return 'bg-primary-100 text-primary-700';
  }
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/profile');
      if (res.ok) {
        const data = await res.json();
        setProfile(data.user);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [session, fetchProfile]);

  const handleSaveName = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data.user);
        setEditingName(false);
      }
    } catch (error) {
      console.error('Failed to save name:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpdate = async (imageUrl: string) => {
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageUrl }),
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data.user);
      }
    } catch (error) {
      console.error('Failed to update avatar:', error);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-32" />
          <div className="h-64 bg-gray-200 rounded-2xl" />
          <div className="h-48 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!session?.user || !profile) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <User size={48} className="mx-auto text-gray-400 mb-4" />
        <p className="text-text-secondary">Profilni ko&apos;rish uchun tizimga kiring</p>
      </div>
    );
  }

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

      {/* Avatar Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card-elevated p-8"
      >
        <div className="flex flex-col items-center">
          <div className="relative mb-4">
            {profile.image ? (
              <img
                src={profile.image}
                alt={profile.name || ''}
                className="w-28 h-28 rounded-full object-cover border-4 border-primary-100"
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-primary-100 flex items-center justify-center border-4 border-primary-50">
                <User size={48} className="text-primary-600" />
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-2">
            <UploadButton
              endpoint="avatar"
              onUploadBegin={() => setUploading(true)}
              onClientUploadComplete={(res) => {
                setUploading(false);
                if (res && res[0]) {
                  handleImageUpdate(res[0].url);
                }
              }}
              onUploadError={(error) => {
                setUploading(false);
                console.error('Upload error:', error);
              }}
              appearance={{
                button:
                  'inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-50 text-primary-600 text-sm font-medium hover:bg-primary-100 transition-colors ut-uploading:bg-primary-100',
                allowedContent: 'hidden',
              }}
              content={{
                button({ ready }) {
                  if (ready) return (
                    <span className="flex items-center gap-2">
                      <Camera size={16} />
                      Rasmni o&apos;zgartirish
                    </span>
                  );
                  return 'Yuklanmoqda...';
                },
              }}
            />
            <p className="text-xs text-text-secondary">Maksimum 1MB, rasm formati</p>
          </div>
        </div>
      </motion.div>

      {/* Personal Info Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card-elevated p-6"
      >
        <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Shield size={20} className="text-primary-600" />
          Shaxsiy ma&apos;lumotlar
        </h3>

        <div className="space-y-4">
          {/* Name field */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-background">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <User size={18} className="text-text-secondary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-text-secondary">Ism</p>
                {editingName ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="flex-1 min-w-0 px-3 py-1.5 text-sm border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Ismingiz"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveName();
                        if (e.key === 'Escape') setEditingName(false);
                      }}
                    />
                    <button
                      onClick={handleSaveName}
                      disabled={saving || !newName.trim()}
                      className="p-1.5 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition-colors disabled:opacity-50"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => setEditingName(false)}
                      className="p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <p className="text-sm font-medium text-text-primary">{profile.name || '-'}</p>
                )}
              </div>
            </div>
            {!editingName && (
              <button
                onClick={() => {
                  setNewName(profile.name || '');
                  setEditingName(true);
                }}
                className="p-2 rounded-lg hover:bg-primary-50 transition-colors shrink-0"
              >
                <Edit size={14} className="text-text-secondary" />
              </button>
            )}
          </div>

          {/* Email field */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-background">
            <div className="flex items-center gap-3">
              <Mail size={18} className="text-text-secondary" />
              <div>
                <p className="text-xs text-text-secondary">Email</p>
                <p className="text-sm font-medium text-text-primary">
                  {profile.email || 'Kiritilmagan'}
                </p>
              </div>
            </div>
          </div>

          {/* Role badge */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-background">
            <div className="flex items-center gap-3">
              <Crown size={18} className="text-text-secondary" />
              <div>
                <p className="text-xs text-text-secondary">Rol</p>
                <span
                  className={`inline-flex items-center gap-1 mt-0.5 px-3 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeClasses(profile.role)}`}
                >
                  {getRoleLabel(profile.role)}
                </span>
              </div>
            </div>
          </div>

          {/* Registration date */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-background">
            <div className="flex items-center gap-3">
              <Calendar size={18} className="text-text-secondary" />
              <div>
                <p className="text-xs text-text-secondary">Ro&apos;yxatdan o&apos;tgan</p>
                <p className="text-sm font-medium text-text-primary">
                  {formatDate(profile.createdAt)}
                </p>
              </div>
            </div>
          </div>

          {/* Language */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-background">
            <div className="flex items-center gap-3">
              <Globe size={18} className="text-text-secondary" />
              <div>
                <p className="text-xs text-text-secondary">Til</p>
                <p className="text-sm font-medium text-text-primary">
                  {profile.lang === 'uz'
                    ? "O'zbekcha"
                    : profile.lang === 'ru'
                      ? 'Ruscha'
                      : 'English'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Connected Accounts Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card-elevated p-6"
      >
        <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <LinkIcon size={20} className="text-primary-600" />
          Ulangan akkauntlar
        </h3>

        <div className="space-y-4">
          {/* Google Account */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-background">
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  profile.googleId ? 'bg-green-100' : 'bg-gray-100'
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  className={profile.googleId ? 'text-green-600' : 'text-gray-400'}
                >
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">Google</p>
                {profile.googleId ? (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <Check size={12} />
                    {profile.email || 'Ulangan'}
                  </p>
                ) : (
                  <p className="text-xs text-gray-400">Ulanmagan</p>
                )}
              </div>
            </div>
            {!profile.googleId && (
              <p className="text-xs text-text-secondary max-w-[160px] text-right">
                Google orqali kirganingizda avtomatik ulanadi
              </p>
            )}
            {profile.googleId && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 text-green-600 text-xs font-medium">
                <Check size={12} />
                Ulangan
              </span>
            )}
          </div>

          {/* Telegram Account */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-background">
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  profile.telegramId ? 'bg-green-100' : 'bg-gray-100'
                }`}
              >
                <MessageCircle
                  size={16}
                  className={profile.telegramId ? 'text-green-600' : 'text-gray-400'}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">Telegram</p>
                {profile.telegramId ? (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <Check size={12} />
                    @{profile.telegramUsername || profile.telegramId}
                  </p>
                ) : (
                  <p className="text-xs text-gray-400">Ulanmagan</p>
                )}
              </div>
            </div>
            {!profile.telegramId && (
              <p className="text-xs text-text-secondary max-w-[180px] text-right">
                Telegram botga /start yozing: @EduPrimeuzbot
              </p>
            )}
            {profile.telegramId && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 text-green-600 text-xs font-medium">
                <Check size={12} />
                Ulangan
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
