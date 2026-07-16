'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Trophy,
  CheckCircle,
  Clock,
  BookOpen,
  ArrowRight,
  Loader2,
  AlertCircle,
  GraduationCap,
  Star,
  ArrowLeft,
} from 'lucide-react';

interface SharedResult {
  id: string;
  score: number;
  maxScore: number;
  percentage: number;
  timeSpent: number;
  completedAt: string;
  user: {
    name: string | null;
    image: string | null;
  };
  test: {
    id: string;
    titleUz: string;
    titleRu: string | null;
    titleEn: string | null;
    questionCount: number;
    subject: {
      nameUz: string;
      nameRu: string;
      nameEn: string;
    };
  };
}

export default function ShareResultPage() {
  const params = useParams();
  const resultId = params.id as string;

  const [result, setResult] = useState<SharedResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchResult() {
      try {
        const res = await fetch(`/api/share/result/${resultId}`);
        const data = await res.json();
        if (res.ok && data.result) {
          setResult(data.result);
        } else {
          setError(data.error || 'Natija topilmadi');
        }
      } catch {
        setError("Server bilan bog'lanishda xatolik");
      }
      setLoading(false);
    }
    fetchResult();
  }, [resultId]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary-50 to-white">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-text-secondary">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary-50 to-white">
        <div className="text-center p-8">
          <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-text-primary mb-2">Xatolik</h2>
          <p className="text-text-secondary mb-6">{error || 'Natija topilmadi'}</p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors"
          >
            Bosh sahifaga qaytish
          </a>
        </div>
      </div>
    );
  }

  const scoreColor = result.percentage >= 80 ? 'text-green-600' : result.percentage >= 60 ? 'text-yellow-600' : 'text-red-600';
  const scoreBg = result.percentage >= 80 ? 'from-green-50 to-green-100' : result.percentage >= 60 ? 'from-yellow-50 to-yellow-100' : 'from-red-50 to-red-100';

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 via-white to-primary-50/30">
      {/* Header */}
      <div className="bg-white border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a
              href="/"
              className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-primary-600 transition-colors"
            >
              <ArrowLeft size={16} />
              <span>Bosh sahifaga</span>
            </a>
            <div className="flex items-center gap-2">
              <GraduationCap size={24} className="text-primary-600" />
              <span className="font-bold text-lg text-primary-700">EduPrime.uz</span>
            </div>
          </div>
          <a
            href="/login"
            className="px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            Kirish
          </a>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Result Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-2xl shadow-xl border border-border overflow-hidden"
        >
          {/* Score section */}
          <div className={`bg-gradient-to-r ${scoreBg} p-8 text-center`}>
            <div className="flex items-center justify-center gap-2 mb-4">
              <Trophy size={24} className={scoreColor} />
              <h1 className="text-xl font-bold text-text-primary">Test natijasi</h1>
            </div>

            {/* User info */}
            <p className="text-text-secondary mb-6">
              <span className="font-semibold text-text-primary">{result.user.name || 'Foydalanuvchi'}</span>
              {' '}ning natijasi
            </p>

            {/* Score circle */}
            <div className="relative inline-flex items-center justify-center w-36 h-36 mb-4">
              <svg className="w-36 h-36 -rotate-90" viewBox="0 0 160 160">
                <circle
                  cx="80" cy="80" r="70"
                  fill="none" stroke="#e5e7eb" strokeWidth="12"
                />
                <circle
                  cx="80" cy="80" r="70"
                  fill="none"
                  stroke={result.percentage >= 80 ? '#22c55e' : result.percentage >= 60 ? '#eab308' : '#ef4444'}
                  strokeWidth="12"
                  strokeDasharray={`${2 * Math.PI * 70}`}
                  strokeDashoffset={`${2 * Math.PI * 70 * (1 - result.percentage / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute text-center">
                <span className={`text-3xl font-bold ${scoreColor}`}>{result.percentage}%</span>
                <p className="text-xs text-text-secondary">{result.score}/{result.maxScore}</p>
              </div>
            </div>

            <h2 className="text-lg font-semibold text-text-primary">{result.test.titleUz}</h2>
            <p className="text-sm text-text-secondary mt-1">{result.test.subject.nameUz}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 p-6 border-b border-border">
            <div className="text-center">
              <CheckCircle size={20} className="text-green-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-text-primary">{result.score}/{result.maxScore}</p>
              <p className="text-xs text-text-secondary">Ball</p>
            </div>
            <div className="text-center">
              <BookOpen size={20} className="text-blue-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-text-primary">{result.test.questionCount}</p>
              <p className="text-xs text-text-secondary">Savollar</p>
            </div>
            <div className="text-center">
              <Clock size={20} className="text-purple-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-text-primary">{formatTime(result.timeSpent)}</p>
              <p className="text-xs text-text-secondary">Vaqt</p>
            </div>
          </div>

          {/* Motivational CTA */}
          <div className="p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Star size={20} className="text-yellow-500" />
              <Star size={20} className="text-yellow-500" />
              <Star size={20} className="text-yellow-500" />
            </div>
            <h3 className="text-lg font-bold text-text-primary mb-2">
              Siz ham o&apos;zingizni sinab ko&apos;ring!
            </h3>
            <p className="text-text-secondary text-sm mb-6">
              EduPrime.uz - bu testlar orqali bilimingizni sinash va oshirish platformasi.
              DTM, maktab, attestatsiya va boshqa testlarni yeching!
            </p>
            <a
              href="/login"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/25"
            >
              Hoziroq boshlash
              <ArrowRight size={18} />
            </a>
          </div>
        </motion.div>

        {/* Platform info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-8 text-center"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-white border border-border">
              <BookOpen size={24} className="text-primary-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-text-primary">1000+ testlar</p>
              <p className="text-xs text-text-secondary">Barcha fanlardan</p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-border">
              <Trophy size={24} className="text-yellow-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-text-primary">Reyting tizimi</p>
              <p className="text-xs text-text-secondary">Do&apos;stlaringiz bilan raqobat</p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-border">
              <GraduationCap size={24} className="text-green-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-text-primary">Video yechimlar</p>
              <p className="text-xs text-text-secondary">Har bir savolga tushuntirish</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
