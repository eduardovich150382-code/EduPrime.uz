'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import LatexRenderer from '@/components/ui/LatexRenderer';
import {
  Clock, BookOpen, ArrowRight, Loader2, AlertCircle,
  GraduationCap, Lock, ArrowLeft, Sparkles,
} from 'lucide-react';

interface PreviewQuestion {
  id: string;
  text: string;
  images: string[];
  options: { label: string; text: string; image: string | null }[];
  type: 'MULTIPLE_CHOICE' | 'OPEN_ENDED';
}

interface PreviewTest {
  id: string;
  titleUz: string;
  duration: number;
  difficulty: number;
  questionCount: number;
  coverImage: string | null;
  isFree: boolean;
  accessType: string;
  price: number;
  subject: { nameUz: string; icon: string | null };
  teacher: { user: { name: string | null } } | null;
}

export default function TestPreviewPage() {
  const params = useParams();
  const testId = params.id as string;

  const [test, setTest] = useState<PreviewTest | null>(null);
  const [questions, setQuestions] = useState<PreviewQuestion[]>([]);
  const [remainingCount, setRemainingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/tests/${testId}/preview`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Test topilmadi');
          return;
        }
        setTest(data.test);
        setQuestions(data.previewQuestions || []);
        setRemainingCount(data.remainingCount || 0);
      })
      .catch(() => setError("Server bilan bog'lanishda xatolik"))
      .finally(() => setLoading(false));
  }, [testId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary-50 to-white">
        <Loader2 size={40} className="animate-spin text-primary-600" />
      </div>
    );
  }

  if (error || !test) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary-50 to-white">
        <div className="text-center p-8">
          <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-text-primary mb-2">Test topilmadi</h2>
          <p className="text-text-secondary mb-6">{error || 'Bu havola endi mavjud emas'}</p>
          <a href="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors">
            Bosh sahifaga qaytish
          </a>
        </div>
      </div>
    );
  }

  const accessLabel =
    test.accessType === 'free' ? 'Bepul' :
    test.accessType === 'paid' ? `${test.price.toLocaleString()} so'm` :
    test.accessType === 'premium' ? 'Premium tarif' :
    test.accessType === 'teacher' ? 'Ustoz tarifi' : 'Premium + Ustoz tarifi';

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 via-white to-primary-50/30">
      {/* Header */}
      <div className="bg-white border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-primary-600 transition-colors">
            <ArrowLeft size={16} />
            <span>Bosh sahifaga</span>
          </a>
          <div className="flex items-center gap-2">
            <GraduationCap size={22} className="text-primary-600" />
            <span className="font-bold text-lg text-primary-700">EduPrime.uz</span>
          </div>
          <a href="/login" className="px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors">
            Kirish
          </a>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        {/* Test info card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg border border-border overflow-hidden"
        >
          <div className="p-6 sm:p-8 bg-gradient-to-r from-primary-50 to-primary-100/50">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-xs font-semibold text-primary-700 border border-primary-200 mb-3">
              <Sparkles size={12} /> Bepul namuna — ro&apos;yxatdan o&apos;tmasdan ko&apos;ring
            </span>
            <h1 className="text-2xl font-bold text-text-primary mb-2">{test.titleUz}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-secondary">
              <span>{test.subject.icon} {test.subject.nameUz}</span>
              <span className="flex items-center gap-1"><Clock size={14} /> {test.duration} daqiqa</span>
              <span className="flex items-center gap-1"><BookOpen size={14} /> {test.questionCount} ta savol</span>
              {test.teacher?.user.name && <span>Muallif: {test.teacher.user.name}</span>}
            </div>
          </div>
        </motion.div>

        {/* Preview questions */}
        <div className="space-y-4">
          {questions.map((q, i) => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 * i }}
              className="bg-white rounded-2xl border border-border p-5"
            >
              <div className="flex items-start gap-3">
                <span className="text-sm font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full flex-shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-text-primary mb-3">
                    <LatexRenderer content={q.text} />
                  </div>
                  {q.type === 'MULTIPLE_CHOICE' && (
                    <div className="space-y-2">
                      {q.options.filter((o) => o.text).map((opt) => (
                        <div key={opt.label} className="flex items-start gap-2 p-2.5 rounded-lg bg-gray-50 border border-gray-100 text-sm">
                          <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {opt.label}
                          </span>
                          <span className="flex-1 pt-0.5"><LatexRenderer content={opt.text} /></span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}

          {/* Locked remainder */}
          {remainingCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-dashed border-primary-200 p-8 text-center"
            >
              <Lock size={28} className="text-primary-400 mx-auto mb-3" />
              <p className="font-semibold text-text-primary mb-1">
                Yana {remainingCount} ta savol qulflangan
              </p>
              <p className="text-sm text-text-secondary mb-5">
                To&apos;liq testni yechish uchun ro&apos;yxatdan o&apos;ting. Kirish turi: <strong>{accessLabel}</strong>
              </p>
              <a
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/25"
              >
                Ro&apos;yxatdan o&apos;tib davom etish
                <ArrowRight size={18} />
              </a>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
