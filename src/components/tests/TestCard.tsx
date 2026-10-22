'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { BookOpen, Clock, Lock, Sparkles, CheckCircle } from 'lucide-react';
import { Link } from '@/i18n/routing';

// Karta tests/page.tsx dan o'zgarishsiz ko'chirildi — sahifa bo'lindi.
// Yangi dizayndagi karta keyingi sessiyada (S3) shu faylni almashtiradi.

export interface TestItem {
  id: string;
  titleUz: string;
  isFree: boolean;
  accessType?: string;
  price?: number;
  duration: number;
  questionCount: number;
  difficulty: number;
  coverImage: string | null;
  subject: { nameUz: string; icon: string | null };
  createdAt?: string;
  _userResult?: { percentage: number } | null;
}

const cardGradients = [
  'from-blue-500 to-purple-600',
  'from-green-500 to-teal-600',
  'from-orange-500 to-red-600',
  'from-pink-500 to-rose-600',
  'from-indigo-500 to-blue-600',
  'from-emerald-500 to-cyan-600',
  'from-violet-500 to-purple-600',
  'from-amber-500 to-orange-600',
];

function DifficultyBars({ level }: { level: number }) {
  return (
    <span className="flex items-end gap-0.5" title={`Qiyinlik: ${level}/5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={`rounded-sm ${
            i < level ? 'bg-primary-600' : 'bg-gray-200'
          }`}
          style={{
            width: '3px',
            height: `${6 + i * 3}px`,
          }}
        />
      ))}
    </span>
  );
}

export function TestCardSkeleton() {
  return (
    <div className="card overflow-hidden animate-pulse">
      <div className="h-32 w-full bg-gray-200" />
      <div className="p-5 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
        <div className="flex gap-4 mt-4">
          <div className="h-3 bg-gray-100 rounded w-16" />
          <div className="h-3 bg-gray-100 rounded w-16" />
          <div className="h-3 bg-gray-100 rounded w-16" />
        </div>
      </div>
    </div>
  );
}

function isNewTest(createdAt?: string): boolean {
  if (!createdAt) return false;
  const created = new Date(createdAt);
  const now = new Date();
  const diffDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= 7;
}

export function TestCard({
  test,
  index,
  userResult,
}: {
  test: TestItem;
  index: number;
  userResult?: { testId: string; percentage: number };
}) {
  return (
    <Link href={`/tests/${test.id}/solve`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05, duration: 0.3 }}
      >
        <div className="card hover:border-primary-200 group cursor-pointer h-full overflow-hidden">
          {/* Cover image or gradient */}
          <div
            className={`h-32 w-full relative ${
              !test.coverImage
                ? `bg-gradient-to-br ${cardGradients[index % cardGradients.length]}`
                : ''
            }`}
          >
            {test.coverImage ? (
              <Image
                src={test.coverImage}
                alt={test.titleUz}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookOpen size={36} className="text-white/50" />
              </div>
            )}
            {/* Badge overlays */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5">
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  test.isFree || test.accessType === 'free'
                    ? 'bg-green-100 text-green-700'
                    : test.accessType === 'premium'
                    ? 'bg-purple-100 text-purple-700'
                    : test.accessType === 'teacher'
                    ? 'bg-blue-100 text-blue-700'
                    : test.accessType === 'premium_teacher'
                    ? 'bg-indigo-100 text-indigo-700'
                    : test.accessType === 'paid'
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-white/90 text-primary-700'
                }`}
              >
                {test.isFree || test.accessType === 'free' ? 'Bepul'
                  : test.accessType === 'premium' ? 'Premium'
                  : test.accessType === 'teacher' ? 'Ustoz'
                  : test.accessType === 'premium_teacher' ? 'Premium+Ustoz'
                  : test.accessType === 'paid' ? `${(test.price || 0).toLocaleString()} so'm`
                  : 'Premium'}
              </span>
              {isNewTest(test.createdAt) && (
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 flex items-center gap-0.5">
                  <Sparkles size={10} /> Yangi
                </span>
              )}
            </div>
            {/* User result badge */}
            {userResult && (
              <span className="absolute bottom-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full bg-white/95 shadow-sm flex items-center gap-1">
                <CheckCircle size={12} className="text-green-600" />
                <span className={userResult.percentage >= 70 ? 'text-green-700' : 'text-yellow-700'}>{userResult.percentage}%</span>
              </span>
            )}
            {!test.isFree && !userResult && (
              <span className="absolute top-3 right-3">
                <Lock size={14} className="text-white/80" />
              </span>
            )}
          </div>

          <div className="p-5">
            <h3 className="font-semibold text-text-primary mb-2 group-hover:text-primary-600 transition-colors line-clamp-2">
              {test.titleUz}
            </h3>
            <p className="text-sm text-text-secondary mb-3">
              {test.subject.icon} {test.subject.nameUz}
            </p>
            <div className="flex items-center gap-4 text-xs text-text-secondary mb-3">
              <span className="flex items-center gap-1">
                <BookOpen size={12} /> {test.questionCount} savol
              </span>
              <span className="flex items-center gap-1">
                <Clock size={12} /> {test.duration} min
              </span>
              <span className="flex items-center gap-1.5">
                <DifficultyBars level={test.difficulty} />
                <span className="text-[10px]">Qiyinlik</span>
              </span>
            </div>
            {/* Access action buttons */}
            {!test.isFree && test.accessType !== 'free' && !userResult && (
              <div className="pt-2 border-t border-border">
                {test.accessType === 'paid' ? (
                  <a
                    href={`https://t.me/EduPrimeuzbot?start=buy_test_${test.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-orange-100 text-orange-700 text-xs font-semibold hover:bg-orange-200 transition-colors"
                  >
                    <Lock size={12} /> Sotib olish — {(test.price || 0).toLocaleString()} so&apos;m
                  </a>
                ) : (
                  <Link
                    href="/pricing"
                    onClick={(e) => e.stopPropagation()}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary-100 text-primary-700 text-xs font-semibold hover:bg-primary-200 transition-colors"
                  >
                    <Lock size={12} />
                    {test.accessType === 'premium' ? 'Premium tarifga o\'tish' :
                     test.accessType === 'teacher' ? 'Ustoz tarifga o\'tish' :
                     'Tarifga o\'tish'}
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
