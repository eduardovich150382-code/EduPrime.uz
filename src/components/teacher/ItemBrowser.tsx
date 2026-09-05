'use client';

import { useEffect, useState } from 'react';
import { Search, ChevronLeft, ChevronRight, Check, Plus, Loader2, AlertCircle } from 'lucide-react';
import LatexRenderer from '@/components/ui/LatexRenderer';
import TopicTree, { type TopicTreeNode } from '@/app/[locale]/(main)/build/components/TopicTree';
import ChipGroup from '@/app/[locale]/(main)/build/components/ChipGroup';
import { useDebouncedPost } from '@/app/[locale]/(main)/build/lib/useDebouncedPost';
import { QUESTION_TYPES, DIFFICULTY_MIN, DIFFICULTY_MAX } from '@/app/[locale]/(main)/build/lib/buildState';
import { useSubjectGroup } from './useSubjectGroup';

export interface BrowseOptionPreview {
  label: string;
  text: string;
  correct: boolean;
}

export interface BrowseItem {
  id: string;
  text: string;
  type: string;
  difficulty: number | null;
  topicPath: string | null;
  optionsPreview: BrowseOptionPreview[];
}

interface TopicsResponse {
  tree: TopicTreeNode[];
}

interface BrowseResponse {
  items: BrowseItem[];
  total: number;
  page: number;
}

interface CountResponse {
  total: number;
}

const PAGE_SIZE = 10;
const TYPE_LABELS: Record<string, string> = Object.fromEntries(QUESTION_TYPES.map((t) => [t.value, t.label]));

interface Props {
  /** Kurs bitta fanga tegishli (LessonBlocksEditor'dagi bilan bir xil qoida)
   * — shu sababli bu yerda fan CHIP emas, chaqiruvchi tomonidan qat'iy
   * belgilanadi. DIQQAT: bu ANIQ Subject qatorining id'si, lekin bir xil
   * nomdagi fan har `TestCategory`da (DTM, SCHOOL, ...) ALOHIDA qatorga ega
   * — savollarning aksariyati odatda faqat BITTASIGA bog'langan. Shu sababli
   * komponent ichida bu id NOM bo'yicha kengaytiriladi (`resolveSubjectGroup`,
   * `lib/subject-groups.ts`) — chaqiruvchi hech narsa qilishi shart emas. */
  subjectId: string;
  /** Allaqachon tanlangan Item.id'lar — natijalarda YASHIRILMAYDI, faqat
   * "Qo'shildi" deb belgilanadi (S26 PR — avvalgi ItemSearchPicker ularni
   * butunlay yashirar edi, bu esa sahifalashda qatorlar sakrab qolishiga
   * sabab bo'lardi). */
  addedIds: string[];
  onAdd: (item: BrowseItem) => void;
}

/**
 * O'qituvchi uchun savol havzasini KO'RIB TANLASH (S26) — PRACTICE bloki,
 * video nazorat nuqtasi va kelajakdagi har qanday savol tanlash BITTA shu
 * komponentni ishlatadi. O'qituvchi savol matnini so'z bo'yicha eslamaydi,
 * lekin fan/mavzuni biladi — shuning uchun ASOSIY usul mavzu daraxti orqali
 * ko'rib chiqish, matn qidiruvi (`q`) esa ixtiyoriy, ikkinchi darajali
 * toraytirish. Natijalar `POST /api/items/browse`dan keladi (requireTeacher
 * — savol matni pullik mahsulot, `/api/items/search`dan farqli bu yerga
 * ochiq foydalanuvchi kira olmaydi).
 */
