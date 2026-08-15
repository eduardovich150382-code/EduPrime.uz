'use client';

import { Plus, Trash2 } from 'lucide-react';

interface Props {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  addLabel?: string;
  maxItems?: number;
}

/**
 * Oddiy matn bandlari ro'yxati muharriri (masalan kurs uchun "Nimani
 * o'rganasiz" belgili ro'yxati) — qo'shish/o'chirish, tartib muhim emas.
 * Generic — boshqa joyda ham (masalan kelajakda savol teglari kabi)
 * qayta ishlatilishi mumkin.
 */
export default function StringListEditor({
  value, onChange, placeholder = 'Band matni', addLabel = "Band qo'shish", maxItems = 12,
}: Props) {
  const updateItem = (idx: number, text: string) => {
    const updated = [...value];
    updated[idx] = text;
    onChange(updated);
  };
  const removeItem = (idx: number) => onChange(value.filter((_, i) => i !== idx));
  const addItem = () => {
    if (value.length >= maxItems) return;
    onChange([...value, '']);
  };

  return (
    <div className="space-y-2">
      {value.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <input
            type="text"
            value={item}
            onChange={(e) => updateItem(idx, e.target.value)}
            placeholder={placeholder}
            className="flex-1 px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-primary-500/20 text-sm"
          />
          <button type="button" onClick={() => removeItem(idx)} className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0">
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      {value.length < maxItems && (
        <button type="button" onClick={addItem} className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1">
          <Plus size={12} /> {addLabel}
        </button>
      )}
    </div>
  );
}
