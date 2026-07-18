'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Trophy, TrendingUp, Users, Loader2, Medal } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface RatingUser {
  rank: number;
  userId: string;
  name: string;
  image: string | null;
  telegramUsername: string | null;
  testCount: number;
  totalScore: number;
  totalMaxScore: number;
  avgPercentage: number;
}

export default function RatingPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<RatingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentUserId = (session?.user as any)?.id || null;

  useEffect(() => {
    async function fetchRating() {
      try {
        const res = await fetch('/api/rating?limit=10');
        const data = await res.json();
        if (res.ok && data.users) {
          setUsers(data.users);
        } else {
          setError(data.error || 'Reyting yuklanmadi');
        }
      } catch {
        setError('Server bilan bog\'lanishda xatolik');
      }
      setLoading(false);
    }
    fetchRating();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-text-secondary">Reyting yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <Users size={48} className="text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-text-primary mb-2">Xatolik</h2>
        <p className="text-text-secondary">{error}</p>
      </div>
    );
  }

  const top3 = users.slice(0, 3);
  const rest = users.slice(3);

  // Check if current user is in the list
  const currentUserEntry = users.find(u => u.userId === currentUserId);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-100 text-yellow-700 text-sm font-medium mb-4">
          <Trophy size={16} />
          O&apos;zbekiston bo&apos;ylab reyting
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">Reyting jadvali</h1>
        <p className="text-text-secondary mt-1">Eng ko&apos;p ball to&apos;plagan foydalanuvchilar</p>
      </motion.div>

      {/* Empty state */}
      {users.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card-elevated p-12 text-center"
        >
          <div className="w-20 h-20 bg-yellow-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Users size={36} className="text-yellow-600" />
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-2">
            Reyting hali shakllanmagan
          </h2>
          <p className="text-text-secondary max-w-md mx-auto mb-6">
            Foydalanuvchilar test yechishni boshlagandan keyin reyting jadvali avtomatik shakllanadi.
            Birinchi bo&apos;ling - test yeching va reytingda #1 o&apos;rinni egallang!
          </p>
          <a href="/tests" className="btn-primary inline-flex items-center gap-2">
            <TrendingUp size={16} />
            Test yechishni boshlash
          </a>
        </motion.div>
      )}

      {/* Top 3 podium */}
      {top3.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card-elevated p-6"
        >
          <div className="flex items-end justify-center gap-4 mb-6">
            {/* 2nd place */}
            {top3[1] && (
              <div className="text-center flex-1 max-w-[140px]">
                <div className="relative inline-block mb-2">
                  <div className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden border-3 border-gray-400 mx-auto">
                    {top3[1].image ? (
                      <Image src={top3[1].image} alt={top3[1].name} width={64} height={64} className="w-full h-full object-cover" unoptimized />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg font-bold text-gray-600">
                        {top3[1].name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gray-400 text-white text-xs font-bold flex items-center justify-center">
                    2
                  </div>
                </div>
                <p className="text-sm font-semibold text-text-primary truncate">{top3[1].name}</p>
                <p className="text-xs text-text-secondary">{top3[1].totalScore} ball</p>
                <p className="text-xs text-text-secondary">{top3[1].avgPercentage}% o&apos;rtacha</p>
              </div>
            )}

            {/* 1st place */}
            {top3[0] && (
              <div className="text-center flex-1 max-w-[160px]">
                <div className="relative inline-block mb-2">
                  <div className="w-20 h-20 rounded-full bg-yellow-100 overflow-hidden border-3 border-yellow-500 mx-auto ring-4 ring-yellow-200">
                    {top3[0].image ? (
                      <Image src={top3[0].image} alt={top3[0].name} width={80} height={80} className="w-full h-full object-cover" unoptimized />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-yellow-700">
                        {top3[0].name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-yellow-500 text-white text-sm font-bold flex items-center justify-center">
                    1
                  </div>
                </div>
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <Trophy size={14} className="text-yellow-500" />
                  <p className="text-sm font-bold text-text-primary truncate">{top3[0].name}</p>
                </div>
                <p className="text-xs text-text-secondary font-medium">{top3[0].totalScore} ball</p>
                <p className="text-xs text-text-secondary">{top3[0].avgPercentage}% o&apos;rtacha</p>
              </div>
            )}

            {/* 3rd place */}
            {top3[2] && (
              <div className="text-center flex-1 max-w-[140px]">
                <div className="relative inline-block mb-2">
                  <div className="w-16 h-16 rounded-full bg-orange-100 overflow-hidden border-3 border-orange-400 mx-auto">
                    {top3[2].image ? (
                      <Image src={top3[2].image} alt={top3[2].name} width={64} height={64} className="w-full h-full object-cover" unoptimized />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg font-bold text-orange-600">
                        {top3[2].name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-orange-400 text-white text-xs font-bold flex items-center justify-center">
                    3
                  </div>
                </div>
                <p className="text-sm font-semibold text-text-primary truncate">{top3[2].name}</p>
                <p className="text-xs text-text-secondary">{top3[2].totalScore} ball</p>
                <p className="text-xs text-text-secondary">{top3[2].avgPercentage}% o&apos;rtacha</p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Current user highlight (if not in top 3) */}
      {currentUserEntry && currentUserEntry.rank > 3 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-4 border-2 border-primary-300 bg-primary-50/50"
        >
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-sm font-bold text-primary-700">
              #{currentUserEntry.rank}
            </div>
            <div className="w-10 h-10 rounded-full bg-primary-200 overflow-hidden flex-shrink-0">
              {currentUserEntry.image ? (
                <Image src={currentUserEntry.image} alt={currentUserEntry.name} width={40} height={40} className="w-full h-full object-cover" unoptimized />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm font-bold text-primary-700">
                  {currentUserEntry.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-text-primary truncate">{currentUserEntry.name} <span className="text-xs text-primary-600">(Siz)</span></p>
              <p className="text-xs text-text-secondary">{currentUserEntry.testCount} ta test | {currentUserEntry.avgPercentage}% o&apos;rtacha</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-bold text-primary-700">{currentUserEntry.totalScore}</p>
              <p className="text-xs text-text-secondary">ball</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Rest of the leaderboard table */}
      {rest.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-border bg-gray-50/50">
            <h3 className="text-sm font-semibold text-text-primary">Barcha foydalanuvchilar</h3>
          </div>
          <div className="divide-y divide-border">
            {rest.map((user) => {
              const isCurrentUser = user.userId === currentUserId;
              return (
                <div
                  key={user.userId}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                    isCurrentUser ? 'bg-primary-50/70 border-l-4 border-l-primary-500' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-text-secondary flex-shrink-0">
                    {user.rank}
                  </div>
                  <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                    {user.image ? (
                      <Image src={user.image} alt={user.name} width={36} height={36} className="w-full h-full object-cover" unoptimized />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-500">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {user.name}
                      {isCurrentUser && <span className="text-xs text-primary-600 ml-1">(Siz)</span>}
                    </p>
                    <p className="text-xs text-text-secondary">{user.testCount} ta test | {user.avgPercentage}%</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-text-primary">{user.totalScore}</p>
                    <p className="text-xs text-text-secondary">ball</p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
