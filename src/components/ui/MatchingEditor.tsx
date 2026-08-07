'use client';

import { Plus, Trash2 } from 'lucide-react';

export interface MatchingPairInput {
  left: string;
  right: string;
}

interface MatchingEditorProps {
  pairs: MatchingPairInput[];
  onChange: (pairs: MatchingPairInput[]) => void;
}

/**
 * MATCHING savol muharriri — savol qurish/tahrirlash sahifalarida
 * (create/edit) va savollar bazasida qayta ishlatiladi. Chap va o'ng
 * ustun juftliklarini boshqaradi — left[i] doim right[i] bilan
 * juftlashadi (tartib muhim, chunki baholash shu tartibga asoslanadi).
 */
export default function MatchingEditor({ pairs, onChange }: MatchingEditorProps) {
  const updatePair = (i: number, field: 'left' | 'right', value: string) => {
    const next = [...pairs];
    next[i] = { ...next[i], [field]: value };
    onChange(next);
  };

  const addPair = () => onChange([...pairs, { left: '', right: '' }]);

  const removePair = (i: number) => {
    if (pairs.length <= 2) return;
    onChange(pairs.filter((_, idx) => idx !== i));
  };

  return (
    <div>
      <label className="text-sm font-medium text-text-primary block mb-3">Moslashtiriladigan juftliklar * (kamida 2 ta)</label>
      <div className="space-y-2">
        {pairs.map((pair, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-7 h-7 flex-shrink-0 rounded-full bg-primary-50 text-primary-600 text-xs font-bold flex items-center justify-center">
              {i + 1}
            </span>
            <input
              type="text"
              value={pair.left}
              onChange={(e) => updatePair(i, 'left', e.target.value)}
              placeholder="Chap ustun"
              className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-border text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all"
            />
            <span className="text-text-secondary flex-shrink-0">&harr;</span>
            <input
              type="text"
              value={pair.right}
              onChange={(e) => updatePair(i, 'right', e.target.value)}
              placeholder="O'ng ustun"
              className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-border text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all"
            />
            {pairs.length > 2 && (
              <button
                type="button"
                onClick={() => removePair(i)}
                className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addPair}
        className="mt-2 text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
      >
        <Plus size={12} /> Juftlik qo&apos;shish
      </button>
      <p className="text-xs text-text-secondary mt-2">
        O&apos;ng ustun talabaga aralashtirilgan holda ko&apos;rsatiladi — u har bir chap elementga mos o&apos;ng elementni tanlaydi.
      </p>
    </div>
  );
}
