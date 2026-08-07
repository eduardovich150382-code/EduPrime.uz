'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  GraduationCap,
  Award,
  Calendar,
  BookOpen,
  Loader2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Download,
} from 'lucide-react';

interface Certificate {
  id: string;
  completedAt: string;
  enrolledAt: string;
  user: { name: string | null; image: string | null };
  course: {
    id: string;
    titleUz: string;
    estimatedHours: number | null;
    subject: { nameUz: string };
    teacherName: string | null;
  };
  totalLessons: number;
}

export default function CertificatePage() {
  const params = useParams();
  const enrollmentId = params.enrollmentId as string;

  const [cert, setCert] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCert() {
      try {
        const res = await fetch(`/api/certificate/${enrollmentId}`);
        const data = await res.json();
        if (res.ok && data.certificate) {
          setCert(data.certificate);
        } else {
          setError(data.error || 'Sertifikat topilmadi');
        }
      } catch {
        setError("Server bilan bog'lanishda xatolik");
      }
      setLoading(false);
    }
    fetchCert();
  }, [enrollmentId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-white">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-amber-600 mx-auto mb-4" />
          <p className="text-text-secondary">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (error || !cert) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-white">
        <div className="text-center p-8">
          <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-text-primary mb-2">Xatolik</h2>
          <p className="text-text-secondary mb-6">{error || 'Sertifikat topilmadi'}</p>
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

  const completedDate = new Date(cert.completedAt).toLocaleDateString('uz-UZ', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-amber-50/40">
      {/* Header */}
      <div className="bg-white border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-primary-600 transition-colors">
            <ArrowLeft size={16} />
            <span>Bosh sahifaga</span>
          </a>
          <div className="flex items-center gap-2">
            <GraduationCap size={24} className="text-primary-600" />
            <span className="font-bold text-lg text-primary-700">EduPrime.uz</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Certificate card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative bg-white rounded-2xl shadow-xl border-4 border-amber-200 overflow-hidden p-8 sm:p-12 text-center"
        >
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400" />

          <div className="flex items-center justify-center gap-2 mb-2">
            <Award size={32} className="text-amber-500" />
          </div>
          <p className="text-xs font-semibold tracking-[0.2em] text-amber-600 uppercase mb-6">Muvaffaqiyat sertifikati</p>

          <p className="text-sm text-text-secondary mb-2">Ushbu sertifikat tasdiqlaydiki,</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-4">
            {cert.user.name || 'Foydalanuvchi'}
          </h1>
          <p className="text-sm text-text-secondary mb-2">quyidagi kursni muvaffaqiyatli tugatdi:</p>
          <h2 className="text-xl sm:text-2xl font-semibold text-primary-700 mb-6">
            &ldquo;{cert.course.titleUz}&rdquo;
          </h2>

          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-text-secondary border-t border-b border-border py-5 mb-6">
            <span className="flex items-center gap-1.5"><BookOpen size={14} /> {cert.course.subject.nameUz}</span>
            <span className="flex items-center gap-1.5"><Calendar size={14} /> {completedDate}</span>
            {cert.course.estimatedHours ? (
              <span className="flex items-center gap-1.5">~{cert.course.estimatedHours} soat, {cert.totalLessons} dars</span>
            ) : (
              <span className="flex items-center gap-1.5">{cert.totalLessons} dars</span>
            )}
          </div>

          {cert.course.teacherName && (
            <p className="text-sm text-text-secondary mb-1">O&apos;qituvchi</p>
          )}
          {cert.course.teacherName && (
            <p className="text-base font-semibold text-text-primary mb-6">{cert.course.teacherName}</p>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href={`/certificate/${cert.id}/opengraph-image`}
              download={`eduprime-sertifikat-${cert.id}.png`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-colors shadow-lg shadow-amber-500/25"
            >
              <Download size={18} /> Sertifikatni yuklab olish
            </a>
            <a
              href={`/courses/${cert.course.id}`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-border text-text-primary font-medium hover:bg-gray-50 transition-colors"
            >
              Kursni ko&apos;rish
            </a>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-8 text-center p-6 rounded-xl bg-white border border-border"
        >
          <h3 className="text-lg font-bold text-text-primary mb-2">Siz ham o&apos;rganishni boshlang!</h3>
          <p className="text-text-secondary text-sm mb-5">
            EduPrime.uz — video kurslar, testlar va DTM tayyorgarligi bitta platformada.
          </p>
          <a
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/25"
          >
            Hoziroq boshlash
            <ArrowRight size={18} />
          </a>
        </motion.div>
      </div>
    </div>
  );
}
