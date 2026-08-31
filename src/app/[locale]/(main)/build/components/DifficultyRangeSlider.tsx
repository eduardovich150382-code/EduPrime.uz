'use client';

import { useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface DifficultyRangeSliderProps {
  min: number; // shkala boshi (1)
  max: number; // shkala oxiri (5)
  valueMin: number;
  valueMax: number;
  onChange: (valueMin: number, valueMax: number) => void;
}

const LABELS: Record<number, string> = { 1: 'Juda oson', 2: 'Oson', 3: "O'rta", 4: 'Qiyin', 5: 'Juda qiyin' };

// Ikki tomonlama qiyinlik slayderi (1-5). Tayyor kutubxona ishlatilmadi —
// oddiy <input type=range> ustma-ust qo'yilganda ikkala tutqichni bir xil
// aniqlikda boshqarib bo'lmaydi (vendor-prefiksli ::-webkit-slider-thumb
// hiylasiga tayanadi). Buning o'rniga trek ustida to'g'ridan-to'g'ri pointer
// hodisalari bilan ishlaydi — Pointer Events har ikkala sichqoncha va
// tegishni bir xilda qamrab oladi.
export default function DifficultyRangeSlider({ min, max, valueMin, valueMax, onChange }: DifficultyRangeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const steps = max - min;
  // Aktiv sudrash tugatilganda o'zini o'chiradigan tozalash funksiyasi — agar
  // komponent sudrash TUGAMASDAN unmount bo'lsa (masalan foydalanuvchi
  // barmog'ini ko'tarmasdan sahifadan chiqib ketsa), window'ga osilib
  // qolgan listenerlar shu orqali tozalanadi.
  const activeDragCleanupRef = useRef<(() => void) | null>(null);
  useEffect(() => () => activeDragCleanupRef.current?.(), []);

  const valueFromClientX = useCallback(
    (clientX: number) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0) return min;
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      return Math.round(min + ratio * steps);
    },
    [min, steps]
  );

  const startDrag = (thumb: 'min' | 'max') => (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);

    const move = (moveEvent: PointerEvent) => {
      const v = valueFromClientX(moveEvent.clientX);
      if (thumb === 'min') onChange(Math.min(v, valueMax), valueMax);
      else onChange(valueMin, Math.max(v, valueMin));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      activeDragCleanupRef.current = null;
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    activeDragCleanupRef.current = up;
  };

  const onKeyDown = (thumb: 'min' | 'max') => (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const delta = e.key === 'ArrowRight' ? 1 : -1;
    if (thumb === 'min') {
      onChange(Math.min(Math.max(min, valueMin + delta), valueMax), valueMax);
    } else {
      onChange(valueMin, Math.max(Math.min(max, valueMax + delta), valueMin));
    }
  };

  const pct = (v: number) => ((v - min) / steps) * 100;

  const Thumb = ({ thumb, value }: { thumb: 'min' | 'max'; value: number }) => (
    <button
      type="button"
      role="slider"
      aria-label={thumb === 'min' ? 'Minimal qiyinlik' : 'Maksimal qiyinlik'}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={LABELS[value]}
      onPointerDown={startDrag(thumb)}
      onKeyDown={onKeyDown(thumb)}
      style={{ left: `${pct(value)}%` }}
      className="absolute top-1/2 w-11 h-11 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center touch-none cursor-grab active:cursor-grabbing"
    >
      <span className="w-5 h-5 rounded-full bg-white border-2 border-primary-600 shadow-md" />
    </button>
  );

  return (
    <div className="pt-2 pb-1">
      <p className="text-sm text-text-secondary mb-3">
        Qiyinlik: <span className="font-medium text-primary-700">{LABELS[valueMin]}</span>
        {valueMax !== valueMin && (
          <>
            {' '}— <span className="font-medium text-primary-700">{LABELS[valueMax]}</span>
          </>
        )}
      </p>
      <div ref={trackRef} className="relative h-2 mx-5">
        <div className="absolute inset-0 rounded-full bg-gray-200" />
        <div
          className="absolute h-full rounded-full bg-primary-500"
          style={{ left: `${pct(valueMin)}%`, right: `${100 - pct(valueMax)}%` }}
        />
        <Thumb thumb="min" value={valueMin} />
        <Thumb thumb="max" value={valueMax} />
      </div>
      {/* Faqat raqamli belgilar — matnli darajalar (LABELS) yuqorida ko'rsatiladi, shu qatorda emas, aks holda 360px ekranda sig'maydi. */}
      <div className="flex justify-between mt-2 text-xs text-text-secondary px-1">
        {Array.from({ length: steps + 1 }, (_, i) => min + i).map((v) => (
          <span key={v} className={cn(v >= valueMin && v <= valueMax && 'text-primary-600 font-medium')}>
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}
