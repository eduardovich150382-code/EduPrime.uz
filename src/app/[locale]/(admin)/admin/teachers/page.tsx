'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { GraduationCap, BookOpen, Star, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import BackButton from '@/components/ui/BackButton';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import { actionButtonClass, dangerOutlineClass } from '@/components/admin/AdminFields';

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
  const t = useTranslations('adminTeachers');
  const tc = useTranslations('adminCommon');
  const [teachers, setTeachers] = useState<TeacherData[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokeTarget, setRevokeTarget] = useState<TeacherData | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/admin/teachers')
      .then(r => r.json())
      .then(data => { if (data.teachers) setTeachers(data.teachers); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const toggleVerify = async (teacherId: string, verified: boolean) => {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/teachers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId, verified: !verified }),
      });
      if (res.ok) {
        setTeachers(list => list.map(item => item.id === teacherId ? { ...item, verified: !verified } : item));
      }
    } catch { alert(tc('error')); }
    setBusy(false);
    setRevokeTarget(null);
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 size={32} className="animate-spin text-primary-600" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <BackButton className="mb-2 min-h-11" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <GraduationCap size={24} className="text-primary-600" aria-hidden />
          {t('title')}
        </h1>
        <p className="text-text-secondary text-sm mt-1">{t('total', { count: teachers.length })}</p>
      </motion.div>

      {teachers.length === 0 ? (
        <div className="card p-12 text-center">
          <GraduationCap size={48} className="text-text-secondary mx-auto mb-4 opacity-30" aria-hidden />
          <p className="text-text-secondary">{t('empty')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {teachers.map((teacher) => (
            <motion.div key={teacher.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-4">
              <div className="flex flex-wrap items-center gap-3">
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
                    <p className="font-semibold text-text-primary text-sm truncate">{teacher.user.name || tc('unnamed')}</p>
                    {teacher.verified ? (
                      <span className="px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-medium flex items-center gap-0.5">
                        <CheckCircle size={10} aria-hidden /> {t('verified')}
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-[10px] font-medium">
                        {t('unverified')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary break-all">
                    {teacher.user.telegramUsername ? `@${teacher.user.telegramUsername}` : teacher.user.email}
                  </p>
                  <div className="flex items-center gap-4 mt-1.5 text-xs text-text-secondary">
                    <span className="flex items-center gap-1">{teacher.subject.icon} {teacher.subject.nameUz}</span>
                    <span className="flex items-center gap-1"><BookOpen size={11} aria-hidden /> {t('tests', { count: teacher._count.tests })}</span>
                    <span className="flex items-center gap-1"><Star size={11} className="text-yellow-500" aria-hidden /> {teacher.rating.toFixed(1)}</span>
                  </div>
                </div>
                {teacher.verified ? (
                  <button type="button" disabled={busy} onClick={() => setRevokeTarget(teacher)} className={`${dangerOutlineClass} flex-shrink-0`}>
                    <XCircle size={14} aria-hidden /> {t('revoke')}
                  </button>
                ) : (
                  <button type="button" disabled={busy} onClick={() => void toggleVerify(teacher.id, false)}
                    className={`${actionButtonClass} flex-shrink-0 bg-green-50 text-green-700 hover:bg-green-100`}>
                    <CheckCircle size={14} aria-hidden /> {t('verify')}
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {revokeTarget && (
        <ConfirmDialog
          title={t('revokeTitle')}
          body={t('revokeBody', { name: revokeTarget.user.name || tc('unnamed') })}
          confirmLabel={t('revoke')}
          busy={busy}
          onConfirm={() => void toggleVerify(revokeTarget.id, true)}
          onClose={() => setRevokeTarget(null)}
        />
      )}
    </div>
  );
}
