'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import ItemBrowser, { type BrowseItem } from './ItemBrowser';
import SelectedItemsPanel from './SelectedItemsPanel';

const MAX_PRACTICE_ITEMS = 30; // curriculum/route.ts va lesson-blocks/[id]/practice/start dagi bilan bir xil chegara

interface Props {
  itemIds: string[];
  onChange: (itemIds: string[]) => void;
  subjectId: string;
}

/**
 * PRACTICE bloki savol havzasi tahrirlagichi — LessonBlocksEditor'dan
 * ajratilgan (S23 PR sharh). O'qituvchi `ItemBrowser` (S26 — mavzu daraxti
 * bo'yicha ko'rib tanlash, qarang uning izohi) orqali savol qidiradi,
 * natijalarni matni bilan ko'radi, O'ZI birma-bir qo'shadi. Tanlanganlar
 * `SelectedItemsPanel`da — tartibini @dnd-kit bilan o'zgartirish mumkin
 * (PRACTICE'da tartib ma'noli — talaba shu ketma-ketlikda ko'radi).
 *
 * `itemIds` — faqat id massivi (server shakli); ko'rsatish uchun matn
 * kerak bo'lgani sababli mahalliy `textCache` bilan hydratsiya qilinadi —
 * yangi qo'shilganlar `ItemBrowser`dan matn bilan keladi, avval saqlangan
 * (edit sahifasida yuklangan) itemIds uchun esa mount paytida
 * `/api/items/browse`dan `onlyItemIds` bilan so'raladi.
 */
export default function PracticeBlockEditor({ itemIds, onChange, subjectId }: Props) {
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
        // Jim — matn yuklanmasa ham id ro'yxatning o'zi saqlangan, faqat ko'rinish cheklanadi
      }
      setHydrating(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemIds, subjectId]);

  const addItem = (item: BrowseItem) => {
    if (itemIds.includes(item.id) || itemIds.length >= MAX_PRACTICE_ITEMS) return;
    setTextCache((prev) => ({ ...prev, [item.id]: item.text }));
    onChange([...itemIds, item.id]);
  };
  const removeItem = (id: string) => onChange(itemIds.filter((iid) => iid !== id));
  const reorder = (orderedIds: string[]) => onChange(orderedIds);

  const selectedRows = itemIds.map((id) => ({ id, text: textCache[id] || id }));

  return (
    <div className="space-y-2">
      {itemIds.length < MAX_PRACTICE_ITEMS ? (
        <ItemBrowser subjectId={subjectId} addedIds={itemIds} onAdd={addItem} />
      ) : (
        <p className="text-[11px] text-amber-600">Chegara ({MAX_PRACTICE_ITEMS} ta) to&apos;ldi — avval bittasini olib tashlang</p>
      )}

      <div>
        <p className="text-[11px] font-medium text-text-secondary mb-1 flex items-center gap-1.5">
          Tanlangan savollar ({itemIds.length}/{MAX_PRACTICE_ITEMS})
          {hydrating && <Loader2 size={10} className="animate-spin" />}
        </p>
        <SelectedItemsPanel
          items={selectedRows}
          onRemove={removeItem}
          onReorder={reorder}
          emptyLabel="Hali savol tanlanmagan"
        />
      </div>
    </div>
  );
}
