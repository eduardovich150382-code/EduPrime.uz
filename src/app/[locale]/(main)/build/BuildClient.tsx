'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import BackButton from '@/components/ui/BackButton';
import QuotaUpsellDialog from '@/components/premium/QuotaUpsellDialog';
import { CheckCircle, Clock, Crown, Wand2 } from 'lucide-react';
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

// Bir xil nomdagi fan har kategoriyada (DTM, SCHOOL, ...) ALOHIDA Subject
// qatoriga ega — shu sababli tekis `/api/subjects` o'rniga guruhlangan
// `/api/subjects/groups`dan olinadi (yagona manba, qarang lib/subject-groups.ts).
// Har chip bitta NOMni ifodalaydi, tanlanganda esa shu nomdagi BARCHA
// subjectId birga `state.subjectIds`ga tushadi.
interface SubjectGroupItem {
  name: string;
  subjectIds: string[];
  itemCount: number;
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
  session?: { id: string };
  error?: string;
  /** 429 — kunlik konstruktor test kvotasi tugaganda (`lib/sessions.ts#CreateSessionError`). */
  code?: string;
  usedToday?: number;
  limit?: number;
}

const GRADE_OPTIONS = GRADES.map((g) => ({ value: String(g), label: `${g}-sinf` }));

/** `topicPaths`ga mos node'larning (allaqachon locale bo'yicha hal qilingan) nomlarini daraxtdan qidiradi — taklif oynasidagi konfiguratsiya xulosasi uchun. */
function findTopicNames(nodes: TopicTreeNode[], paths: string[]): string[] {
  if (paths.length === 0) return [];
  const names: string[] = [];
  const walk = (list: TopicTreeNode[]) => {
    for (const node of list) {
      if (paths.includes(node.path)) names.push(node.name);
      if (node.children.length) walk(node.children);
    }
  };
  walk(nodes);
  return names;
}

