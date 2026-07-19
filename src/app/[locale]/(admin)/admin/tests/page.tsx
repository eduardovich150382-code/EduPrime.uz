'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen, Search, Loader2, RefreshCw, Eye, EyeOff,
  Trash2, BarChart3, Users, Clock, Filter,
} from 'lucide-react';
import BackButton from '@/components/ui/BackButton';

interface TestData {
  id: string;
  titleUz: string;
  subject: { nameUz: string; icon: string | null };
  teacherName: string | null;
  isPublished: boolean;
  isFree: boolean;
  accessType: string;
  questionCount: number;
  duration: number;
  difficulty: number;
  attempts: number;
  avgScore: number;
  createdAt: string;
}

type StatusFilter = 'all' | 'published' | 'draft';

export default function AdminTestsPage() {
  const [tests, setTests] = useState<TestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [total, setTotal] = useState(0);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchTests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/admin/tests?${params.toString()}`);
      const data = await res.json();
      if (data.tests) {
        setTests(data.tests);
        setTotal(data.total);
      }
    } catch (err) {
      console.error('Failed to fetch tests:', err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchTests(); }, [statusFilter]);
  useEffect(() => {
    const timer = setTimeout(fetchTests, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const handleAction = async (testId: string, action: 'publish' | 'unpublish' | 'delete') => {
    if (action === 'delete' && !confirm("Bu testni o'chirishni tasdiqlaysizmi? Bu amalni ortga qaytarib bo'lmaydi.")) return;
    setProcessing(testId);
    try {
      const res = await fetch('/api/admin/tests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId, action }),
      });
      if (res.ok) {
        if (action === 'delete') {
          setTests(tests.filter(t => t.id !== testId));
          setTotal(total - 1);
        } else {
          setTests(tests.map(t =>
            t.id === testId ? { ...t, isPublished: action === 'publish' } : t
          ));
        }
      } else {
        const data = await res.json();
        alert(data.error || 'Xatolik');
      }
    } catch { alert('Server xatolik'); }
    setProcessing(null);
  };

  function getAccessBadge(accessType: string) {
    switch (accessType) {
      case 'premium': return 'bg-purple-100 text-purple-700';
      case 'teacher': return 'bg-blue-100 text-blue-700';
      case 'premium_teacher': return 'bg-indigo-100 text-indigo-700';
      case 'paid': return 'bg-orange-100 text-orange-700';
      default: return 'bg-green-100 text-green-700';
    }
  }

  function getAccessLabel(accessType: string) {
    switch (accessType) {
      case 'premium': return 'Premium';
      case 'teacher': return 'Ustoz';
      case 'premium_teacher': return 'Prem+Ustoz';
      case 'paid': return 'Pullik';
      default: return 'Bepul';
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <BackButton className="mb-2" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <BookOpen size={24} className="text-primary-600" />
            Testlar boshqaruvi
          </h1>
          <p className="text-text-secondary text-sm mt-1">Jami: {total} ta test</p>
        </div>
        <button onClick={fetchTests} className="btn-ghost flex items-center gap-2 self-start">
          <RefreshCw size={16} /> Yangilash
        </button>
      </motion.div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            placeholder="Test nomi bo'yicha qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'published', 'draft'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                statusFilter === s
                  ? 'bg-primary-600 text-white'
                  : 'bg-white border border-border text-text-secondary hover:border-primary-200'
              }`}
            >
              {s === 'all' ? 'Hammasi' : s === 'published' ? 'Nashr' : 'Qoralama'}
            </button>
          ))}
        </div>
      </div>

      {/* Tests list */}
      {loading ? (
        <div className="card p-12 text-center">
          <Loader2 size={32} className="animate-spin text-primary-600 mx-auto" />
        </div>
      ) : tests.length === 0 ? (
        <div className="card p-12 text-center">
          <BookOpen size={48} className="text-text-secondary mx-auto mb-4 opacity-30" />
          <p className="text-text-secondary">Testlar topilmadi</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tests.map((test) => (
            <motion.div
              key={test.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="card p-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-sm font-semibold text-text-primary truncate">{test.titleUz}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      test.isPublished ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {test.isPublished ? 'Nashr' : 'Qoralama'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getAccessBadge(test.accessType)}`}>
                      {getAccessLabel(test.accessType)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary">
                    <span>{test.subject.icon} {test.subject.nameUz}</span>
                    {test.teacherName && <span>Ustoz: {test.teacherName}</span>}
                    <span className="flex items-center gap-1"><BookOpen size={10} /> {test.questionCount} savol</span>
                    <span className="flex items-center gap-1"><Clock size={10} /> {test.duration} min</span>
                    <span className="flex items-center gap-1"><Users size={10} /> {test.attempts} marta</span>
                    <span className="flex items-center gap-1"><BarChart3 size={10} /> {test.avgScore}% o&apos;rtacha</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {test.isPublished ? (
                    <button
                      onClick={() => handleAction(test.id, 'unpublish')}
                      disabled={processing === test.id}
                      className="p-2 rounded-lg text-yellow-600 hover:bg-yellow-50 transition-colors disabled:opacity-50"
                      title="Nashrdan olish"
                    >
                      <EyeOff size={16} />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAction(test.id, 'publish')}
                      disabled={processing === test.id}
                      className="p-2 rounded-lg text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50"
                      title="Nashr qilish"
                    >
                      <Eye size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => handleAction(test.id, 'delete')}
                    disabled={processing === test.id}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                    title="O'chirish"
                  >
                    {processing === test.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
