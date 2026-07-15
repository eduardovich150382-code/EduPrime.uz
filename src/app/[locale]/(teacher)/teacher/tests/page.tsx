'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from '@/i18n/routing';
import {
  ArrowLeft, Plus, FileText, Users, BarChart3, Trash2,
  Pencil, Eye, EyeOff, Loader2, Search,
} from 'lucide-react';

interface TestItem {
  id: string;
  titleUz: string;
  subject: { nameUz: string; icon: string | null };
  isPublished: boolean;
  isFree: boolean;
  price: number;
  duration: number;
  difficulty: number;
  questionCount: number;
  coverImage: string | null;
  createdAt: string;
  studentCount: number;
  avgScore: number;
}

export default function TeacherTestsPage() {
  const [tests, setTests] = useState<TestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      const res = await fetch('/api/teacher/tests');
      const data = await res.json();
      if (data.tests) setTests(data.tests);
    } catch (error) {
      console.error('Error fetching tests:', error);
    }
    setLoading(false);
  };

  const handleDelete = async (testId: string) => {
    if (!confirm("Bu testni o'chirishni tasdiqlaysizmi? Bu amalni qaytarib bo'lmaydi.")) return;

    setDeleting(testId);
    try {
      const res = await fetch(`/api/tests/${testId}`, { method: 'DELETE' });
      if (res.ok) {
        setTests(tests.filter(t => t.id !== testId));
      } else {
        alert("O'chirishda xatolik yuz berdi");
      }
    } catch {
      alert("Server xatolik");
    }
    setDeleting(null);
  };

  const handleTogglePublish = async (testId: string, currentState: boolean) => {
    setToggling(testId);
    try {
      const res = await fetch(`/api/tests/${testId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !currentState }),
      });
      if (res.ok) {
        setTests(tests.map(t =>
          t.id === testId ? { ...t, isPublished: !currentState } : t
        ));
      } else {
        alert("Xatolik yuz berdi");
      }
    } catch {
      alert("Server xatolik");
    }
    setToggling(null);
  };

  const filteredTests = tests.filter(test => {
    const matchesSearch = test.titleUz.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === 'all' ? true :
      filter === 'published' ? test.isPublished :
      !test.isPublished;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <Link href="/teacher" className="p-2 rounded-lg hover:bg-primary-50 transition-colors">
            <ArrowLeft size={20} className="text-text-secondary" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Mening testlarim</h1>
            <p className="text-sm text-text-secondary">
              Barcha testlaringizni boshqaring
            </p>
          </div>
        </div>
        <Link href="/teacher/tests/create" className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          Yangi test
        </Link>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card p-4"
      >
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              placeholder="Test nomini qidirish..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all text-sm"
            />
          </div>
          <div className="flex gap-2">
            {[
              { id: 'all' as const, label: 'Barchasi' },
              { id: 'published' as const, label: 'Nashr qilingan' },
              { id: 'draft' as const, label: 'Qoralama' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  filter === f.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-background border border-border text-text-secondary hover:border-primary-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Test list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-primary-600" />
        </div>
      ) : filteredTests.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card p-12 text-center"
        >
          <FileText size={48} className="text-text-secondary mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            {tests.length === 0 ? "Hali test yaratilmagan" : "Natija topilmadi"}
          </h3>
          <p className="text-sm text-text-secondary mb-6">
            {tests.length === 0 ? "Birinchi testingizni yarating!" : "Qidiruv yoki filtrni o'zgartiring"}
          </p>
          {tests.length === 0 && (
            <Link href="/teacher/tests/create" className="btn-primary inline-flex items-center gap-2">
              <Plus size={16} />
              Test yaratish
            </Link>
          )}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          {filteredTests.map((test, index) => (
            <motion.div
              key={test.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * index }}
              className="card p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <FileText size={20} className="text-primary-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-text-primary text-sm truncate">{test.titleUz}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${
                        test.isPublished
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {test.isPublished ? 'Nashr' : 'Qoralama'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-text-secondary">
                      <span className="flex items-center gap-1">
                        {test.subject.icon} {test.subject.nameUz}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users size={12} /> {test.studentCount} o&apos;quvchi
                      </span>
                      <span className="flex items-center gap-1">
                        <BarChart3 size={12} /> O&apos;rtacha: {test.avgScore}%
                      </span>
                      <span className={`px-1.5 py-0.5 rounded ${test.isFree ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                        {test.isFree ? 'Bepul' : `${test.price.toLocaleString()} so'm`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  <button
                    onClick={() => handleTogglePublish(test.id, test.isPublished)}
                    disabled={toggling === test.id}
                    title={test.isPublished ? "Nashrdan olish" : "Nashr qilish"}
                    className={`p-2 rounded-lg transition-colors ${
                      test.isPublished
                        ? 'text-green-600 hover:bg-green-50'
                        : 'text-yellow-600 hover:bg-yellow-50'
                    }`}
                  >
                    {toggling === test.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : test.isPublished ? (
                      <Eye size={16} />
                    ) : (
                      <EyeOff size={16} />
                    )}
                  </button>
                  <Link
                    href={`/teacher/tests/${test.id}/edit`}
                    className="p-2 rounded-lg text-primary-600 hover:bg-primary-50 transition-colors"
                    title="Tahrirlash"
                  >
                    <Pencil size={16} />
                  </Link>
                  <button
                    onClick={() => handleDelete(test.id)}
                    disabled={deleting === test.id}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                    title="O'chirish"
                  >
                    {deleting === test.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
