'use client';

import { useEffect, useRef, useState } from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import ItemSearchPicker, { type FoundItem } from './ItemSearchPicker';
import { MAX_CHECKPOINTS, type Checkpoint } from '@/lib/video-checkpoints';

// Video uzunligini tahrirlagichda bilmaymiz (YouTube API'ni bu yerda
// yuklamaymiz) — S23 spec: "faqat manfiy va juda katta qiymatni rad eting".
// 6 soat — har qanday real darsdan ancha katta, sog'lom fikr chegarasi.
const MAX_REASONABLE_SECONDS = 6 * 60 * 60;

interface Props {
  checkpoints: Checkpoint[];
  onChange: (checkpoints: Checkpoint[]) => void;
  subjectId: string;
}

function parseTimeInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);
  const match = trimmed.match(/^(\d+):([0-5]?\d)$/);
  if (!match) return null;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

function formatSeconds(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Video nazorat nuqtalari tahrirlagichi (S23) — CourseCurriculumEditor
 * (VIDEO turi darsning asosiy videosi) VA LessonBlocksEditor (VIDEO_SOLUTION
 * bloki) IKKALASI HAM shu BITTA komponentni ishlatadi (PR sharh — ikkita
 * alohida muharrir yozilmasin). Vaqt (mm:ss/soniya) kiritiladi, so'ng
 * `ItemSearchPicker` orqali shu vaqtga bog'lanadigan savol tanlanadi. Bir
 * xil vaqtga ikkinchi nuqta qo'yilmaydi, ro'yxat doim vaqt bo'yicha
 * tartiblangan holda ko'rsatiladi.
 */
export default function VideoCheckpointsEditor({ checkpoints, onChange, subjectId }: Props) {
  const [timeInput, setTimeInput] = useState('');
  const [timeError, setTimeError] = useState<string | null>(null);
  const [textCache, setTextCache] = useState<Record<string, string>>({});
  const [hydrating, setHydrating] = useState(false);
  const hydratedRef = useRef<Set<string>>(new Set());

  const sorted = [...checkpoints].sort((a, b) => a.atSeconds - b.atSeconds);

  // Avval saqlangan nuqtalar uchun (edit sahifasida yuklanganda) savol matni
  // hali mahalliy keshda yo'q — PracticeBlockEditor'dagi bilan bir xil
  // hydratsiya naqshi.
  useEffect(() => {
    const missing = Array.from(new Set(checkpoints.map((c) => c.itemId))).filter(
      (id) => !(id in textCache) && !hydratedRef.current.has(id)
    );
    if (missing.length === 0 || !subjectId) return;
    missing.forEach((id) => hydratedRef.current.add(id));
    setHydrating(true);
    (async () => {
      try {
        const res = await fetch('/api/teacher/items/search-preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subjectIds: [subjectId], onlyItemIds: missing }),
        });
        const data = await res.json();
        if (res.ok && Array.isArray(data.items)) {
          setTextCache((prev) => {
            const next = { ...prev };
            for (const it of data.items as FoundItem[]) next[it.id] = it.text;
            return next;
          });
        }
      } catch {
        // Jim — matn yuklanmasa ham nuqtaning o'zi saqlangan, faqat ko'rinish cheklanadi
      }
      setHydrating(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkpoints, subjectId]);

  const addCheckpoint = (item: FoundItem) => {
    const atSeconds = parseTimeInput(timeInput);
    if (atSeconds === null) {
      setTimeError("Avval vaqtni kiriting (mm:ss yoki soniya)");
      return;
    }
    if (atSeconds > MAX_REASONABLE_SECONDS) {
      setTimeError('Vaqt juda katta');
      return;
    }
    if (checkpoints.some((c) => c.atSeconds === atSeconds)) {
      setTimeError("Bu vaqtga allaqachon nuqta qo'yilgan");
      return;
    }
    if (checkpoints.length >= MAX_CHECKPOINTS) {
      setTimeError(`Ko'pi bilan ${MAX_CHECKPOINTS} ta nuqta bo'lishi mumkin`);
      return;
    }
    setTextCache((prev) => ({ ...prev, [item.id]: item.text }));
    onChange([...checkpoints, { atSeconds, itemId: item.id }]);
    setTimeInput('');
    setTimeError(null);
  };

  const removeCheckpoint = (atSeconds: number) => onChange(checkpoints.filter((c) => c.atSeconds !== atSeconds));

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-medium text-text-secondary flex items-center gap-1.5">
        Video nazorat nuqtalari ({checkpoints.length}/{MAX_CHECKPOINTS})
        {hydrating && <Loader2 size={10} className="animate-spin" />}
      </p>

      {sorted.length > 0 && (
        <div className="space-y-1">
          {sorted.map((cp) => (
            <div key={cp.atSeconds} className="flex items-center gap-1.5 p-1.5 rounded-lg border border-border bg-gray-50/50">
              <span className="text-[11px] font-mono font-semibold text-primary-600 flex-shrink-0 w-12">{formatSeconds(cp.atSeconds)}</span>
              <p className="flex-1 min-w-0 text-xs text-text-primary line-clamp-1">{textCache[cp.itemId] || cp.itemId}</p>
              <button type="button" onClick={() => removeCheckpoint(cp.atSeconds)} className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {checkpoints.length < MAX_CHECKPOINTS ? (
        <div className="space-y-1.5 p-2 rounded-lg border border-dashed border-border">
          <div className="flex items-center gap-1.5 flex-wrap">
            <input
              type="text"
              value={timeInput}
              onChange={(e) => { setTimeInput(e.target.value); setTimeError(null); }}
              placeholder="mm:ss yoki soniya (masalan 2:05)"
              className="w-44 px-2.5 py-1.5 rounded-lg border border-border text-xs"
            />
            {timeError && <p className="text-[11px] text-red-500">{timeError}</p>}
          </div>
          <ItemSearchPicker subjectId={subjectId} onAdd={addCheckpoint} addLabel="Nuqta qo'shish" />
        </div>
      ) : (
        <p className="text-[11px] text-amber-600">Chegara ({MAX_CHECKPOINTS} ta) to&apos;ldi — avval bittasini olib tashlang</p>
      )}
    </div>
  );
}
