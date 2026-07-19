'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { GraduationCap, BookOpen, Users, Star, Loader2, CheckCircle, XCircle } from 'lucide-react';
import BackButton from '@/components/ui/BackButton';

interface TeacherData {
  id: string;
  userId: string;
  verified: boolean;
  rating: number;
  bio: string | null;
  createdAt: string;
  user: { name: string | null; image: string | null; telegramUsername: string | null; email: string | null };
  subject: { nameUz: string; icon: string | null };
  _count: { tests: number };
}

export default function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<TeacherData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/teachers')
      .then(r => r.json())
      .then(data => { if (data.teachers) setTeachers(data.teachers); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const toggleVerify = async (teacherId: string, verified: boolean) => {
    try {
      const res = await fetch('/api/admin/teachers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId, verified: !verified }),
      });
      if (res.ok) {
        setTeachers(teachers.map(t => t.id === teacherId ? { ...t, verified: !verified } : t));
      }
    } catch { alert('Xatolik'); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 size={32} className="animate-spin text-primary-600" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <BackButton className="mb-2" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <GraduationCap size={24} className="text-primary-600" />
          Ustozlar
        </h1>
        <p className="text-text-secondary text-sm mt-1">Jami: {teachers.length} ta ustoz</p>
      </motion.div>

      {teachers.length === 0 ? (
        <div className="card p-12 text-center">
          <GraduationCap size={48} className="text-text-secondary mx-auto mb-4 opacity-30" />
          <p className="text-text-secondary">Ustozlar topilmadi</p>
        </div>
      ) : (
        <div className="space-y-3">
          {teachers.map((teacher) => (
            <motion.div key={teacher.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                  {teacher.user.image ? (
                    <Image src={teacher.user.image} alt="" width={44} height={44} className="w-full h-full object-cover" unoptimized />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-500">
                      {(teacher.user.name || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-text-primary text-sm truncate">{teacher.user.name || 'Nomsiz'}</p>
                    {teacher.verified ? (
                      <span className="px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-medium flex items-center gap-0.5">
                        <CheckCircle size={10} /> Tasdiqlangan
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-[10px] font-medium">
                        Tasdiqlanmagan
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary">
                    {teacher.user.telegramUsername ? `@${teacher.user.telegramUsername}` : teacher.user.email}
                  </p>
                  <div className="flex items-center gap-4 mt-1.5 text-xs text-text-secondary">
                    <span className="flex items-center gap-1">{teacher.subject.icon} {teacher.subject.nameUz}</span>
                    <span className="flex items-center gap-1"><BookOpen size={11} /> {teacher._count.tests} test</span>
                    <span className="flex items-center gap-1"><Star size={11} className="text-yellow-500" /> {teacher.rating.toFixed(1)}</span>
                  </div>
                </div>
                <button
                  onClick={() => toggleVerify(teacher.id, teacher.verified)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0 ${
                    teacher.verified
                      ? 'bg-red-50 text-red-600 hover:bg-red-100'
                      : 'bg-green-50 text-green-600 hover:bg-green-100'
                  }`}
                >
                  {teacher.verified ? 'Bekor qilish' : 'Tasdiqlash'}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
