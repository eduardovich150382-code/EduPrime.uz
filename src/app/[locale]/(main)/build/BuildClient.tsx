'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import BackButton from '@/components/ui/BackButton';
import { Wand2 } from 'lucide-react';
import ChipGroup from './components/ChipGroup';
import PresetChips from './components/PresetChips';
import TopicTree, { type TopicTreeNode } from './components/TopicTree';
import DifficultyRangeSlider from './components/DifficultyRangeSlider';
import QuestionCountAndDuration from './components/QuestionCountAndDuration';
import MoreSettings from './components/MoreSettings';
import StartBar from './components/StartBar';
import { useDebouncedPost } from './lib/useDebouncedPost';
import {
  type BuildState,
  buildStateFromParams,
  buildStateToItemSpec,
  buildStateToParams,
  DIFFICULTY_MAX,
  DIFFICULTY_MIN,
  estimateDurationMin,
  EXAMS,
  GRADES,
  PRESETS,
} from './lib/buildState';

interface SubjectItem {
  id: string;
  nameUz: string;
  icon: string | null;
}

interface CountResponse {
  total: number;
  byDifficulty: Record<number, number>;
  distinctTemplates: number;
}

interface TopicsResponse {
  tree: TopicTreeNode[];
}

interface SessionResponse {
  session: { id: string };
  error?: string;
}

const GRADE_OPTIONS = GRADES.map((g) => ({ value: String(g), label: `${g}-sinf` }));

