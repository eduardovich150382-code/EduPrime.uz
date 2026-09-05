'use client';

import type { ReactNode } from 'react';
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove, sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X } from 'lucide-react';

export interface SelectedItemRow {
  id: string;
  /** Ko'rsatiladigan matn — chaqiruvchi (PracticeBlockEditor/VideoCheckpointsEditor) o'zining textCache'idan tayyorlab beradi. */
  text: string;
}

interface RowProps {
  item: SelectedItemRow;
  index: number;
  reorderable: boolean;
  onRemove: (id: string) => void;
  renderExtra?: (item: SelectedItemRow, index: number) => ReactNode;
}

function SelectedRow({ item, index, reorderable, onRemove, renderExtra }: RowProps) {
  // `disabled: !reorderable` bo'lsa ham hook har doim chaqiriladi — shart
  // (reorderable) render davomida o'zgarmaydi, lekin baribir Hook Rules
  // buzilmasligi uchun useSortable HAR DOIM chaqiriladi, faqat vizual
  // tutqich (GripVertical) reorderable=false bo'lsa yashiriladi.
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !reorderable,
  });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-1.5 p-1.5 rounded-lg border border-border bg-gray-50/50">
      {reorderable && (
        <button type="button" {...attributes} {...listeners} className="min-h-11 min-w-11 flex items-center justify-center text-text-secondary hover:text-primary-600 cursor-grab active:cursor-grabbing touch-none flex-shrink-0">
          <GripVertical size={13} />
        </button>
      )}
      <span className="text-[10px] font-semibold text-text-secondary flex-shrink-0 w-4 text-center">{index + 1}</span>
      <p className="flex-1 min-w-0 text-xs text-text-primary line-clamp-1">{item.text}</p>
      {renderExtra?.(item, index)}
      <button type="button" onClick={() => onRemove(item.id)} className="rounded text-red-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0 min-h-11 min-w-11 flex items-center justify-center">
        <X size={13} />
      </button>
    </div>
  );
}

interface Props {
  items: SelectedItemRow[];
  onRemove: (id: string) => void;
  emptyLabel: string;
  /**
   * `false` — tartib boshqa mezon (masalan video checkpoint'larda vaqt)
   * bilan belgilanadi, sudrab-tashlash mantiqsiz (natija darhol qayta
   * saralanib, ko'rinishi eskiga qaytadi) — shu holatda tutqich
   * ko'rsatilmaydi va `onReorder` chaqirilmaydi. Standart `true` —
   * PRACTICE havzasi kabi tartibning o'zi ma'noli bo'lgan holatlar uchun.
   */
  reorderable?: boolean;
  onReorder?: (orderedIds: string[]) => void;
  renderExtra?: (item: SelectedItemRow, index: number) => ReactNode;
}

/**
 * Tanlangan savollar ro'yxati (S26) — PracticeBlockEditor va
 * VideoCheckpointsEditor IKKALASI HAM shu komponentni ishlatadi. Tartib
 * raqami, matn (qisqartirilgan), o'chirish tugmasi va (reorderable=true
 * bo'lsa) @dnd-kit orqali sudrab-tashlab tartiblash. `renderExtra` — har
 * qatorga qo'shimcha kontrol qo'shish uchun slot (video nazorat nuqtasi
 * uchun vaqt maydoni shu orqali kiritiladi).
 */
export default function SelectedItemsPanel({ items, onRemove, emptyLabel, reorderable = true, onReorder, renderExtra }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    if (!reorderable || !onReorder) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(items, oldIndex, newIndex).map((i) => i.id));
  };

  if (items.length === 0) {
    return <p className="text-[11px] text-text-secondary">{emptyLabel}</p>;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-1">
          {items.map((item, idx) => (
            <SelectedRow key={item.id} item={item} index={idx} reorderable={reorderable} onRemove={onRemove} renderExtra={renderExtra} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
