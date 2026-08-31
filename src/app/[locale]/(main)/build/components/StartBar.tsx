'use client';

import { AlertCircle, Loader2, PlayCircle } from 'lucide-react';

interface StartBarProps {
  requested: number;
  poolTotal: number | null;
  loadingCount: boolean;
  starting: boolean;
  errorMsg: string | null;
  onExpandDifficulty: () => void;
  onStart: () => void;
}

// Sahifa pastida doimiy panel — jonli hisoblagich + "Testni boshlash".
// `poolTotal === null` — hali birinchi hisoblash javobi kelmagan (dastlabki
// yuklanish), shu holatda "..." ko'rsatiladi, tugma bloklanmaydi (standart
// filtr bilan boshlash mumkin bo'lishi kerak).
export default function StartBar({
  requested, poolTotal, loadingCount, starting, errorMsg, onExpandDifficulty, onStart,
}: StartBarProps) {
  const ready = poolTotal === null ? requested : Math.min(requested, poolTotal);
  const notEnough = poolTotal !== null && poolTotal < requested;

  return (
    // Mobilda (md dan pastda) BottomNav `fixed bottom-0 h-14 z-50` bilan
    // ekran tagiga yopishgan — shu panel bottom-0 da bo'lsa tugma undan
    // pastda, ko'rinmas holda qoladi. bottom-14 BottomNav balandligicha
    // yuqoriga suradi; md dan boshlab BottomNav yo'q (md:hidden), shuning
    // uchun panel haqiqiy pastki chetga qaytadi. z-40 — menyudan (z-50)
    // past, lekin sahifadagi qolgan hamma narsadan yuqori.
    <div className="sticky bottom-14 md:bottom-0 inset-x-0 z-40 -mx-4 px-4 sm:mx-0 sm:px-0 pt-3 md:pb-[env(safe-area-inset-bottom)]">
      <div className="card p-3 sm:p-4 bg-surface/95 backdrop-blur border-primary-100">
        {notEnough && (
          <div className="flex items-center justify-between gap-3 mb-3 p-2.5 rounded-xl bg-amber-50 border border-amber-100 text-xs sm:text-sm text-amber-800">
            <span className="flex items-center gap-2 min-w-0">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span className="truncate">Havzada faqat {poolTotal} ta savol bor</span>
            </span>
            <button
              type="button"
              onClick={onExpandDifficulty}
              className="flex-shrink-0 min-h-9 px-3 rounded-lg bg-amber-100 text-amber-900 font-medium hover:bg-amber-200 transition-colors"
            >
              Qiyinlikni kengaytirish
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="flex items-center gap-2 mb-3 p-2.5 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 text-sm text-text-secondary">
            <span className="font-semibold text-text-primary">{ready} / {requested}</span> savol tayyor
            <span className="hidden sm:inline">
              {' '}· havzada {loadingCount ? '...' : (poolTotal ?? '...')} ta mos savol
            </span>
            <div className="sm:hidden text-xs">havzada {loadingCount ? '...' : (poolTotal ?? '...')} ta mos savol</div>
          </div>
          <button
            type="button"
            onClick={onStart}
            disabled={starting}
            className="btn-primary !py-2.5 !px-5 flex-shrink-0 flex items-center gap-2 disabled:opacity-60 min-h-11"
          >
            {starting ? <Loader2 size={18} className="animate-spin" /> : <PlayCircle size={18} />}
            Testni boshlash
          </button>
        </div>
      </div>
    </div>
  );
}
