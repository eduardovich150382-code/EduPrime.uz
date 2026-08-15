'use client';

import { useState } from 'react';
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove, sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus, Trash2, Loader2, FileUp, Video, FileText, ListChecks, Sparkles,
  GripVertical, ChevronDown, ChevronRight,
} from 'lucide-react';
import LessonBlocksEditor, { type LessonBlockForm } from './LessonBlocksEditor';

export type LessonType = 'VIDEO' | 'TEXT' | 'QUIZ' | 'PDF';

export interface LessonForm {
  /** Client-only barqaror kalit — sudrab-tashlash va yig'ish/kengaytirish holati uchun zarur, serverga yuborilmaydi. */
  _key: string;
  id?: string;
  titleUz: string;
  type: LessonType;
  videoUrl: string;
  content: string;
  testId: string;
  fileUrl: string;
  minPassPercent: number | '';
  durationMinutes: number | '';
  isPreviewable: boolean;
  blocks: LessonBlockForm[];
}

export interface SectionForm {
  _key: string;
  id?: string;
  titleUz: string;
  lessons: LessonForm[];
}

export interface TeacherTestItem {
  id: string;
  titleUz: string;
}

function genKey(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `k${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function createEmptyLesson(): LessonForm {
  return {
    _key: genKey(), titleUz: '', type: 'VIDEO', videoUrl: '', content: '', testId: '', fileUrl: '',
    minPassPercent: '', durationMinutes: '', isPreviewable: false, blocks: [],
  };
}

export function createEmptySection(): SectionForm {
  return { _key: genKey(), titleUz: '', lessons: [createEmptyLesson()] };
}

const LESSON_TYPE_META: Record<LessonType, { label: string; icon: typeof Video }> = {
  VIDEO: { label: 'Video', icon: Video },
  TEXT: { label: 'Matn', icon: FileText },
  QUIZ: { label: 'Tekshiruv', icon: ListChecks },
  PDF: { label: 'PDF', icon: FileUp },
};

// Sortable id'lar — bitta DndContext ostida bo'lim va dars ro'yxatlari
// mustaqil SortableContext sifatida yashaydi (dnd-kit'ning "multiple
// containers" naqshi). Prefiks orqali handleDragEnd qaysi darajada
// (bo'lim/dars) tartib o'zgarganini aniqlaydi. UUID'larda ':' belgisi
// bo'lmagani uchun split(':') xavfsiz.
const sectionSortId = (key: string) => `section:${key}`;
const lessonSortId = (sectionKey: string, lessonKey: string) => `lesson:${sectionKey}:${lessonKey}`;

interface Props {
  sections: SectionForm[];
  onSectionsChange: (sections: SectionForm[]) => void;
  teacherTests: TeacherTestItem[];
  onTeacherTestsChange: (tests: TeacherTestItem[]) => void;
  subjectId: string;
}

/**
 * Kurs dasturi (bo'lim → dars) tahririvchisi — `create` va `edit`
 * sahifalarida qayta ishlatiladi (avval ikkalasida deyarli bir xil ~350
 * qator dublikat kod bor edi). Sudrab-tashlab tartiblash (@dnd-kit),
 * yig'ish/kengaytirish va dars ichidagi qo'shimcha bloklar (LessonBlocksEditor)
 * shu yerda birlashtirilgan.
 */
export default function CourseCurriculumEditor({ sections, onSectionsChange, teacherTests, onTeacherTestsChange, subjectId }: Props) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [generatingQuizKey, setGeneratingQuizKey] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const toggleSet = (setter: typeof setExpandedSections, key: string) => {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // ---- Section helpers ----
  const addSection = () => {
    const section = createEmptySection();
    onSectionsChange([...sections, section]);
    setExpandedSections((prev) => new Set(prev).add(section._key));
    setExpandedLessons((prev) => new Set(prev).add(section.lessons[0]._key));
  };
  const removeSection = (sIdx: number) => {
    if (sections.length <= 1) return;
    onSectionsChange(sections.filter((_, idx) => idx !== sIdx));
  };
  const updateSectionTitle = (sIdx: number, titleUz: string) => {
    const updated = [...sections];
    updated[sIdx] = { ...updated[sIdx], titleUz };
    onSectionsChange(updated);
  };

  // ---- Lesson helpers ----
  const addLesson = (sIdx: number) => {
    const lesson = createEmptyLesson();
    const updated = [...sections];
    updated[sIdx] = { ...updated[sIdx], lessons: [...updated[sIdx].lessons, lesson] };
    onSectionsChange(updated);
    setExpandedLessons((prev) => new Set(prev).add(lesson._key));
  };
  const removeLesson = (sIdx: number, lIdx: number) => {
    const updated = [...sections];
    if (updated[sIdx].lessons.length <= 1) return;
    updated[sIdx] = { ...updated[sIdx], lessons: updated[sIdx].lessons.filter((_, idx) => idx !== lIdx) };
    onSectionsChange(updated);
  };
  const updateLesson = (sIdx: number, lIdx: number, patch: Partial<LessonForm>) => {
    const updated = [...sections];
    const lessons = [...updated[sIdx].lessons];
    lessons[lIdx] = { ...lessons[lIdx], ...patch };
    updated[sIdx] = { ...updated[sIdx], lessons };
    onSectionsChange(updated);
  };
  const insertLessonAfter = (sIdx: number, lIdx: number, lesson: LessonForm) => {
    const updated = [...sections];
    const lessons = [...updated[sIdx].lessons];
    lessons.splice(lIdx + 1, 0, lesson);
    updated[sIdx] = { ...updated[sIdx], lessons };
    onSectionsChange(updated);
    setExpandedLessons((prev) => new Set(prev).add(lesson._key));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId.startsWith('section:') && overId.startsWith('section:')) {
      const activeKey = activeId.slice('section:'.length);
      const overKey = overId.slice('section:'.length);
      const oldIndex = sections.findIndex((s) => s._key === activeKey);
      const newIndex = sections.findIndex((s) => s._key === overKey);
      if (oldIndex === -1 || newIndex === -1) return;
      onSectionsChange(arrayMove(sections, oldIndex, newIndex));
      return;
    }

    if (activeId.startsWith('lesson:') && overId.startsWith('lesson:')) {
      const [, activeSectionKey, activeLessonKey] = activeId.split(':');
      const [, overSectionKey, overLessonKey] = overId.split(':');
      // Bo'limlar orasida dars ko'chirish qo'llab-quvvatlanmaydi — faqat
      // o'sha bo'lim ichida qayta tartiblanadi.
      if (activeSectionKey !== overSectionKey) return;
      const sIdx = sections.findIndex((s) => s._key === activeSectionKey);
      if (sIdx === -1) return;
      const lessons = sections[sIdx].lessons;
      const oldIndex = lessons.findIndex((l) => l._key === activeLessonKey);
      const newIndex = lessons.findIndex((l) => l._key === overLessonKey);
      if (oldIndex === -1 || newIndex === -1) return;
      const updated = [...sections];
      updated[sIdx] = { ...updated[sIdx], lessons: arrayMove(lessons, oldIndex, newIndex) };
      onSectionsChange(updated);
    }
  };

  const handleFileUpload = async (sIdx: number, lIdx: number, file: File) => {
    const key = sections[sIdx].lessons[lIdx]._key;
    if (file.size > 8 * 1024 * 1024) {
      alert("Fayl hajmi 8 MB dan oshmasligi kerak");
      return;
    }
    setUploadingKey(key);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload?endpoint=aiImportFile', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok && data.url) {
        updateLesson(sIdx, lIdx, { fileUrl: data.url });
      } else {
        alert(data.error || 'Faylni yuklashda xatolik');
      }
    } catch {
      alert('Faylni yuklashda xatolik');
    }
    setUploadingKey(null);
  };

  const handleGenerateQuiz = async (sIdx: number, lIdx: number) => {
    const lesson = sections[sIdx].lessons[lIdx];
    if (!lesson.content || lesson.content.trim().length < 20) {
      alert("Avval dars matnini kiriting (kamida bir necha jumla)!");
      return;
    }
    if (!subjectId) {
      alert("Avval 'Kurs ma'lumotlari' qadamida fanni tanlang!");
      return;
    }
    setGeneratingQuizKey(lesson._key);
    try {
      const res = await fetch('/api/ai/quiz-from-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: lesson.content,
          subjectId,
          titleUz: `AI tekshiruv: ${lesson.titleUz || 'dars'}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Xatolik yuz berdi');
        setGeneratingQuizKey(null);
        return;
      }
      onTeacherTestsChange([...teacherTests, { id: data.test.id, titleUz: data.test.titleUz }]);
      insertLessonAfter(sIdx, lIdx, {
        ...createEmptyLesson(),
        titleUz: data.test.titleUz,
        type: 'QUIZ',
        testId: data.test.id,
      });
      alert(`✅ ${data.test.questionCount} ta savolli tekshiruv yaratildi va shu darsdan keyin qo'shildi!`);
    } catch {
      alert("AI xatolik. Qayta urinib ko'ring.");
    }
    setGeneratingQuizKey(null);
  };

  return (
    <div className="space-y-4">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sections.map((s) => sectionSortId(s._key))} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {sections.map((section, sIdx) => (
              <SortableSectionCard
                key={section._key}
                section={section}
                sIdx={sIdx}
                isExpanded={expandedSections.has(section._key)}
                onToggle={() => toggleSet(setExpandedSections, section._key)}
                onTitleChange={(v) => updateSectionTitle(sIdx, v)}
                onRemove={() => removeSection(sIdx)}
                canRemove={sections.length > 1}
                expandedLessons={expandedLessons}
                onToggleLesson={(key) => toggleSet(setExpandedLessons, key)}
                onAddLesson={() => addLesson(sIdx)}
                onRemoveLesson={(lIdx) => removeLesson(sIdx, lIdx)}
                onUpdateLesson={(lIdx, patch) => updateLesson(sIdx, lIdx, patch)}
                onGenerateQuiz={(lIdx) => handleGenerateQuiz(sIdx, lIdx)}
                onFileUpload={(lIdx, file) => handleFileUpload(sIdx, lIdx, file)}
                uploadingKey={uploadingKey}
                generatingQuizKey={generatingQuizKey}
                teacherTests={teacherTests}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <button type="button" onClick={addSection} className="w-full px-4 py-3 rounded-xl text-sm text-primary-600 hover:bg-primary-50 flex items-center justify-center gap-2 transition-colors border border-dashed border-primary-200">
        <Plus size={16} /> Bo&apos;lim qo&apos;shish
      </button>
    </div>
  );
}

interface SortableSectionCardProps {
  section: SectionForm;
  sIdx: number;
  isExpanded: boolean;
  onToggle: () => void;
  onTitleChange: (v: string) => void;
  onRemove: () => void;
  canRemove: boolean;
  expandedLessons: Set<string>;
  onToggleLesson: (key: string) => void;
  onAddLesson: () => void;
  onRemoveLesson: (lIdx: number) => void;
  onUpdateLesson: (lIdx: number, patch: Partial<LessonForm>) => void;
  onGenerateQuiz: (lIdx: number) => void;
  onFileUpload: (lIdx: number, file: File) => void;
  uploadingKey: string | null;
  generatingQuizKey: string | null;
  teacherTests: TeacherTestItem[];
}

function SortableSectionCard(props: SortableSectionCardProps) {
  const { section, sIdx, isExpanded, onToggle, onTitleChange, onRemove, canRemove } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sectionSortId(section._key) });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <button type="button" {...attributes} {...listeners} className="p-1.5 text-text-secondary hover:text-primary-600 cursor-grab active:cursor-grabbing touch-none flex-shrink-0">
          <GripVertical size={16} />
        </button>
        <button type="button" onClick={onToggle} className="p-1 text-text-secondary hover:text-primary-600 flex-shrink-0">
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-1 rounded-full flex-shrink-0">{sIdx + 1}-bo&apos;lim</span>
        <input
          type="text"
          value={section.titleUz}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Bo'lim nomi"
          className="flex-1 min-w-0 px-4 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all text-sm font-medium"
        />
        <span className="text-xs text-text-secondary flex-shrink-0">{section.lessons.length} dars</span>
        <button type="button" onClick={onRemove} disabled={!canRemove} className="p-2 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-30 flex-shrink-0">
          <Trash2 size={16} />
        </button>
      </div>

      {isExpanded && (
        <div className="pl-8 space-y-3">
          <SortableContext items={section.lessons.map((l) => lessonSortId(section._key, l._key))} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {section.lessons.map((lesson, lIdx) => (
                <SortableLessonCard
                  key={lesson._key}
                  sortId={lessonSortId(section._key, lesson._key)}
                  lesson={lesson}
                  isExpanded={props.expandedLessons.has(lesson._key)}
                  onToggle={() => props.onToggleLesson(lesson._key)}
                  onRemove={() => props.onRemoveLesson(lIdx)}
                  canRemove={section.lessons.length > 1}
                  onUpdate={(patch) => props.onUpdateLesson(lIdx, patch)}
                  onGenerateQuiz={() => props.onGenerateQuiz(lIdx)}
                  onFileUpload={(file) => props.onFileUpload(lIdx, file)}
                  uploading={props.uploadingKey === lesson._key}
                  generatingQuiz={props.generatingQuizKey === lesson._key}
                  teacherTests={props.teacherTests}
                />
              ))}
            </div>
          </SortableContext>
          <button type="button" onClick={props.onAddLesson} className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1">
            <Plus size={12} /> Dars qo&apos;shish
          </button>
        </div>
      )}
    </div>
  );
}

