'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from '@/i18n/routing';
import {
  GraduationCap, Search, Clock, Layers, Loader2, User, Lock, Star,
} from 'lucide-react';

interface CourseItem {
  id: string;
  titleUz: string;
  description: string | null;
  coverImage: string | null;
  subject: { nameUz: string; icon: string | null };
  teacherName: string | null;
  accessType: string;
  price: number;
  isFree: boolean;
  difficulty: number | null;
  estimatedHours: number | null;
  lessonCount: number;
  avgRating: number | null;
  reviewCount: number;
}

// Bir xil nomdagi fan har kategoriyada (DTM, SCHOOL, ...) ALOHIDA Subject
// qatoriga ega — shu sababli guruhlangan `/api/subjects/groups`dan olinadi
// (yagona manba, qarang lib/subject-groups.ts), fan bir marta ko'rinadi va
// tanlanganda shu nomdagi BARCHA subjectId birga `subject` parametrida
// yuboriladi.
interface SubjectGroupItem {
  name: string;
  subjectIds: string[];
  itemCount: number;
}

const categoryTypeOptions = [
  { label: 'Barchasi', value: '' },
  { label: 'DTM', value: 'DTM' },
  { label: 'Maktab', value: 'SCHOOL' },
  { label: 'Attestatsiya', value: 'ATTESTATION' },
  { label: 'SAT', value: 'SAT' },
  { label: 'GRE', value: 'GRE' },
  { label: 'Milliy sertifikat', value: 'CERTIFICATE' },
];

const ACCESS_LABELS: Record<string, { label: string; color: string }> = {
  free: { label: 'Bepul', color: 'bg-green-50 text-green-600' },
  premium: { label: 'Premium', color: 'bg-purple-50 text-purple-600' },
  teacher: { label: 'Ustoz', color: 'bg-blue-50 text-blue-600' },
  premium_teacher: { label: 'Premium/Ustoz', color: 'bg-indigo-50 text-indigo-600' },
  paid: { label: 'Narxli', color: 'bg-orange-50 text-orange-600' },
};

export default function CoursesCatalogPage() {
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [subjectGroups, setSubjectGroups] = useState<SubjectGroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryType, setCategoryType] = useState('');
  const [subjectName, setSubjectName] = useState('');

  useEffect(() => {
    fetch('/api/subjects/groups').then((r) => r.json()).then((data) => {
      if (data.groups) setSubjectGroups(data.groups);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (categoryType) params.set('category', categoryType);
    const group = subjectGroups.find((g) => g.name === subjectName);
    if (group) params.set('subject', group.subjectIds.join(','));
    fetch(`/api/courses?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => { if (data.courses) setCourses(data.courses); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [categoryType, subjectName, subjectGroups]);

  const filteredCourses = courses.filter((c) => c.titleUz.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary flex items-center gap-2">
          <GraduationCap size={26} className="text-primary-600" /> Kurslar
        </h1>
        <p className="text-text-secondary mt-1 text-sm sm:text-base">Video-asosli kurslar orqali chuqur o&apos;rganing</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card p-4 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            placeholder="Kurs qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {categoryTypeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setCategoryType(opt.value); setSubjectName(''); }}
              className={`px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all ${
                categoryType === opt.value ? 'bg-primary-600 text-white' : 'bg-background border border-border text-text-secondary hover:border-primary-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {subjectGroups.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSubjectName('')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                subjectName === '' ? 'bg-primary-100 text-primary-700' : 'bg-gray-50 text-text-secondary hover:bg-gray-100'
              }`}
            >
              Barcha fanlar
            </button>
            {subjectGroups.map((g) => (
              <button
                key={g.name}
                onClick={() => setSubjectName(g.name)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  subjectName === g.name ? 'bg-primary-100 text-primary-700' : 'bg-gray-50 text-text-secondary hover:bg-gray-100'
                }`}
              >
                {g.name} · {g.itemCount}
              </button>
            ))}
          </div>
        )}
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-primary-600" />
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="card p-12 text-center">
          <GraduationCap size={48} className="text-text-secondary mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">Kurs topilmadi</h3>
          <p className="text-sm text-text-secondary">Boshqa filtr yoki qidiruv bilan urinib ko&apos;ring</p>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCourses.map((course, i) => {
            const access = ACCESS_LABELS[course.accessType] || ACCESS_LABELS.free;
            return (
              <motion.div key={course.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 * i }}>
                <Link href={`/courses/${course.id}`} className="card overflow-hidden block hover:shadow-lg transition-shadow h-full flex flex-col">
                  <div className="h-36 bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center relative overflow-hidden">
                    {course.coverImage ? (
                      <img src={course.coverImage} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <GraduationCap size={40} className="text-white/80" />
                    )}
                    {course.accessType !== 'free' && (
                      <span className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/40 text-white">
                        <Lock size={12} />
                      </span>
                    )}
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex items-center gap-1.5 text-xs text-text-secondary mb-1.5">
                      <span>{course.subject.icon} {course.subject.nameUz}</span>
                    </div>
                    <h3 className="font-semibold text-text-primary text-sm mb-2 line-clamp-2">{course.titleUz}</h3>
                    <div className="flex items-center gap-3 mb-3">
                      {course.teacherName && (
                        <p className="text-xs text-text-secondary flex items-center gap-1">
                          <User size={11} /> {course.teacherName}
                        </p>
                      )}
                      {course.avgRating !== null && (
                        <p className="text-xs text-amber-600 flex items-center gap-1">
                          <Star size={11} className="fill-amber-500 text-amber-500" /> {course.avgRating} ({course.reviewCount})
                        </p>
                      )}
                    </div>
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-text-secondary">
                        <span className="flex items-center gap-1"><Layers size={12} /> {course.lessonCount} dars</span>
                        {course.estimatedHours ? (
                          <span className="flex items-center gap-1"><Clock size={12} /> {course.estimatedHours}s</span>
                        ) : null}
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${access.color}`}>
                        {course.isFree ? 'Bepul' : course.accessType === 'paid' ? `${course.price.toLocaleString()} so'm` : access.label}
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
