'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Trophy, TrendingUp, Users, Loader2 } from 'lucide-react';
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

function getMedalEmoji(rank: number): string | null {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return null;
}

function UserRow({ user, isCurrentUser }: { user: RatingUser; isCurrentUser: boolean }) {
  const medal = getMedalEmoji(user.rank);
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 transition-colors ${
        isCurrentUser ? 'bg-primary-50 border-l-4 border-l-primary-500' : ''
      }`}
    >
      {/* Rank */}
      <div className="w-8 text-center flex-shrink-0">
        {medal ? (
          <span className="text-lg">{medal}</span>
        ) : (
          <span className="text-sm font-bold text-text-secondary">#{user.rank}</span>
        )}
      </div>
      {/* Avatar + Name */}
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
          {user.image ? (
            <Image src={user.image} alt={user.name} width={36} height={36} className="w-full h-full object-cover" unoptimized />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-500">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">
            {user.name}
            {isCurrentUser && <span className="text-xs text-primary-600 ml-1">(Siz)</span>}
          </p>
          <p className="text-xs text-text-secondary">{user.testCount} ta test</p>
        </div>
      </div>
      {/* Score */}
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold text-text-primary">{user.totalScore}</p>
        <p className="text-[10px] text-text-secondary">ball</p>
      </div>
    </div>
  );
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
        <Loader2 size={40} className="animate-spin text-primary-600 mx-auto" />
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

  const currentUserEntry = users.find(u => u.userId === currentUserId);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Trophy size={24} className="text-yellow-500" />
          Reyting jadvali
        </h1>
        <p className="text-text-secondary text-sm mt-1">Top 10 — eng ko&apos;p ball to&apos;plaganlar</p>
      </motion.div>

      {/* Current user highlight (always at top) */}
      {currentUserEntry && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card overflow-hidden border-2 border-primary-200"
        >
          <div className="px-4 py-2 bg-primary-50 border-b border-primary-100">
            <span className="text-xs font-medium text-primary-700">Sizning o&apos;rningiz</span>
          </div>
          <UserRow user={currentUserEntry} isCurrentUser={true} />
        </motion.div>
      )}

      {/* Empty state */}
      {users.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-elevated p-12 text-center"
        >
          <Users size={48} className="text-yellow-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-text-primary mb-2">
            Reyting hali shakllanmagan
          </h2>
          <p className="text-text-secondary mb-6">
            Test yeching va birinchi bo&apos;ling!
          </p>
          <a href="/tests" className="btn-primary inline-flex items-center gap-2">
            <TrendingUp size={16} />
            Test yechish
          </a>
        </motion.div>
      )}

      {/* Leaderboard table */}
      {users.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card overflow-hidden"
        >
          {/* Table header */}
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-gray-50 text-xs font-semibold text-text-secondary">
            <div className="w-8 text-center">O&apos;rin</div>
            <div className="flex-1">Foydalanuvchi</div>
            <div className="text-right">Ball</div>
          </div>
          {/* Rows */}
          <div className="divide-y divide-border">
            {users.map((user) => (
              <UserRow
                key={user.userId}
                user={user}
                isCurrentUser={user.userId === currentUserId}
              />
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
