'use client';

import { useState } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, Paperclip, ListChecks, Video, Loader2, Link2, Dumbbell } from 'lucide-react';
import { isAllowedEmbedUrl, EMBED_ALLOWED_DOMAINS } from '@/lib/embed-allowlist';

export type LessonBlockType = 'FILE' | 'QUIZ' | 'VIDEO_SOLUTION' | 'EMBED' | 'PRACTICE';

export interface LessonBlockForm {
  id?: string;
  type: LessonBlockType;
  labelUz: string;
  fileUrl: string;
  videoUrl: string;
  testId: string;
  /** VIDEO_SOLUTION uchun — true bo'lsa, talaba shu darsning tekshiruvini topshirmaguncha video yashirin turadi (server GET /api/courses/[id]/learn'da majburlaydi). */
  revealAfterQuiz: boolean;
  /** EMBED — tashqi simulyatsiya havolasi; ruxsat etilgan domenlar lib/embed-allowlist.ts da, saqlashda SERVER tomonda ham tekshiriladi. */
  embedUrl: string;
  /** PRACTICE — tanlangan Item.id lar (/api/items/search orqali havzadan tanlanadi). */
  itemIds: string[];
  /** PRACTICE — faqat tahrirlagich uchun (serverga yuborilsa ham e'tiborsiz qoldiriladi): oxirgi "Savollarni tanlash" so'rovida ishlatilgan mavzu/son — qayta bosilganda formani bo'sh boshlamaslik uchun. */
  practiceTopic?: string;
  practiceCount?: number;
}

interface TeacherTestItem {
  id: string;
  titleUz: string;
}

interface Props {
  blocks: LessonBlockForm[];
  onChange: (blocks: LessonBlockForm[]) => void;
  teacherTests: TeacherTestItem[];
  /** PRACTICE bloki uchun — /api/items/search shu fan ichidan tanlaydi (kurs bitta fanga tegishli). */
  subjectId: string;
}

const BLOCK_META: Record<LessonBlockType, { label: string; icon: typeof Paperclip; addLabel: string }> = {
  FILE: { label: 'Fayl', icon: Paperclip, addLabel: '+ Fayl' },
  QUIZ: { label: "Qo'shimcha test", icon: ListChecks, addLabel: '+ Test' },
  VIDEO_SOLUTION: { label: 'Video-yechim', icon: Video, addLabel: '+ Video-yechim' },
  EMBED: { label: 'Interaktiv simulyatsiya', icon: Link2, addLabel: '+ Simulyatsiya' },
  PRACTICE: { label: 'Mashq (baholanmaydi)', icon: Dumbbell, addLabel: '+ Mashq' },
};

const MAX_BLOCKS = 8;
const MAX_PRACTICE_ITEMS = 30; // /api/lesson-blocks/[id]/practice/start va curriculum/route.ts dagi bilan bir xil chegara
const DEFAULT_PRACTICE_COUNT = 10;

/**
 * Darsning asosiy kontentiga (video/matn/test/PDF) QO'SHIMCHA ravishda
 * biriktiriladigan ixtiyoriy materiallar — fayl(lar), qo'shimcha mashq
 * testi, video-yechim. `FillBlankEditor`/`MatchingEditor` bilan bir xil
 * naqsh: create va edit sahifalarida qayta ishlatiladigan mustaqil
 * komponent. Bo'sh massiv — hech narsa saqlanmaydi, eski (blokssiz)
 * darslarga hech qanday ta'sir qilmaydi.
 */
