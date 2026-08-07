'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from '@/i18n/routing';
import {
  ArrowLeft, Plus, GraduationCap, Users, Layers, Trash2,
  Pencil, Eye, EyeOff, Loader2, Search,
} from 'lucide-react';

interface CourseItem {
  id: string;
  titleUz: string;
  subject: { nameUz: string; icon: string | null };
  isPublished: boolean;
  isFree: boolean;
  price: number;
  accessType: string;
  coverImage: string | null;
  createdAt: string;
  lessonCount: number;
  sectionCount: number;
  studentCount: number;
}

export default function TeacherCoursesPage() {
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const res = await fetch('/api/teacher/courses');
      const data = await res.json();
      if (data.courses) setCourses(data.courses);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
    setLoading(false);
  };

  const handleDelete = async (courseId: string) => {
    if (!confirm("Bu kursni o'chirishni tasdiqlaysizmi? Bu amalni qaytarib bo'lmaydi.")) return;
    setDeleting(courseId);
    try {
      const res = await fetch(`/api/teacher/courses/${courseId}`, { method: 'DELETE' });
      if (res.ok) {
        setCourses(courses.filter((c) => c.id !== courseId));
      } else {
        alert("O'chirishda xatolik yuz berdi");
      }
    } catch {
      alert('Server xatolik');
    }
    setDeleting(null);
  };

  const handleTogglePublish = async (courseId: string, currentState: boolean) => {
    setToggling(courseId);
    try {
      const res = await fetch(`/api/teacher/courses/${courseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !currentState }),
      });
      if (res.ok) {
        setCourses(courses.map((c) => (c.id === courseId ? { ...c, isPublished: !currentState } : c)));
      } else {
        alert('Xatolik yuz berdi');
      }
    } catch {
      alert('Server xatolik');
    }
    setToggling(null);
  };

  const filteredCourses = courses.filter((course) => {
    const matchesSearch = course.titleUz.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === 'all' ? true : filter === 'published' ? course.isPublished : !course.isPublished;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <Link href="/teacher" className="p-2 rounded-lg hover:bg-primary-50 transition-colors">
            <ArrowLeft size={20} className="text-text-secondary" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Mening kurslarim</h1>
            <p className="text-sm text-text-secondary">Video-asosli kurslaringizni boshqaring</p>
          </div>
        </div>
        <Link href="/teacher/courses/create" className="btn-primary flex items-center gap-2 self-start sm:self-auto ml-14 sm:ml-0">
          <Plus size={18} />
          Yangi kurs
        </Link>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              placeholder="Kurs nomini qidirish..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all text-sm"
            />
          </div>
          <div className="flex gap-2">
            {([
              { id: 'all' as const, label: 'Barchasi' },
              { id: 'published' as const, label: 'Nashr qilingan' },
              { id: 'draft' as const, label: 'Qoralama' },
            ]).map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  filter === f.id ? 'bg-primary-600 text-white' : 'bg-background border border-border text-text-secondary hover:border-primary-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-primary-600" />
        </div>
      ) : filteredCourses.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-12 text-center">
          <GraduationCap size={48} className="text-text-secondary mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            {courses.length === 0 ? 'Hali kurs yaratilmagan' : 'Natija topilmadi'}
          </h3>
          <p className="text-sm text-text-secondary mb-6">
            {courses.length === 0 ? 'Birinchi kursingizni yarating!' : "Qidiruv yoki filtrni o'zgartiring"}
          </p>
          {courses.length === 0 && (
            <Link href="/teacher/courses/create" className="btn-primary inline-flex items-center gap-2">
              <Plus size={16} />
              Kurs yaratish
            </Link>
          )}
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-3">
          {filteredCourses.map((course, index) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * index }}
              className="card p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {course.coverImage ? (
                      <img src={course.coverImage} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <GraduationCap size={20} className="text-primary-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-text-primary text-sm truncate">{course.titleUz}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${
                        course.isPublished ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {course.isPublished ? 'Nashr' : 'Qoralama'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-text-secondary">
                      <span className="flex items-center gap-1">{course.subject.icon} {course.subject.nameUz}</span>
                      <span className="flex items-center gap-1"><Layers size={12} /> {course.sectionCount} bo&apos;lim, {course.lessonCount} dars</span>
                      <span className="flex items-center gap-1"><Users size={12} /> {course.studentCount} talaba</span>
                      <span className={`px-1.5 py-0.5 rounded ${course.isFree ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                        {course.isFree ? 'Bepul' : `${course.price.toLocaleString()} so'm`}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 ml-16 sm:ml-4">
                  <button
                    onClick={() => handleTogglePublish(course.id, course.isPublished)}
                    disabled={toggling === course.id}
                    title={course.isPublished ? 'Nashrdan olish' : 'Nashr qilish'}
                    className={`p-2 rounded-lg transition-colors ${
                      course.isPublished ? 'text-green-600 hover:bg-green-50' : 'text-yellow-600 hover:bg-yellow-50'
                    }`}
                  >
                    {toggling === course.id ? <Loader2 size={16} className="animate-spin" /> : course.isPublished ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                  <Link href={`/teacher/courses/${course.id}/edit`} className="p-2 rounded-lg text-primary-600 hover:bg-primary-50 transition-colors" title="Tahrirlash">
                    <Pencil size={16} />
                  </Link>
                  <button
                    onClick={() => handleDelete(course.id)}
                    disabled={deleting === course.id}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                  >
                    {deleting === course.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
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