export default function BuildClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = useLocale();

  const [state, setState] = useState<BuildState>(() => buildStateFromParams(searchParams));
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);

  // "Kechagi xatolarim" preseti — spec'ning boshqa qismidan mustaqil, URL'da saqlanmaydi (kunga bog'liq, bugun ulashish ma'nosiz).
  const [onlyItemIds, setOnlyItemIds] = useState<string[] | undefined>(undefined);
  const [loadingYesterday, setLoadingYesterday] = useState(false);
  const [yesterdayMsg, setYesterdayMsg] = useState<string | null>(null);

  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  // Holat URL'da — sahifa yangilansa yoki havola ulashilsa saqlanadi.
  useEffect(() => {
    const params = buildStateToParams(state);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, pathname]);

  useEffect(() => {
    fetch('/api/subjects')
      .then((r) => r.json())
      .then((d) => setSubjects(d.subjects || []))
      .catch(() => {});
  }, []);

  // Filtrni o'zgartiruvchi har bir kontrol shu orqali yangilaydi — bir vaqtda
  // "Kechagi xatolarim" tanlovini bekor qiladi, chunki u aniq bir savollar
  // to'plamiga bog'langan, boshqa filtr o'zgarsa mazmuni yo'qoladi.
  const updateFilter = useCallback((patch: Partial<BuildState>) => {
    setOnlyItemIds(undefined);
    setYesterdayMsg(null);
    setState((s) => ({ ...s, ...patch }));
  }, []);

  const setQuestionCount = useCallback((count: number) => {
    setState((s) => ({
      ...s,
      questionCount: count,
      ...(s.durationManual ? {} : { durationMin: estimateDurationMin(count) }),
    }));
  }, []);

  const setDurationMin = useCallback((minutes: number) => {
    setState((s) => ({ ...s, durationMin: minutes, durationManual: true }));
  }, []);

  const applyPreset = useCallback((presetId: string) => {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setOnlyItemIds(undefined);
    setYesterdayMsg(null);
    setState((s) => ({ ...s, ...preset.apply() }));
  }, []);

  const applyYesterdayMistakes = useCallback(async () => {
    setLoadingYesterday(true);
    setYesterdayMsg(null);
    try {
      const res = await fetch('/api/items/yesterday-mistakes');
      const data = await res.json();
      const ids: string[] = Array.isArray(data.itemIds) ? data.itemIds : [];
      if (ids.length === 0) {
        setYesterdayMsg("Kecha xato javob bergan savollaringiz topilmadi");
      } else {
        setOnlyItemIds(ids);
        setState((s) => ({ ...s, questionCount: ids.length, durationMin: estimateDurationMin(ids.length), durationManual: true }));
      }
    } catch {
      setYesterdayMsg("Xatolik yuz berdi, qayta urinib ko'ring");
    } finally {
      setLoadingYesterday(false);
    }
  }, []);

  const itemSpec = useMemo(() => buildStateToItemSpec(state, onlyItemIds), [state, onlyItemIds]);
  const itemSpecKey = useMemo(() => JSON.stringify(itemSpec), [itemSpec]);
  // /api/topics `/[locale]` segmentidan tashqarida (middleware API yo'llarini
  // next-intl'dan chetlab o'tadi) — mavzu nomini joriy tilda qaytarishi uchun
  // locale'ni o'zi bilan birga yuboradi.
  const topicsBody = useMemo(() => ({ ...itemSpec, locale }), [itemSpec, locale]);

  const { data: countData, loading: loadingCount } = useDebouncedPost<CountResponse>('/api/items/count', itemSpec);
  const { data: topicsData } = useDebouncedPost<TopicsResponse>('/api/topics', topicsBody, {
    skip: state.subjectIds.length === 0,
  });
  const topicTree = state.subjectIds.length === 0 ? [] : topicsData?.tree ?? [];

  const handleStart = useCallback(async () => {
    setStarting(true);
    setStartError(null);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...itemSpec, limit: state.questionCount, durationMin: state.durationMin, mode: 'FIXED' }),
      });
      const data: SessionResponse = await res.json();
      if (!res.ok || !data.session) {
        setStartError(data.error || 'Xatolik yuz berdi');
        setStarting(false);
        return;
      }
      router.push(`/session/${data.session.id}`);
    } catch {
      setStartError('Server xatolik. Qayta urinib ko\'ring.');
      setStarting(false);
    }
    // itemSpecKey — itemSpec obyektining o'zi har renderda yangi referens, shuning uchun bog'liqlik uning JSON kaliti orqali kuzatiladi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemSpecKey, state.questionCount, state.durationMin, router]);

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-4">
      <BackButton />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Wand2 size={22} className="text-primary-600" /> Test tuzish
        </h1>
        <p className="text-text-secondary text-sm mt-1">O&apos;zingizga mos testni sozlang — hech narsa tanlamasang ham standart test tayyor bo&apos;ladi</p>
      </motion.div>

      <section className="card p-4 sm:p-5 space-y-3">
        <h2 className="text-sm font-semibold text-text-primary">Tez boshlash</h2>
        <PresetChips
          onApplyPreset={applyPreset}
          onApplyYesterdayMistakes={applyYesterdayMistakes}
          loadingYesterdayMistakes={loadingYesterday}
        />
        {yesterdayMsg && <p className="text-xs text-amber-700">{yesterdayMsg}</p>}
      </section>

      <section className="card p-4 sm:p-5 space-y-3">
        <h2 className="text-sm font-semibold text-text-primary">Maqsad</h2>
        <ChipGroup options={EXAMS} selected={state.exams} onChange={(v) => updateFilter({ exams: v })} />
      </section>

      <section className="card p-4 sm:p-5 space-y-4">
        <h2 className="text-sm font-semibold text-text-primary">Fan va sinf</h2>
        <div>
          <p className="text-xs text-text-secondary mb-2">Fan</p>
          <ChipGroup
            options={subjects.map((s) => ({ value: s.id, label: `${s.icon || ''} ${s.nameUz}`.trim() }))}
            selected={state.subjectIds}
            onChange={(v) => updateFilter({ subjectIds: v, topicPaths: [] })}
          />
        </div>
        <div>
          <p className="text-xs text-text-secondary mb-2">Sinf</p>
          <ChipGroup
            options={GRADE_OPTIONS}
            selected={state.grades.map(String)}
            onChange={(v) => updateFilter({ grades: v.map(Number) })}
          />
        </div>
      </section>

      <section className="card p-4 sm:p-5 space-y-3">
        <h2 className="text-sm font-semibold text-text-primary">Mavzular</h2>
        {state.subjectIds.length === 0 ? (
          <p className="text-sm text-text-secondary">Mavzularni ko&apos;rish uchun avval fan tanlang</p>
        ) : topicTree.length === 0 ? (
          <p className="text-sm text-text-secondary">Bu fan uchun mavzular daraxti hali kiritilmagan</p>
        ) : (
          <TopicTree nodes={topicTree} selectedPaths={state.topicPaths} onChange={(paths) => updateFilter({ topicPaths: paths })} />
        )}
      </section>

      <section className="card p-4 sm:p-5 space-y-3">
        <h2 className="text-sm font-semibold text-text-primary">Qiyinlik</h2>
        <DifficultyRangeSlider
          min={DIFFICULTY_MIN}
          max={DIFFICULTY_MAX}
          valueMin={state.difficultyMin}
          valueMax={state.difficultyMax}
          onChange={(vMin, vMax) => updateFilter({ difficultyMin: vMin, difficultyMax: vMax })}
        />
      </section>

      <section className="card p-4 sm:p-5">
        <QuestionCountAndDuration
          questionCount={state.questionCount}
          durationMin={state.durationMin}
          onQuestionCountChange={setQuestionCount}
          onDurationChange={setDurationMin}
        />
      </section>

      <section className="card p-4 sm:p-5">
        <MoreSettings
          bloomLevels={state.bloomLevels}
          onBloomLevelsChange={(v) => updateFilter({ bloomLevels: v })}
          types={state.types}
          onTypesChange={(v) => updateFilter({ types: v })}
          lang={state.lang}
          onLangChange={(v) => updateFilter({ lang: v })}
        />
      </section>

      <StartBar
        requested={state.questionCount}
        poolTotal={countData?.total ?? null}
        loadingCount={loadingCount}
        starting={starting}
        errorMsg={startError}
        onExpandDifficulty={() => updateFilter({ difficultyMin: DIFFICULTY_MIN, difficultyMax: DIFFICULTY_MAX })}
        onStart={handleStart}
      />
    </div>
  );
}
