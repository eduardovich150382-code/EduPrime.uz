'use client';

import { useState } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, Paperclip, ListChecks, Video, Loader2 } from 'lucide-react';

export type LessonBlockType = 'FILE' | 'QUIZ' | 'VIDEO_SOLUTION';

export interface LessonBlockForm {
  id?: string;
  type: LessonBlockType;
  labelUz: string;
  fileUrl: string;
  videoUrl: string;
  testId: string;
}

interface TeacherTestItem {
  id: string;
  titleUz: string;
}

interface Props {
  blocks: LessonBlockForm[];
  onChange: (blocks: LessonBlockForm[]) => void;
  teacherTests: TeacherTestItem[];
}

const BLOCK_META: Record<LessonBlockType, { label: string; icon: typeof Paperclip; addLabel: string }> = {
  FILE: { label: 'Fayl', icon: Paperclip, addLabel: '+ Fayl' },
  QUIZ: { label: "Qo'shimcha test", icon: ListChecks, addLabel: '+ Test' },
  VIDEO_SOLUTION: { label: 'Video-yechim', icon: Video, addLabel: '+ Video-yechim' },
};

const MAX_BLOCKS = 8;

/**
 * Darsning asosiy kontentiga (video/matn/test/PDF) QO'SHIMCHA ravishda
 * biriktiriladigan ixtiyoriy materiallar — fayl(lar), qo'shimcha mashq
 * testi, video-yechim. `FillBlankEditor`/`MatchingEditor` bilan bir xil
 * naqsh: create va edit sahifalarida qayta ishlatiladigan mustaqil
 * komponent. Bo'sh massiv — hech narsa saqlanmaydi, eski (blokssiz)
 * darslarga hech qanday ta'sir qilmaydi.
 */
export default function LessonBlocksEditor({ blocks, onChange, teacherTests }: Props) {
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  const addBlock = (type: LessonBlockType) => {
    if (blocks.length >= MAX_BLOCKS) return;
    onChange([...blocks, { type, labelUz: '', fileUrl: '', videoUrl: '', testId: '' }]);
  };
  const removeBlock = (idx: number) => onChange(blocks.filter((_, i) => i !== idx));
  const moveBlock = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= blocks.length) return;
    const updated = [...blocks];
    [updated[idx], updated[j]] = [updated[j], updated[idx]];
    onChange(updated);
  };
  const updateBlock = (idx: number, patch: Partial<LessonBlockForm>) => {
    const updated = [...blocks];
    updated[idx] = { ...updated[idx], ...patch };
    onChange(updated);
  };

  const handleFileUpload = async (idx: number, file: File) => {
    if (file.size > 8 * 1024 * 1024) {
      alert('Fayl hajmi 8 MB dan oshmasligi kerak');
      return;
    }
    setUploadingIdx(idx);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload?endpoint=aiImportFile', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok && data.url) {
        updateBlock(idx, { fileUrl: data.url });
      } else {
        alert(data.error || 'Faylni yuklashda xatolik');
      }
    } catch {
      alert('Faylni yuklashda xatolik');
    }
    setUploadingIdx(null);
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-text-secondary">Qo&apos;shimcha materiallar (ixtiyoriy)</p>

      {blocks.length > 0 && (
        <div className="space-y-2">
          {blocks.map((block, idx) => {
            const meta = BLOCK_META[block.type];
            const Icon = meta.icon;
            return (
              <div key={idx} className="flex items-start gap-2 p-2.5 rounded-lg border border-border bg-white">
                <div className="flex flex-col mt-0.5">
                  <button type="button" onClick={() => moveBlock(idx, -1)} disabled={idx === 0} className="p-0.5 text-text-secondary hover:text-primary-600 disabled:opacity-20">
                    <ChevronUp size={11} />
                  </button>
                  <button type="button" onClick={() => moveBlock(idx, 1)} disabled={idx === blocks.length - 1} className="p-0.5 text-text-secondary hover:text-primary-600 disabled:opacity-20">
                    <ChevronDown size={11} />
                  </button>
                </div>
                <Icon size={14} className="text-primary-500 flex-shrink-0 mt-1.5" />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <input
                    type="text"
                    value={block.labelUz}
                    onChange={(e) => updateBlock(idx, { labelUz: e.target.value })}
                    placeholder={`${meta.label} nomi (ixtiyoriy)`}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border text-xs"
                  />
                  {block.type === 'FILE' && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        type="file"
                        id={`block-file-${idx}`}
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(idx, file);
                          e.target.value = '';
                        }}
                      />
                      <label
                        htmlFor={`block-file-${idx}`}
                        className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-border bg-gray-50 text-text-secondary hover:bg-gray-100 cursor-pointer flex items-center gap-1.5"
                      >
                        {uploadingIdx === idx ? <Loader2 size={11} className="animate-spin" /> : <Paperclip size={11} />}
                        Fayl tanlash
                      </label>
                      {block.fileUrl && (
                        <a href={block.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-green-600 hover:underline">
                          ✓ yuklandi — ko&apos;rish
                        </a>
                      )}
                    </div>
                  )}
                  {block.type === 'VIDEO_SOLUTION' && (
                    <input
                      type="url"
                      value={block.videoUrl}
                      onChange={(e) => updateBlock(idx, { videoUrl: e.target.value })}
                      placeholder="https://youtube.com/watch?v=..."
                      className="w-full px-2.5 py-1.5 rounded-lg border border-border text-xs"
                    />
                  )}
                  {block.type === 'QUIZ' && (
                    <select
                      value={block.testId}
                      onChange={(e) => updateBlock(idx, { testId: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-border text-xs"
                    >
                      <option value="">Test tanlang...</option>
                      {teacherTests.map((t) => (
                        <option key={t.id} value={t.id}>{t.titleUz}</option>
                      ))}
                    </select>
                  )}
                </div>
                <button type="button" onClick={() => removeBlock(idx)} className="p-1 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0 mt-0.5">
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {blocks.length < MAX_BLOCKS && (
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(BLOCK_META) as LessonBlockType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => addBlock(type)}
              className="text-xs font-medium text-primary-600 hover:text-primary-700 px-2 py-1 rounded-lg hover:bg-primary-50 flex items-center gap-1"
            >
              <Plus size={11} /> {BLOCK_META[type].addLabel}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