export default function ItemBrowser({ subjectId, addedIds, onAdd }: Props) {
  const [topicPaths, setTopicPaths] = useState<string[]>([]);
  const [difficultyMin, setDifficultyMin] = useState(DIFFICULTY_MIN);
  const [difficultyMax, setDifficultyMax] = useState(DIFFICULTY_MAX);
  const [types, setTypes] = useState<string[]>([]);
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Bir xil nomdagi fan har kategoriyada (DTM, SCHOOL, ...) ALOHIDA Subject
  // qatoriga ega, savollarning aksariyati esa faqat BITTASIGA bog'langan —
  // shu sababli `subjectId` o'rniga shu nomdagi HAMMA qator id'si bilan
  // so'raymiz (qarang useSubjectGroup.ts / lib/subject-groups.ts). Ro'yxat
  // hali yuklanmagan bo'lsa xavfsiz holatda faqat berilgan `subjectId`ning
  // o'zi ishlatiladi.
  const subjectGroup = useSubjectGroup(subjectId);

  // Filtr (mavzu/qiyinlik/tur/matn) o'zgarganda 1-sahifaga qaytamiz —
  // aks holda "3-sahifa"da turib filtr almashtirilsa, mavjud bo'lmagan
  // sahifa so'ralib bo'sh natija ko'rinishi mumkin edi.
  useEffect(() => {
    setPage(1);
  }, [subjectId, topicPaths, difficultyMin, difficultyMax, types, q]);

  // difficultyMin/Max — FAQAT standart to'liq oraliqdan (1-5) tor bo'lsa
  // yuboriladi, buildState.ts#buildStateToItemSpec bilan bir xil qoida.
  // Aks holda buildItemWhere `difficulty: {gte:1,lte:5}` shartini qo'shib
  // qo'yardi — bu esa `difficulty: null` bo'lgan (hali baholanmagan)
  // savollarni SQL NULL solishtiruv semantikasi bo'yicha natijadan
  // chetlab qo'yardi, garchi o'qituvchi hech qanday qiyinlik cheklovi
  // qo'ymagan bo'lsa ham.
  const itemSpec = {
    subjectIds: subjectGroup.ids,
    topicPaths,
    ...(difficultyMin !== DIFFICULTY_MIN ? { difficultyMin } : {}),
    ...(difficultyMax !== DIFFICULTY_MAX ? { difficultyMax } : {}),
    ...(types.length ? { types } : {}),
  };

  // `dedupeByPath: true` — FAQAT shu chaqiruvda kerak: bir xil nomdagi
  // Subject'larning har biri mavzu daraxtini alohida ekkan, shu sababli
  // bir nechta subjectId birga so'ralganda har tugun bir necha marta qaytadi
  // (qarang lib/topic-tree.ts#dedupeTopicsByPath). `/build` sahifasi bu
  // bayroqni yubormaydi — u yerda bir nechta subjectId chindan ham
  // bir-biridan farqli fanlar, takrorlanish yo'q.
  const { data: topicsData } = useDebouncedPost<TopicsResponse>(
    '/api/topics',
    { ...itemSpec, locale: 'uz', dedupeByPath: true },
    { skip: !subjectId }
  );
  const topicTree = topicsData?.tree ?? [];

  // Fan nomiga bog'liq HAMMA savollar soni (joriy mavzu/qiyinlik/tur
  // filtrlaridan MUSTAQIL) — o'qituvchiga fan bo'sh emasligini ko'rsatadi
  // ("Matematika · 1 752 savol"), kategoriya tuzog'i tufayli chalkash
  // "hech narsa topilmadi" holatiga tushib qolmasin uchun.
  const { data: subjectCount } = useDebouncedPost<CountResponse>(
    '/api/items/count',
    { subjectIds: subjectGroup.ids },
    { skip: !subjectId }
  );

  const { data: browseData, loading } = useDebouncedPost<BrowseResponse>(
    '/api/items/browse',
    { ...itemSpec, q, page, pageSize: PAGE_SIZE },
    { skip: !subjectId }
  );

  const items = browseData?.items ?? [];
  const total = browseData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const addedSet = new Set(addedIds);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {subjectGroup.name && (
        <p className="text-[11px] text-text-secondary">
          {subjectGroup.name} · {subjectCount ? `${subjectCount.total} ta savol` : '...'}
        </p>
      )}

      {topicTree.length > 0 && (
        <div>
          <p className="text-[11px] font-medium text-text-secondary mb-1">Mavzu</p>
          <TopicTree nodes={topicTree} selectedPaths={topicPaths} onChange={setTopicPaths} />
        </div>
      )}

      <div>
        <p className="text-[11px] font-medium text-text-secondary mb-1">Savol turi</p>
        <ChipGroup options={QUESTION_TYPES} selected={types} onChange={setTypes} />
      </div>

      <div className="flex items-center gap-2">
        <label className="text-[11px] text-text-secondary flex-shrink-0">Qiyinlik</label>
        <select
          value={difficultyMin}
          onChange={(e) => setDifficultyMin(Math.min(Number(e.target.value), difficultyMax))}
          className="min-h-11 px-2 rounded-lg border border-border text-xs"
        >
          {Array.from({ length: DIFFICULTY_MAX - DIFFICULTY_MIN + 1 }, (_, i) => DIFFICULTY_MIN + i).map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
        <span className="text-[11px] text-text-secondary">—</span>
        <select
          value={difficultyMax}
          onChange={(e) => setDifficultyMax(Math.max(Number(e.target.value), difficultyMin))}
          className="min-h-11 px-2 rounded-lg border border-border text-xs"
        >
          {Array.from({ length: DIFFICULTY_MAX - DIFFICULTY_MIN + 1 }, (_, i) => DIFFICULTY_MIN + i).map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      </div>

      {/* Matn qidiruvi — IKKINCHI darajali, ixtiyoriy toraytirish (asosiy usul mavzu daraxti). */}
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setQ(qInput.trim()); } }}
          placeholder="Savol matnidan qidirish (ixtiyoriy)..."
          className="flex-1 min-w-0 min-h-11 px-2.5 rounded-lg border border-border text-xs"
        />
        <button
          type="button"
          onClick={() => setQ(qInput.trim())}
          className="min-h-11 px-2.5 rounded-lg border border-border bg-gray-50 text-text-secondary hover:bg-gray-100 flex items-center gap-1.5 flex-shrink-0 text-xs font-medium"
        >
          <Search size={12} /> Qidirish
        </button>
      </div>

      <div className="border border-border rounded-lg divide-y divide-border max-h-96 overflow-y-auto">
        {loading && items.length === 0 ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={16} className="animate-spin text-primary-600" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex items-start gap-2 p-3 text-xs text-amber-700 bg-amber-50">
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
            <span>Bu filtrga mos savol yo&apos;q. Mavzuni kengaytiring.</span>
          </div>
        ) : (
          items.map((item) => {
            const expanded = expandedIds.has(item.id);
            const added = addedSet.has(item.id);
            return (
              <div key={item.id} className="p-2.5 bg-white">
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => toggleExpanded(item.id)}
                    className={`flex-1 min-w-0 text-left text-xs text-text-primary ${expanded ? '' : 'line-clamp-2'}`}
                  >
                    <LatexRenderer content={item.text} />
                  </button>
                  <button
                    type="button"
                    onClick={() => !added && onAdd(item)}
                    disabled={added}
                    className={`flex-shrink-0 flex items-center gap-1 px-2.5 rounded-lg text-[11px] font-medium min-h-11 ${
                      added
                        ? 'text-green-600 bg-green-50 cursor-default'
                        : 'text-primary-600 hover:bg-primary-50'
                    }`}
                  >
                    {added ? <Check size={12} /> : <Plus size={12} />}
                    {added ? "Qo'shildi" : "Qo'shish"}
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-text-secondary">
                    {TYPE_LABELS[item.type] || item.type}
                  </span>
                  {item.difficulty !== null && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-text-secondary">
                      Qiyinlik: {item.difficulty}
                    </span>
                  )}
                  {item.topicPath && (
                    <span className="text-[10px] text-text-secondary truncate">{item.topicPath}</span>
                  )}
                </div>
                {expanded && item.optionsPreview.length > 0 && (
                  <div className="mt-2 space-y-1 pl-2 border-l-2 border-border">
                    {item.optionsPreview.map((opt) => (
                      <div key={opt.label} className={`text-[11px] flex items-start gap-1.5 ${opt.correct ? 'text-green-700 font-medium' : 'text-text-secondary'}`}>
                        <span className="flex-shrink-0">{opt.correct ? '✓' : '—'} {opt.label}.</span>
                        <LatexRenderer content={opt.text} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-[11px] text-text-secondary">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="min-h-11 px-2.5 rounded-lg border border-border disabled:opacity-30 flex items-center gap-1"
          >
            <ChevronLeft size={12} /> Oldingi
          </button>
          <span>{page} / {totalPages} ({total} ta savol)</span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="min-h-11 px-2.5 rounded-lg border border-border disabled:opacity-30 flex items-center gap-1"
          >
            Keyingi <ChevronRight size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
