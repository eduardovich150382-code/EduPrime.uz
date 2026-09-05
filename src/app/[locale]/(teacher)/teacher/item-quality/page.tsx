'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Link } from '@/i18n/routing';
import { ArrowLeft, Gauge, Loader2, TrendingDown, Scale } from 'lucide-react';
import LatexRenderer from '@/components/ui/LatexRenderer';

interface ItemQualityRow {
  itemId: string;
  text: string;
  subjectName: string;
  type: string;
  pValue: number | null;
  discrimination: number | null;
  attempts: number;
  topDistractor: { answer: string; count: number } | null;
}

interface ItemQualityResponse {
  lowDiscrimination: ItemQualityRow[];
  extremeDifficulty: ItemQualityRow[];
}

/**
 * O'qituvchi uchun savol sifati nazorati (S27) — `ItemStat`ga (Attempt
 * yozuvlaridan `/api/cron/item-stats` orqali kechasi hisoblangan) tayanadi.
 * Haqiqiy Item muharriri hali yo'q (bank/Test tahrirlagichlaridan farqli) —
 * shu sababli qatorlar "tahrirlash"ga havola o'rniga ICHKI kengaytiriladi
 * (ItemBrowser'dagi bilan bir xil naqsh), savolning to'liq matnini ko'rish
 * uchun.
 */
export default function ItemQualityPage() {
  const [data, setData] = useState<ItemQualityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/teacher/item-quality')
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
        <Link href="/teacher" className="p-2 rounded-lg hover:bg-primary-50 transition-colors">
          <ArrowLeft size={20} className="text-text-secondary" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Gauge size={22} className="text-primary-600" /> Savol sifati
          </h1>
          <p className="text-sm text-text-secondary">
            Kamida 20 urinishi bo&apos;lgan savollar — har kecha avtomatik yangilanadi
          </p>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-primary-600" />
        </div>
      ) : (
        <div className="space-y-8">
          <ItemQualitySection
            icon={<Scale size={18} className="text-amber-600" />}
            title="Past diskriminatsiya"
            description="Kuchli va zaif talabani ajratmaydigan savollar — ehtimol chalkash yoki noto'g'ri javob kaliti."
            rows={data?.lowDiscrimination ?? []}
            emptyMessage="Hozircha past diskriminatsiyali savol yo'q."
            expandedId={expandedId}
            onToggle={setExpandedId}
            primaryMetric={(r) => (r.discrimination !== null ? `D: ${r.discrimination.toFixed(2)}` : '—')}
          />

          <ItemQualitySection
            icon={<TrendingDown size={18} className="text-rose-600" />}
            title="Juda oson / juda qiyin"
            description="pValue 0.95'dan yuqori (deyarli hamma to'g'ri topadi) yoki 0.15'dan past (deyarli hech kim topa olmaydi) savollar."
            rows={data?.extremeDifficulty ?? []}
            emptyMessage="Hozircha ekstremal qiyinlikdagi savol yo'q."
            expandedId={expandedId}
            onToggle={setExpandedId}
            primaryMetric={(r) => (r.pValue !== null ? `p: ${Math.round(r.pValue * 100)}%` : '—')}
          />
        </div>
      )}
    </div>
  );
}

function ItemQualitySection({
  icon,
  title,
  description,
  rows,
  emptyMessage,
  expandedId,
  onToggle,
  primaryMetric,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  rows: ItemQualityRow[];
  emptyMessage: string;
  expandedId: string | null;
  onToggle: (id: string | null) => void;
  primaryMetric: (row: ItemQualityRow) => string;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="font-semibold text-text-primary">{title}</h2>
        <span className="text-xs text-text-secondary">({rows.length} ta)</span>
      </div>
      <p className="text-xs text-text-secondary">{description}</p>

      {rows.length === 0 ? (
        <div className="card p-6 text-center text-sm text-text-secondary">{emptyMessage}</div>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => {
            const expanded = expandedId === `${title}-${row.itemId}`;
            return (
              <div key={row.itemId} className="card p-3">
                <button
                  type="button"
                  onClick={() => onToggle(expanded ? null : `${title}-${row.itemId}`)}
                  className="w-full text-left"
                >
                  <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 font-medium">
                      {row.subjectName}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-text-secondary">
                      {primaryMetric(row)}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-text-secondary">
                      {row.attempts} urinish
                    </span>
                    {row.topDistractor && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                        Eng ko&apos;p xato: {row.topDistractor.answer} ({row.topDistractor.count})
                      </span>
                    )}
                  </div>
                  <div className={`text-sm text-text-primary ${expanded ? '' : 'line-clamp-2'}`}>
                    <LatexRenderer content={row.text} />
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
