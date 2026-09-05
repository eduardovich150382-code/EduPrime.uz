'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import ItemBrowser, { type BrowseItem } from './ItemBrowser';
import SelectedItemsPanel from './SelectedItemsPanel';
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
 * Bitta nazorat nuqtasining vaqt maydoni — SelectedItemsPanel qatoriga
 * `renderExtra` orqali kiritiladi (S26). Mahalliy xom matn holati bilan
 * ishlaydi (har harfda parse qilib onChange chaqirmaslik uchun), faqat
 * blur/Enter'da commit qiladi: yaroqsiz yoki boshqa nuqta bilan
 * to'qnashadigan qiymat qabul qilinmaydi (eski qiymatga qaytadi).
 */
function TimeCell({ atSeconds, otherSeconds, onUpdate }: { atSeconds: number; otherSeconds: number[]; onUpdate: (next: number) => void }) {
  const [raw, setRaw] = useState(formatSeconds(atSeconds));
  const [error, setError] = useState(false);

  useEffect(() => {
    setRaw(formatSeconds(atSeconds));
    setError(false);
  }, [atSeconds]);

  const commit = () => {
    const parsed = parseTimeInput(raw);
    if (parsed === null || parsed > MAX_REASONABLE_SECONDS || otherSeconds.includes(parsed)) {
      setError(true);
      setRaw(formatSeconds(atSeconds));
      return;
    }
    setError(false);
    if (parsed !== atSeconds) onUpdate(parsed);
  };

  return (
    <input
      type="text"
      value={raw}
      onChange={(e) => { setRaw(e.target.value); setError(false); }}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); } }}
      title={error ? "Yaroqsiz yoki band vaqt — avvalgi qiymatga qaytarildi" : undefined}
      className={`w-16 px-1.5 rounded border text-[11px] font-mono text-center flex-shrink-0 min-h-11 ${error ? 'border-red-400 text-red-600' : 'border-border'}`}
    />
  );
}

/**
 * Video nazorat nuqtalari tahrirlagichi (S23, S26'da yangilandi) —
 * CourseCurriculumEditor (VIDEO turi darsning asosiy videosi) VA
 * LessonBlocksEditor (VIDEO_SOLUTION bloki) IKKALASI HAM shu BITTA
 * komponentni ishlatadi. Oqim: o'qituvchi avval `ItemBrowser` orqali
 * savolni tanlaydi (vaqtni oldindan kiritish shart emas — avtomatik,
 * bo'sh vaqtga qo'yiladi), so'ng SHU vaqtni tanlangan ro'yxatdagi maydonda
 * (`TimeCell`) tahrirlaydi. Bitta savol bir nechta vaqtga qo'yilishi
 * mumkin (eski xatti-harakat saqlanadi — shu sababli `ItemBrowser`ga
 * `addedIds` bo'sh beriladi, "Qo'shildi" belgisi bu yerda ko'rinmaydi).
 *
 * Ro'yxat doim VAQT bo'yicha tartiblangan holda ko'rsatiladi — shu sababli
 * `SelectedItemsPanel`da sudrab-tashlash O'CHIRILGAN (`reorderable={false}`):
 * tartib vaqt qiymatidan kelib chiqadi, qo'lda surish natijani darhol
 * qayta saralab qo'yardi.
 */
export default function VideoCheckpointsEditor({ checkpoints, onChange, subjectId }: Props) {
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
        const res = await fetch('/api/items/browse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subjectIds: [subjectId], onlyItemIds: missing, pageSize: 50 }),
        });
        const data = await res.json();
        if (res.ok && Array.isArray(data.items)) {
          setTextCache((prev) => {
            const next = { ...prev };
            for (const it of data.items as BrowseItem[]) next[it.id] = it.text;
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

  // Yangi nuqta uchun band bo'lmagan vaqt: oxirgi nuqtadan 30 soniya keyin
  // (birinchisi bo'lsa 0'dan) — to'qnashsa birma-bir siljitiladi. O'qituvchi
  // buni keyin TimeCell orqali xohlagan qiymatga o'zgartiradi.
  const nextDefaultSeconds = () => {
    const used = new Set(checkpoints.map((c) => c.atSeconds));
    let t = sorted.length ? sorted[sorted.length - 1].atSeconds + 30 : 0;
    while (used.has(t)) t += 1;
    return t;
  };

  const addCheckpoint = (item: BrowseItem) => {
    if (checkpoints.length >= MAX_CHECKPOINTS) return;
    const atSeconds = nextDefaultSeconds();
    setTextCache((prev) => ({ ...prev, [item.id]: item.text }));
    onChange([...checkpoints, { atSeconds, itemId: item.id }]);
  };

  const removeCheckpoint = (rowId: string) => onChange(checkpoints.filter((c) => String(c.atSeconds) !== rowId));

  const updateCheckpointTime = (atSecondsOld: number, atSecondsNew: number) => {
    onChange(checkpoints.map((c) => (c.atSeconds === atSecondsOld ? { ...c, atSeconds: atSecondsNew } : c)));
  };

  const selectedRows = sorted.map((c) => ({ id: String(c.atSeconds), text: textCache[c.itemId] || c.itemId }));

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-medium text-text-secondary flex items-center gap-1.5">
        Video nazorat nuqtalari ({checkpoints.length}/{MAX_CHECKPOINTS})
        {hydrating && <Loader2 size={10} className="animate-spin" />}
      </p>

      <SelectedItemsPanel
        items={selectedRows}
        onRemove={removeCheckpoint}
        emptyLabel="Hali nazorat nuqtasi qo'yilmagan"
        reorderable={false}
        renderExtra={(row) => {
          const atSeconds = Number(row.id);
          const otherSeconds = checkpoints.filter((c) => c.atSeconds !== atSeconds).map((c) => c.atSeconds);
          return <TimeCell atSeconds={atSeconds} otherSeconds={otherSeconds} onUpdate={(next) => updateCheckpointTime(atSeconds, next)} />;
        }}
      />

      {checkpoints.length < MAX_CHECKPOINTS ? (
        <ItemBrowser subjectId={subjectId} addedIds={[]} onAdd={addCheckpoint} />
      ) : (
        <p className="text-[11px] text-amber-600">Chegara ({MAX_CHECKPOINTS} ta) to&apos;ldi — avval bittasini olib tashlang</p>
      )}
    </div>
  );
}
