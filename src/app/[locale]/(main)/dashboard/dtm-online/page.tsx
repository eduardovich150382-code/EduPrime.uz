'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import BackButton from '@/components/ui/BackButton';
import PremiumCTA from '@/components/ui/PremiumCTA';
import {
  GraduationCap, Loader2, Clock, ListChecks, Award, ArrowRight,
  AlertCircle, PlayCircle, CheckCircle2,
} from 'lucide-react';

const MANDATORY_SUBJECTS = ['Matematika', "Ona tili va adabiyot", 'Tarix'];

interface SubjectItem {
  id: string;
  nameUz: string;
  icon: string | null;
  category: { nameUz: string; type: string };
}

export default function DtmOnlinePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [current, setCurrent] = useState<{ testId: string; titleUz: string } | null>(null);
  const [specialty1, setSpecialty1] = useState('');
  const [specialty2, setSpecialty2] = useState('');
  const [starting, setStarting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/subjects?type=DTM').then((r) => r.json()),
      fetch('/api/dtm-online/current').then((r) => r.json()),
    ])
      .then(([subjectsData, currentData]) => {
        if (subjectsData.subjects) {
          setSubjects(subjectsData.subjects);
        }
        if (currentData.current) setCurrent(currentData.current);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleStart = async () => {
    if (!specialty1 || !specialty2) {
      setErrorMsg("Ikkala mutaxassislik fanini tanlang");
      return;
    }
    if (specialty1 === specialty2) {
      setErrorMsg("Ikkala fan har xil bo'lishi kerak");
      return;
    }
    setErrorMsg(null);
    setStarting(true);
    try {
      const res = await fetch('/api/dtm-online/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ specialty1SubjectId: specialty1, specialty2SubjectId: specialty2 }),
      });
      const data = await res.json();
      if (res.status === 403) {
        setLimitReached(true);
        setStarting(false);
        return;
      }
      if (!res.ok) {
        setErrorMsg(data.error || 'Xatolik yuz berdi');
        setStarting(false);
        return;
      }
      router.push(`/tests/${data.testId}/solve`);
    } catch {
      setErrorMsg('Server xatolik. Qayta urinib ko\'ring.');
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={36} className="animate-spin text-primary-600" />
      </div>
    );
  }

  if (limitReached) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <BackButton />
        <div className="text-center py-6">
          <GraduationCap size={40} className="text-primary-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-text-primary mb-2">Bepul urinish tugadi</h1>
          <p className="text-text-secondary text-sm mb-6">
            DTM Online'dan bepul tarifda faqat 1 marta foydalanish mumkin edi. Cheksiz urinish uchun Premium yoki Ustoz tarifiga o&apos;ting.
          </p>
        </div>
        <PremiumCTA variant="full" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <BackButton />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <GraduationCap size={24} className="text-primary-600" /> DTM Online
        </h1>
        <p className="text-text-secondary text-sm mt-1">Haqiqiy DTM imtihonini takrorlaydigan to&apos;liq simulyatsiya</p>
      </motion.div>

      {/* Structure info */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
            <ListChecks size={18} className="text-primary-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">90 savol</p>
            <p className="text-xs text-text-secondary">2×30 mutaxassislik + 3×10 majburiy</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Clock size={18} className="text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">180 daqiqa</p>
            <p className="text-xs text-text-secondary">Bitta umumiy taymer</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
            <Award size={18} className="text-yellow-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">189 max ball</p>
            <p className="text-xs text-text-secondary">3.1 / 2.1 / 1.1 ballli savollar</p>
          </div>
        </div>
      </motion.div>

      {/* Resume existing attempt */}
      {current && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-5 border-2 border-primary-200 bg-primary-50/40 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <PlayCircle size={22} className="text-primary-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary truncate">Yakunlanmagan urinishingiz bor</p>
              <p className="text-xs text-text-secondary truncate">{current.titleUz}</p>
            </div>
          </div>
          <button onClick={() => router.push(`/tests/${current.testId}/solve`)} className="btn-primary !py-2 !px-4 text-sm flex-shrink-0">
            Davom ettirish
          </button>
        </motion.div>
      )}

      {/* Specialty picker */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card p-6 space-y-5">
        <h2 className="font-semibold text-text-primary">Mutaxassislik fanlarini tanlang</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-text-primary block mb-2">1-mutaxassislik fani (3.1 ball/savol)</label>
            <select
              value={specialty1}
              onChange={(e) => setSpecialty1(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all"
            >
              <option value="">Fan tanlang...</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id} disabled={s.id === specialty2}>
                  {s.icon} {s.nameUz}{MANDATORY_SUBJECTS.includes(s.nameUz) ? ' (majburiy ham)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary block mb-2">2-mutaxassislik fani (2.1 ball/savol)</label>
            <select
              value={specialty2}
              onChange={(e) => setSpecialty2(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all"
            >
              <option value="">Fan tanlang...</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id} disabled={s.id === specialty1}>
                  {s.icon} {s.nameUz}{MANDATORY_SUBJECTS.includes(s.nameUz) ? ' (majburiy ham)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-gray-50 border border-border text-xs text-text-secondary flex items-start gap-2">
          <CheckCircle2 size={14} className="text-green-600 flex-shrink-0 mt-0.5" />
          <span>
            Majburiy fanlar (Matematika, Ona tili va adabiyot, Tarix — har biri 10 nisbatan oson savoldan, 1.1 balldan) avtomatik qo&apos;shiladi.
            Shu fanlardan birini mutaxassislik sifatida ham tanlasangiz, undan qo&apos;shimcha 30 ta nisbatan o&apos;rtacha/qiyin savol olasiz (takrorlanmaydi).
          </span>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700 flex items-start gap-2">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <button
          onClick={handleStart}
          disabled={starting || !specialty1 || !specialty2}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {starting ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
          {starting ? 'Tayyorlanmoqda...' : 'Imtihonni boshlash'}
        </button>
      </motion.div>
    </div>
  );
}
