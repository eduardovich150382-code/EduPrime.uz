'use client';

import { useEffect, useState } from 'react';
import {
  ChevronDown, Lock, CheckCircle2, Circle, Play, FileText, ListChecks,
} from 'lucide-react';
import type { SectionItem } from './types';

export const LESSON_ICONS = { VIDEO: Play, TEXT: FileText, QUIZ: ListChecks, PDF: FileText };

interface Props {
  courseId: string;
  sections: SectionItem[];
  currentLessonId: string | null;
  onSelect: (lessonId: string) => void;
}

function storageKey(courseId: string) {
  return `course-curriculum-open:${courseId}`;
}

function loadOpenSections(courseId: string): string[] | null {
  try {
    const raw = window.localStorage.getItem(storageKey(courseId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    // Xususiy rejim yoki localStorage o'chirilgan bo'lishi mumkin — sukut holatga tushamiz
    return null;
  }
}

/**
 * Modul (section) + dars ro'yxati — yig'iladigan (accordion) ko'rinishda.
 * Ish stoli yon panelida va mobil pastdan chiquvchi ro'yxatda bir xil komponent
 * ishlatiladi, shu sababli ochiq/yopiq holat va localStorage mantig'i bir joyda.
 */
export default function CourseCurriculum({ courseId, sections, currentLessonId, onSelect }: Props) {
  const currentSectionId = sections.find((s) => s.lessons.some((l) => l.id === currentLessonId))?.id;

  const [openSections, setOpenSections] = useState<Set<string>>(() => new Set(currentSectionId ? [currentSectionId] : []));
  const [hydrated, setHydrated] = useState(false);

  // localStorage'dan faqat client'da o'qiladi (SSR bilan mos kelishi uchun) —
  // saqlangan holat bo'lmasa, standart holat "faqat joriy dars moduli ochiq".
  useEffect(() => {
    const stored = loadOpenSections(courseId);
    if (stored) setOpenSections(new Set(stored));
    setHydrated(true);
  }, [courseId]);

  // Joriy dars boshqa modulga o'tsa ("Keyingi dars" yoki ro'yxatdan tanlash orqali),
  // o'sha modul avtomatik ochilsin — foydalanuvchi yopiq akkordionga tushib qolmasin.
  useEffect(() => {
    if (!currentSectionId) return;
    setOpenSections((prev) => (prev.has(currentSectionId) ? prev : new Set(prev).add(currentSectionId)));
  }, [currentSectionId]);

  useEffect(() => {
    if (!hydrated) return; // dastlabki (localStorage'dan oldingi) holatni qayta yozib yubormaslik uchun
    try {
      window.localStorage.setItem(storageKey(courseId), JSON.stringify([...openSections]));
    } catch {
      // saqlab bo'lmasa ham interfeys ishlashda davom etsin
    }
  }, [courseId, openSections, hydrated]);

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-2">
      {sections.map((section, sIdx) => {
        const sectionCompleted = section.lessons.filter((l) => l.completed).length;
        const sectionTotal = section.lessons.length;
        const sectionPct = sectionTotal > 0 ? Math.round((sectionCompleted / sectionTotal) * 100) : 0;
        const isOpen = openSections.has(section.id);
        return (
          <div key={section.id} className="border border-border rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center gap-2 px-3 py-2.5 min-h-[44px] text-left hover:bg-gray-50 transition-colors"
              aria-expanded={isOpen}
            >
              <span
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ background: `conic-gradient(rgb(34 197 94) ${sectionPct}%, rgb(229 231 235) 0)` }}
                title={`${sectionCompleted}/${sectionTotal} dars tugallandi`}
              />
              <span className="text-xs font-bold text-text-secondary truncate flex-1">{sIdx + 1}. {section.titleUz}</span>
              <span className="text-xs text-text-secondary flex-shrink-0">{sectionCompleted}/{sectionTotal}</span>
              <ChevronDown size={16} className={`flex-shrink-0 text-text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
              <div className="space-y-1 px-2 pb-2">
                {section.lessons.map((lesson) => {
                  const Icon = LESSON_ICONS[lesson.type];
                  const isActive = lesson.id === currentLessonId;
                  return (
                    <button
                      key={lesson.id}
                      onClick={() => !lesson.locked && onSelect(lesson.id)}
                      disabled={lesson.locked}
                      title={lesson.locked ? "Avval oldingi darsni tugating" : undefined}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 min-h-[44px] rounded-lg text-left text-sm transition-colors ${
                        lesson.locked
                          ? 'text-gray-300 cursor-not-allowed'
                          : isActive ? 'bg-primary-100 text-primary-700 font-medium' : 'hover:bg-gray-50 text-text-secondary'
                      }`}
                    >
                      {lesson.locked ? (
                        <Lock size={16} className="text-gray-300 flex-shrink-0" />
                      ) : lesson.completed ? (
                        <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
                      ) : (
                        <Circle size={16} className="text-gray-300 flex-shrink-0" />
                      )}
                      <Icon size={16} className="flex-shrink-0" />
                      <span className="flex-1 truncate">{lesson.titleUz}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