interface SortableLessonCardProps {
  sortId: string;
  lesson: LessonForm;
  isExpanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
  canRemove: boolean;
  onUpdate: (patch: Partial<LessonForm>) => void;
  onGenerateQuiz: () => void;
  onFileUpload: (file: File) => void;
  uploading: boolean;
  generatingQuiz: boolean;
  teacherTests: TeacherTestItem[];
}

function SortableLessonCard(props: SortableLessonCardProps) {
  const { sortId, lesson, isExpanded, onToggle, onRemove, canRemove, onUpdate, onGenerateQuiz, onFileUpload, uploading, generatingQuiz, teacherTests } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sortId });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };
  const TypeIcon = LESSON_TYPE_META[lesson.type].icon;

  return (
    <div ref={setNodeRef} style={style} className="p-3 rounded-xl border border-border bg-gray-50/50 space-y-3">
      <div className="flex items-center gap-2">
        <button type="button" {...attributes} {...listeners} className="p-1 text-text-secondary hover:text-primary-600 cursor-grab active:cursor-grabbing touch-none flex-shrink-0">
          <GripVertical size={14} />
        </button>
        <button type="button" onClick={onToggle} className="p-0.5 text-text-secondary hover:text-primary-600 flex-shrink-0">
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <TypeIcon size={15} className="text-primary-500 flex-shrink-0" />
        <input
          type="text"
          value={lesson.titleUz}
          onChange={(e) => onUpdate({ titleUz: e.target.value })}
          placeholder="Dars nomi"
          className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-primary-500/20 text-sm"
        />
        {!isExpanded && lesson.durationMinutes !== '' && (
          <span className="text-[11px] text-text-secondary flex-shrink-0">{lesson.durationMinutes} daq</span>
        )}
        {!isExpanded && lesson.blocks.length > 0 && (
          <span className="text-[11px] font-semibold text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded-full flex-shrink-0">+{lesson.blocks.length}</span>
        )}
        <button type="button" onClick={onRemove} disabled={!canRemove} className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 flex-shrink-0">
          <Trash2 size={14} />
        </button>
      </div>

      {isExpanded && (
        <>
          <div className="flex flex-wrap items-center gap-3 pl-6">
            <div className="inline-flex rounded-lg border border-border overflow-hidden">
              {(Object.keys(LESSON_TYPE_META) as LessonType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onUpdate({ type: t })}
                  className={`px-3 py-1.5 text-xs font-medium transition-all ${
                    lesson.type === t ? 'bg-primary-600 text-white' : 'bg-white text-text-secondary hover:bg-gray-50'
                  }`}
                >
                  {LESSON_TYPE_META[t].label}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-1.5 text-xs text-text-secondary">
              Daqiqa:
              <input
                type="text"
                inputMode="numeric"
                value={lesson.durationMinutes}
                onChange={(e) => {
                  const val = e.target.value;
                  const num = parseInt(val);
                  onUpdate({ durationMinutes: val === '' ? '' : (isNaN(num) ? '' : num) });
                }}
                placeholder="10"
                className="w-16 px-2 py-1 rounded-lg border border-border text-center text-xs"
              />
            </label>

            <label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={lesson.isPreviewable}
                onChange={(e) => onUpdate({ isPreviewable: e.target.checked })}
                className="w-3.5 h-3.5 rounded border-border text-primary-600"
              />
              Bepul namuna
            </label>
          </div>

          <div className="pl-6">
            {lesson.type === 'VIDEO' && (
              <input
                type="url"
                value={lesson.videoUrl}
                onChange={(e) => onUpdate({ videoUrl: e.target.value })}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-primary-500/20 text-sm"
              />
            )}
            {lesson.type === 'TEXT' && (
              <div className="space-y-2">
                <textarea
                  value={lesson.content}
                  onChange={(e) => onUpdate({ content: e.target.value })}
                  placeholder="Dars matni... (LaTeX: $formula$)"
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-primary-500/20 text-sm resize-none font-mono"
                />
                <button
                  type="button"
                  onClick={onGenerateQuiz}
                  disabled={generatingQuiz || !lesson.content.trim()}
                  className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {generatingQuiz ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  AI bilan tekshiruv yasash
                </button>
              </div>
            )}
            {lesson.type === 'QUIZ' && (
              <div className="space-y-2">
                <select
                  value={lesson.testId}
                  onChange={(e) => onUpdate({ testId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-primary-500/20 text-sm"
                >
                  <option value="">Test tanlang...</option>
                  {teacherTests.map((t) => <option key={t.id} value={t.id}>{t.titleUz}</option>)}
                </select>
                <label className="flex items-center gap-1.5 text-xs text-text-secondary">
                  O&apos;tish uchun minimal foiz (ixtiyoriy):
                  <input
                    type="text"
                    inputMode="numeric"
                    value={lesson.minPassPercent}
                    onChange={(e) => {
                      const val = e.target.value;
                      const num = parseInt(val);
                      onUpdate({ minPassPercent: val === '' ? '' : (isNaN(num) ? '' : Math.min(100, Math.max(1, num))) });
                    }}
                    placeholder="60"
                    className="w-16 px-2 py-1 rounded-lg border border-border text-center text-xs"
                  />
                  %
                </label>
              </div>
            )}
            {lesson.type === 'PDF' && (
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="application/pdf"
                  id={`pdf-upload-${lesson._key}`}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onFileUpload(file);
                    e.target.value = '';
                  }}
                />
                <label
                  htmlFor={`pdf-upload-${lesson._key}`}
                  className="text-xs font-medium px-3 py-2 rounded-lg border border-border bg-white text-text-secondary hover:bg-gray-50 cursor-pointer flex items-center gap-1.5"
                >
                  {uploading ? <Loader2 size={12} className="animate-spin" /> : <FileUp size={12} />}
                  PDF yuklash
                </label>
                {lesson.fileUrl && (
                  <a href={lesson.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-green-600 hover:underline">
                    ✓ Fayl yuklandi — ko&apos;rish
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="pl-6 pt-1">
            <LessonBlocksEditor blocks={lesson.blocks} onChange={(blocks) => onUpdate({ blocks })} teacherTests={teacherTests} />
          </div>
        </>
      )}
    </div>
  );
}