export default function LessonBlocksEditor({ blocks, onChange, teacherTests, subjectId }: Props) {
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [pickingIdx, setPickingIdx] = useState<number | null>(null);

  const addBlock = (type: LessonBlockType) => {
    if (blocks.length >= MAX_BLOCKS) return;
    onChange([...blocks, {
      type, labelUz: '', fileUrl: '', videoUrl: '', testId: '', revealAfterQuiz: false,
      embedUrl: '', itemIds: [], practiceTopic: '', practiceCount: DEFAULT_PRACTICE_COUNT,
    }]);
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

  // PRACTICE — mavjud /api/items/search'ni qayta ishlatadi (S14), yangi
  // qidiruv yozilmagan. `subjectId` — kursning o'zi ega bo'lgan fan, shuning
  // uchun bu yerda alohida fan tanlash shart emas; ixtiyoriy mavzu yo'li
  // (masalan "mexanika/kinematika") havzani toraytiradi.
  const pickPracticeItems = async (idx: number, block: LessonBlockForm) => {
    setPickingIdx(idx);
    try {
      const topicPaths = block.practiceTopic?.trim() ? [block.practiceTopic.trim()] : [];
      const limit = Math.min(Math.max(block.practiceCount || DEFAULT_PRACTICE_COUNT, 1), MAX_PRACTICE_ITEMS);
      const res = await fetch('/api/items/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectIds: subjectId ? [subjectId] : [],
          topicPaths,
          limit,
        }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.ids)) {
        updateBlock(idx, { itemIds: data.ids });
        if (data.ids.length === 0) alert("Bu shartlarga mos savol topilmadi");
      } else {
        alert(data.error || 'Savollarni tanlashda xatolik');
      }
    } catch {
      alert('Savollarni tanlashda xatolik');
    }
    setPickingIdx(null);
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
                    <>
                      <input
                        type="url"
                        value={block.videoUrl}
                        onChange={(e) => updateBlock(idx, { videoUrl: e.target.value })}
                        placeholder="https://youtube.com/watch?v=..."
                        className="w-full px-2.5 py-1.5 rounded-lg border border-border text-xs"
                      />
                      <label className="flex items-center gap-1.5 text-xs text-text-secondary">
                        <input
                          type="checkbox"
                          checked={block.revealAfterQuiz}
                          onChange={(e) => updateBlock(idx, { revealAfterQuiz: e.target.checked })}
                          className="w-3.5 h-3.5"
                        />
                        Faqat tekshiruv topshirilgach ko&apos;rinsin
                      </label>
                    </>
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
                  {block.type === 'EMBED' && (
                    <>
                      <input
                        type="url"
                        value={block.embedUrl}
                        onChange={(e) => updateBlock(idx, { embedUrl: e.target.value })}
                        placeholder="https://www.geogebra.org/m/..."
                        className="w-full px-2.5 py-1.5 rounded-lg border border-border text-xs"
                      />
                      {block.embedUrl && !isAllowedEmbedUrl(block.embedUrl) && (
                        <p className="text-[11px] text-red-500">
                          Bu domen ruxsat etilmagan. Ruxsat etilganlar: {EMBED_ALLOWED_DOMAINS.join(', ')}
                        </p>
                      )}
                    </>
                  )}
                  {block.type === 'PRACTICE' && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <input
                          type="text"
                          value={block.practiceTopic || ''}
                          onChange={(e) => updateBlock(idx, { practiceTopic: e.target.value })}
                          placeholder="Mavzu (ixtiyoriy, masalan: mexanika)"
                          className="flex-1 min-w-[140px] px-2.5 py-1.5 rounded-lg border border-border text-xs"
                        />
                        <input
                          type="number"
                          min={1}
                          max={MAX_PRACTICE_ITEMS}
                          value={block.practiceCount ?? DEFAULT_PRACTICE_COUNT}
                          onChange={(e) => updateBlock(idx, { practiceCount: Number(e.target.value) })}
                          className="w-16 px-2 py-1.5 rounded-lg border border-border text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => pickPracticeItems(idx, block)}
                          disabled={pickingIdx === idx || !subjectId}
                          className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-border bg-gray-50 text-text-secondary hover:bg-gray-100 disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {pickingIdx === idx ? <Loader2 size={11} className="animate-spin" /> : <Dumbbell size={11} />}
                          Savollarni tanlash
                        </button>
                      </div>
                      <p className={`text-[11px] ${block.itemIds.length > 0 ? 'text-green-600' : 'text-text-secondary'}`}>
                        {block.itemIds.length > 0 ? `✓ ${block.itemIds.length} ta savol tanlandi` : 'Hali savol tanlanmagan'}
                      </p>
                    </div>
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