export default function BuildClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations('build');

  const [state, setState] = useState<BuildState>(() => buildStateFromParams(searchParams));
  const [subjectGroups, setSubjectGroups] = useState<SubjectGroupItem[]>([]);

  // "Kechagi xatolarim" preseti — spec'ning boshqa qismidan mustaqil, URL'da saqlanmaydi (kunga bog'liq, bugun ulashish ma'nosiz).
  const [onlyItemIds, setOnlyItemIds] = useState<string[] | undefined>(undefined);
  const [loadingYesterday, setLoadingYesterday] = useState(false);
  const [yesterdayMsg, setYesterdayMsg] = useState<string | null>(null);

  // "Zaif mavzularim" chipi — bilim xaritasidagi zaif mavzularni topicPaths
  // sifatida oladi (GET /api/items/weak-topics). DIQQAT: bu orqali tuzilgan
  // test ODATIY konstruktor testi — kunlik kvotaga KIRADI (mashq tugmasidan
  // farqli, qarang lib/mastery.ts#generatePracticeSession).
  const [loadingWeakTopics, setLoadingWeakTopics] = useState(false);
  const [weakTopicsMsg, setWeakTopicsMsg] = useState<string | null>(null);

  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  // S17/PR124 uslubi — kunlik konstruktor test kvotasi tugagani BIR MARTA
  // aniqlanadi va shu kun davomida qayta so'ralmaydi (server javobi
  // filtrlardan mustaqil, kvota kunlik hisoblagich). `showQuotaDialog`
  // oynani ochib-yopadi, `builtTestQuota` esa serverdan kelgan qiymatni
  // saqlab qoladi — keyingi "Testni boshlash" bosilganda so'rovsiz oyna
  // qayta ochiladi.
  const [builtTestQuota, setBuiltTestQuota] = useState<{ usedToday: number; limit: number } | null>(null);
  const [showQuotaDialog, setShowQuotaDialog] = useState(false);

  // Holat URL'da — sahifa yangilansa yoki havola ulashilsa saqlanadi.
  useEffect(() => {
    const params = buildStateToParams(state);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, pathname]);

  useEffect(() => {
    fetch('/api/subjects/groups')
      .then((r) => r.json())
      .then((d) => setSubjectGroups(d.groups || []))
      .catch(() => {});
  }, []);

  // Filtrni o'zgartiruvchi har bir kontrol shu orqali yangilaydi — bir vaqtda
  // "Kechagi xatolarim" tanlovini bekor qiladi, chunki u aniq bir savollar
  // to'plamiga bog'langan, boshqa filtr o'zgarsa mazmuni yo'qoladi.
  const updateFilter = useCallback((patch: Partial<BuildState>) => {
    setOnlyItemIds(undefined);
    setYesterdayMsg(null);
    setWeakTopicsMsg(null);
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
    setWeakTopicsMsg(null);
    setState((s) => ({ ...s, ...preset.apply() }));
  }, []);

  const applyYesterdayMistakes = useCallback(async () => {
    setLoadingYesterday(true);
    setYesterdayMsg(null);
    setWeakTopicsMsg(null);
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

  // DIQQAT: bu preset orqali tuzilgan test ODATIY konstruktor testi —
  // kunlik test tuzish kvotasiga KIRADI. Bilim xaritasi sahifasidagi mashq
  // tugmasi (lib/mastery.ts#generatePracticeSession) esa kvotasiz — ikkisini
  // aralashtirmaslik uchun bu yerda hech qanday kvota-chetlash bayrog'i yo'q.
  const applyWeakTopics = useCallback(async () => {
    setLoadingWeakTopics(true);
    setWeakTopicsMsg(null);
    setYesterdayMsg(null);
    try {
      const res = await fetch('/api/items/weak-topics');
      const data = await res.json();
      const paths: string[] = Array.isArray(data.topicPaths) ? data.topicPaths : [];
      const subjIds: string[] = Array.isArray(data.subjectIds) ? data.subjectIds : [];
      if (paths.length === 0) {
        setWeakTopicsMsg(t('weakTopicsEmpty'));
      } else {
        setOnlyItemIds(undefined);
        setState((s) => ({ ...s, subjectIds: subjIds.length ? subjIds : s.subjectIds, topicPaths: paths }));
      }
    } catch {
      setWeakTopicsMsg(t('weakTopicsError'));
    } finally {
      setLoadingWeakTopics(false);
    }
  }, [t]);

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

  // Taklif oynasidagi "nimadan mahrum bo'layapti" xulosasi — masalan
  // "Fizika · Mexanika · 10 ta savol · o'rtacha qiyinlik". Qiyinlik 5
  // darajaning o'rtacha nuqtasi bo'yicha 3 ta blokka (past/o'rtacha/yuqori)
  // yig'iladi — aniq son emas, tez o'qiladigan tavsif kerak.
  const difficultyLabel = useMemo(() => {
    const mid = (state.difficultyMin + state.difficultyMax) / 2;
    if (mid <= 2) return t('difficultyLow');
    if (mid >= 4) return t('difficultyHigh');
    return t('difficultyMedium');
  }, [state.difficultyMin, state.difficultyMax, t]);

  // Tanlangan har bir guruhning nomi bittadan ko'rinsin — guruh selektor
  // ostidagi "selectedGroupNames" bilan bir xil qoida (to'liq id to'plami
  // state.subjectIds ichida bo'lsa shu guruh tanlangan hisoblanadi).
  const selectedSubjectGroups = useMemo(
    () => subjectGroups.filter((g) => g.subjectIds.some((id) => state.subjectIds.includes(id))),
    [subjectGroups, state.subjectIds]
  );

  const configSummary = useMemo(() => {
    const parts: string[] = [];
    const subjectNames = selectedSubjectGroups.map((g) => g.name);
    if (subjectNames.length) parts.push(subjectNames.join(', '));
    const topicNames = findTopicNames(topicTree, state.topicPaths);
    if (topicNames.length) parts.push(topicNames.join(', '));
    parts.push(t('questionCount', { count: state.questionCount }));
    parts.push(difficultyLabel);
    return parts.join(' · ');
  }, [selectedSubjectGroups, state.topicPaths, state.questionCount, topicTree, difficultyLabel, t]);

  // Tariflar sahifasiga o'tishda joriy /build holatini saqlaydi — holat
  // allaqachon URL'da (yuqoridagi effekt orqali), shuning uchun shu yerda
  // faqat o'sha URL'ni returnUrl sifatida qayta ishlatamiz.
  const buildReturnUrl = useMemo(() => {
    const query = buildStateToParams(state).toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [state, pathname]);

  const handleStart = useCallback(async () => {
    // Kvota bugun allaqachon tugagani ma'lum — server bilan gaplashmasdan
    // oynani darhol ochamiz (kvota kunlik hisoblagich, filtr o'zgarishi
    // uni o'zgartirmaydi).
    if (builtTestQuota) {
      setShowQuotaDialog(true);
      return;
    }
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
        if (data.code === 'BUILT_TEST_QUOTA_EXCEEDED') {
          setBuiltTestQuota({ usedToday: data.usedToday ?? 0, limit: data.limit ?? 0 });
          setShowQuotaDialog(true);
          setStarting(false);
          return;
        }
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
  }, [itemSpecKey, state.questionCount, state.durationMin, router, builtTestQuota]);

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
          onApplyWeakTopics={applyWeakTopics}
          loadingWeakTopics={loadingWeakTopics}
        />
        {yesterdayMsg && <p className="text-xs text-amber-700">{yesterdayMsg}</p>}
        {weakTopicsMsg && <p className="text-xs text-amber-700">{weakTopicsMsg}</p>}
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
            options={subjectGroups.map((g) => ({ value: g.name, label: `${g.name} · ${g.itemCount}` }))}
            selected={selectedSubjectGroups.map((g) => g.name)}
            onChange={(names) => {
              const ids = subjectGroups
                .filter((g) => names.includes(g.name))
                .flatMap((g) => g.subjectIds);
              updateFilter({ subjectIds: ids, topicPaths: [] });
            }}
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

      {/* Eng yuqori niyat nuqtasi — foydalanuvchi aynan shu sekundda
          testni boshlamoqchi. Devor emas, taklif (QuotaUpsellDialog.tsx). */}
      <QuotaUpsellDialog
        open={showQuotaDialog && !!builtTestQuota}
        onClose={() => setShowQuotaDialog(false)}
        title={t('quotaExceededTitle')}
        body={t('quotaExceededBody', { config: configSummary })}
        items={
          builtTestQuota
            ? [
                {
                  icon: <CheckCircle size={14} className="text-green-600 flex-shrink-0" />,
                  text: t('quotaExceededUsedToday', { usedToday: builtTestQuota.usedToday }),
                },
                {
                  icon: <Crown size={14} className="text-purple-600 flex-shrink-0" />,
                  text: t('quotaExceededPrice'),
                },
              ]
            : []
        }
        primaryHref={`/pricing?returnUrl=${encodeURIComponent(buildReturnUrl)}`}
        primaryLabel={t('quotaExceededCta')}
        secondaryLabel={t('quotaExceededSecondary', { limit: builtTestQuota?.limit ?? 0 })}
      />
    </div>
  );
}
