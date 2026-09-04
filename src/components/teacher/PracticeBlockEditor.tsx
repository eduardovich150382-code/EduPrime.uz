'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronUp, ChevronDown, X, Loader2 } from 'lucide-react';
import ItemSearchPicker, { type FoundItem } from './ItemSearchPicker';

const MAX_PRACTICE_ITEMS = 30; // curriculum/route.ts va lesson-blocks/[id]/practice/start dagi bilan bir xil chegara

interface Props {
  itemIds: string[];
  onChange: (itemIds: string[]) => void;
  subjectId: string;
  topicPath: string;
  onTopicPathChange: (v: string) => void;
}

/**
 * PRACTICE bloki savol havzasi tahrirlagichi — LessonBlocksEditor'dan
 * ajratilgan (S23 PR sharh). Avval "Savollarni tanlash" tugmasi
 * bosilganda qidiruv natijalari AVTOMATIK itemIds sifatida saqlanardi
 * (o'qituvchi ko'rmasdan/tanlamasdan). Endi: o'qituvchi qidiradi
 * (`ItemSearchPicker`), natijalarni matni bilan ko'radi, O'ZI birma-bir
 * qo'shadi. Tanlanganlar alohida ro'yxatda — har birini olib tashlash va
 * tartibini o'zgartirish mumkin (BOSHLANG'ICH HOLAT — bo'sh).
 *
 * `itemIds` — faqat id massivi (server shakli); ko'rsatish uchun matn
 * kerak bo'lgani sababli mahalliy `textCache` bilan hydratsiya qilinadi —
 * yangi qo'shilganlar `ItemSearchPicker`dan matn bilan keladi, avval
 * saqlangan (edit sahifasida yuklangan) itemIds uchun esa mount paytida
 * `/api/teacher/items/search-preview`dan `onlyItemIds` bilan so'raladi.
 */
export default function PracticeBlockEditor({ itemIds, onChange, subjectId, topicPath, onTopicPathChange }: Props) {
  const [textCache, setTextCache] = useState<Record<string, string>>({});
  const [hydrating, setHydrating] = useState(false);
  const hydratedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const missing = itemIds.filter((id) => !(id in textCache) && !hydratedRef.current.has(id));
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
        // Jim — matn yuklanmasa ham id ro'yxatning o'zi saqlangan, faqat ko'rinish cheklanadi
      }
      setHydrating(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemIds, subjectId]);

  const addItem = (item: FoundItem) => {
    if (itemIds.includes(item.id) || itemIds.length >= MAX_PRACTICE_ITEMS) return;
    setTextCache((prev) => ({ ...prev, [item.id]: item.text }));
    onChange([...itemIds, item.id]);
  };
  const removeItem = (id: string) => onChange(itemIds.filter((iid) => iid !== id));
  const moveItem = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= itemIds.length) return;
    const updated = [...itemIds];
    [updated[idx], updated[j]] = [updated[j], updated[idx]];
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={topicPath}
        onChange={(e) => onTopicPathChange(e.target.value)}
        placeholder="Mavzu bilan toraytirish (ixtiyoriy, masalan: mexanika)"
        className="w-full px-2.5 py-1.5 rounded-lg border border-border text-xs"
      />

      {itemIds.length < MAX_PRACTICE_ITEMS ? (
        <ItemSearchPicker subjectId={subjectId} topicPath={topicPath} excludeIds={itemIds} onAdd={addItem} />
      ) : (
        <p className="text-[11px] text-amber-600">Chegara ({MAX_PRACTICE_ITEMS} ta) to&apos;ldi — avval bittasini olib tashlang</p>
      )}

      <div>
        <p className="text-[11px] font-medium text-text-secondary mb-1 flex items-center gap-1.5">
          Tanlangan savollar ({itemIds.length}/{MAX_PRACTICE_ITEMS})
          {hydrating && <Loader2 size={10} className="animate-spin" />}
        </p>
        {itemIds.length === 0 ? (
          <p className="text-[11px] text-text-secondary">Hali savol tanlanmagan</p>
        ) : (
          <div className="space-y-1">
            {itemIds.map((id, idx) => (
              <div key={id} className="flex items-center gap-1.5 p-1.5 rounded-lg border border-border bg-gray-50/50">
                <div className="flex flex-col flex-shrink-0">
                  <button type="button" onClick={() => moveItem(idx, -1)} disabled={idx === 0} className="p-0.5 text-text-secondary hover:text-primary-600 disabled:opacity-20">
                    <ChevronUp size={10} />
                  </button>
                  <button type="button" onClick={() => moveItem(idx, 1)} disabled={idx === itemIds.length - 1} className="p-0.5 text-text-secondary hover:text-primary-600 disabled:opacity-20">
                    <ChevronDown size={10} />
                  </button>
                </div>
                <p className="flex-1 min-w-0 text-xs text-text-primary line-clamp-1">{textCache[id] || id}</p>
                <button type="button" onClick={() => removeItem(id)} className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
