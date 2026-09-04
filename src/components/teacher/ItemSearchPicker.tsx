'use client';

import { useState } from 'react';
import { Search, Loader2, Plus } from 'lucide-react';

export interface FoundItem {
  id: string;
  text: string;
  difficulty: number | null;
  type: string;
}

interface Props {
  subjectId: string;
  /** Ixtiyoriy — mavzu yo'li bilan havzani toraytiradi (masalan "mexanika/kinematika"). */
  topicPath?: string;
  /** Natijalarda ko'rsatilmasin (allaqachon tanlanganlar) — qayta qo'shishning oldini oladi. */
  excludeIds?: string[];
  onAdd: (item: FoundItem) => void;
  addLabel?: string;
}

/**
 * O'qituvchi uchun savol qidirish+tanlash — LessonBlocksEditor (PRACTICE
 * havzasi, ko'p tanlov) va VideoCheckpointsEditor (bitta nazorat nuqtasi
 * uchun bitta savol) IKKALASI HAM shu komponentni ishlatadi (S23 PR sharh —
 * ikkita alohida qidiruv UI yozilmasin). O'qituvchi QIDIRADI, natijalarni
 * (matni bilan) KO'RADI va O'ZI qo'shadi — avval "tanlash" tugmasi
 * bosilganda so'rov natijalari avtomatik itemIds sifatida saqlanardi, bu
 * yerda BOSHLANG'ICH HOLAT hech narsa tanlanmagan (S22b PR sharh).
 *
 * Natijalar `/api/teacher/items/search-preview`dan keladi — savol matni
 * bilan birga (`/api/items/search`dan farqli, u yerda matn yo'q, chunki
 * talaba/konstruktor tomonidan chaqiriladi va matn pullik mahsulot).
 */
export default function ItemSearchPicker({ subjectId, topicPath, excludeIds = [], onAdd, addLabel }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoundItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const search = async () => {
    if (!subjectId) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/teacher/items/search-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectIds: [subjectId],
          topicPaths: topicPath?.trim() ? [topicPath.trim()] : [],
          query: query.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.items)) {
        setResults(data.items);
        setSearched(true);
      } else {
        setErrorMsg(data.error || 'Qidirishda xatolik');
      }
    } catch {
      setErrorMsg('Qidirishda xatolik');
    }
    setLoading(false);
  };

  const visibleResults = results.filter((r) => !excludeIds.includes(r.id));

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); search(); } }}
          placeholder="Savol matnidan qidirish..."
          className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-border text-xs"
        />
        <button
          type="button"
          onClick={search}
          disabled={loading || !subjectId}
          className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-border bg-gray-50 text-text-secondary hover:bg-gray-100 disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0 min-h-[32px]"
        >
          {loading ? <Loader2 size={11} className="animate-spin" /> : <Search size={11} />}
          Qidirish
        </button>
      </div>

      {errorMsg && <p className="text-[11px] text-red-500">{errorMsg}</p>}
      {searched && !loading && visibleResults.length === 0 && (
        <p className="text-[11px] text-text-secondary">Mos savol topilmadi</p>
      )}

      {visibleResults.length > 0 && (
        <div className="max-h-56 overflow-y-auto space-y-1 border border-border rounded-lg p-1.5 bg-white">
          {visibleResults.map((item) => (
            <div key={item.id} className="flex items-start gap-2 p-1.5 rounded-lg hover:bg-gray-50">
              <p className="flex-1 min-w-0 text-xs text-text-primary line-clamp-2">{item.text}</p>
              <button
                type="button"
                onClick={() => onAdd(item)}
                className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1 flex-shrink-0 px-1.5 py-1 rounded hover:bg-primary-50 min-h-[28px]"
              >
                <Plus size={12} /> {addLabel || "Qo'shish"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
