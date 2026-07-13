'use client';

import { motion } from 'framer-motion';
import { Trophy, Medal, Crown, TrendingUp, User } from 'lucide-react';

const mockRatings = [
  { rank: 1, name: 'Sardor Aliyev', score: 2450, tests: 89, avatar: null },
  { rank: 2, name: 'Nilufar Karimova', score: 2380, tests: 76, avatar: null },
  { rank: 3, name: 'Jasur Toshmatov', score: 2290, tests: 82, avatar: null },
  { rank: 4, name: 'Madina Rahimova', score: 2150, tests: 71, avatar: null },
  { rank: 5, name: 'Bobur Ismailov', score: 2080, tests: 68, avatar: null },
  { rank: 6, name: 'Zulfiya Nazarova', score: 1990, tests: 63, avatar: null },
  { rank: 7, name: 'Otabek Sobirov', score: 1920, tests: 59, avatar: null },
  { rank: 8, name: 'Dilnoza Umarova', score: 1850, tests: 55, avatar: null },
  { rank: 9, name: 'Sherzod Qodirov', score: 1780, tests: 52, avatar: null },
  { rank: 10, name: 'Kamola Ergasheva', score: 1700, tests: 48, avatar: null },
];

function getRankIcon(rank: number) {
  if (rank === 1) return <Crown size={20} className="text-yellow-500" />;
  if (rank === 2) return <Medal size={20} className="text-gray-400" />;
  if (rank === 3) return <Medal size={20} className="text-amber-600" />;
  return <span className="text-sm font-bold text-text-secondary">{rank}</span>;
}

function getRankBg(rank: number) {
  if (rank === 1) return 'bg-yellow-50 border-yellow-200';
  if (rank === 2) return 'bg-gray-50 border-gray-200';
  if (rank === 3) return 'bg-amber-50 border-amber-200';
  return 'bg-white border-border';
}

export default function RatingPage() {
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
          O'zbekiston bo'ylab reyting
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">Reyting jadvali</h1>
        <p className="text-text-secondary mt-1">Eng ko'p ball to'plagan foydalanuvchilar</p>
      </motion.div>

      {/* Your rank */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card-elevated p-5 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
            <TrendingUp size={20} className="text-primary-600" />
          </div>
          <div>
            <p className="text-sm text-text-secondary">Sizning o'rningiz</p>
            <p className="text-xl font-bold text-primary-600">#156</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-text-secondary">Ball</p>
          <p className="text-xl font-bold text-text-primary">1,240</p>
        </div>
      </motion.div>

      {/* Rating list */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card p-4 space-y-2"
      >
        {mockRatings.map((user, i) => (
          <div
            key={i}
            className={`flex items-center gap-4 p-4 rounded-xl border ${getRankBg(user.rank)} transition-colors`}
          >
            <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
              {getRankIcon(user.rank)}
            </div>
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
              <User size={18} className="text-primary-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-text-primary text-sm truncate">{user.name}</p>
              <p className="text-xs text-text-secondary">{user.tests} ta test yechgan</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-bold text-text-primary">{user.score.toLocaleString()}</p>
              <p className="text-xs text-text-secondary">ball</p>
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
