'use client';

import { useTranslations } from 'next-intl';
import { BookOpen, Clock, FileText, ListChecks } from 'lucide-react';

interface LessonTypeCount {
  type: string;
}

interface Props {
  lessons: LessonTypeCount[];
  estimatedHours: number | null;
}

// S25 — "Kurs tarkibi raqamlarda": dars/soat/test/PDF soni. Backend
// GET /api/courses/[id] barcha darslarning `type`ini (qulflangan bo'lsa ham)
// qaytaradi, shu sababli sanashni bu yerda, mijozda qilish mumkin — alohida
// API maydoni shart emas.
export default function CourseStats({ lessons, estimatedHours }: Props) {
  const t = useTranslations('courseDetail');

  const testCount = lessons.filter((l) => l.type === 'QUIZ').length;
  const pdfCount = lessons.filter((l) => l.type === 'PDF').length;

  const items: { icon: typeof BookOpen; label: string }[] = [
    { icon: BookOpen, label: t('statsLessons', { count: lessons.length }) },
  ];
  if (estimatedHours) items.push({ icon: Clock, label: t('statsHours', { count: estimatedHours }) });
  if (testCount > 0) items.push({ icon: ListChecks, label: t('statsTests', { count: testCount }) });
  if (pdfCount > 0) items.push({ icon: FileText, label: t('statsPdfs', { count: pdfCount }) });

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      {items.map(({ icon: Icon, label }, i) => (
        <div key={i} className="flex items-center gap-2 p-2.5 rounded-xl border border-border bg-gray-50/50 text-sm text-text-primary">
          <Icon size={15} className="text-primary-500 flex-shrink-0" />
          <span className="truncate">{label}</span>
        </div>
      ))}
    </div>
  );
}
