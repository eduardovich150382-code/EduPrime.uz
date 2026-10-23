import type { AnimationEventHandler, CSSProperties, ReactNode } from 'react';

const orbitRows = [
  { radius: 114, count: 84, size: 3.8 },
  { radius: 122, count: 90, size: 4.6 },
  { radius: 130, count: 96, size: 3.8 },
];
const orbitColors = [
  'fill-violet-500', 'fill-indigo-500', 'fill-sky-500',
  'fill-cyan-500', 'fill-emerald-500', 'fill-amber-500',
  'fill-orange-500', 'fill-rose-500', 'fill-fuchsia-500',
];

// Natija sahifasidagi ball aylanasi — ResultScore va attestatsiya mock'idagi
// ball/toifa aylanalari uchun bitta komponent. Animatsiya globals.css dagi
// `result-progress` / `result-score-value` (reduced-motion qoidasi ham
// o'sha yerda); `animate={false}` — klasslar qo'yilmaydi, aylana darhol to'la.
export default function ResultRing({
  progress,
  label,
  className = 'w-full max-w-72 sm:max-w-80',
  trackClassName = 'stroke-primary-100',
  strokeClassName = 'stroke-primary-600',
  orbit = false,
  animate = true,
  delayMs = 0,
  onAnimationEnd,
  centerClassName = 'max-w-[75%] px-4',
  children,
}: {
  /** 0–1. */
  progress: number;
  label: string;
  className?: string;
  trackClassName?: string;
  strokeClassName?: string;
  /** Rangli nuqtalar halqasi va orqa fon nuri (asosiy natija aylanasi). */
  orbit?: boolean;
  animate?: boolean;
  delayMs?: number;
  /** To'ldirish animatsiyasi tugaganda. */
  onAnimationEnd?: AnimationEventHandler<SVGCircleElement>;
  centerClassName?: string;
  children: ReactNode;
}) {
  const circumference = 2 * Math.PI * 96;
  const value = Math.max(0, Math.min(1, progress));
  const delay = delayMs ? { animationDelay: `${delayMs}ms` } : undefined;
  return <div className={`relative flex aspect-square items-center justify-center ${className}`} aria-label={label}>
    {orbit && <div className="absolute inset-4 rounded-full bg-gradient-to-br from-sky-100/80 via-violet-100/70 to-rose-100/80 blur-2xl" aria-hidden="true" />}
    {/* Halqasiz aylanada bo'sh chet kesiladi: r 96 + yarim chiziq 6 ≈ 104. */}
    <svg viewBox={orbit ? '0 0 280 280' : '36 36 208 208'} className="absolute inset-0 h-full w-full" fill="none" aria-hidden="true">
      {orbit && <g className="result-orbit">
        <g transform="translate(140 140)">
          {orbitRows.map((row, rowIndex) => <g key={row.radius}>
            {Array.from({ length: row.count }, (_, index) => <rect
              key={index}
              x={row.radius - row.size / 2}
              y={-row.size / 2}
              width={row.size}
              height={row.size}
              rx="1"
              transform={`rotate(${index * 360 / row.count + rowIndex * 2})`}
              className={orbitColors[Math.floor(index / row.count * orbitColors.length + rowIndex / 3) % orbitColors.length]}
            />)}
          </g>)}
        </g>
      </g>}
      <circle cx="140" cy="140" r="96" className={trackClassName} strokeWidth="12" />
      <circle cx="140" cy="140" r="96" className={`${animate ? 'result-progress ' : ''}${strokeClassName}`} strokeWidth="12" strokeLinecap={value > 0 ? 'round' : 'butt'} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - value)} transform="rotate(-90 140 140)" style={{ '--result-circumference': circumference, ...delay } as CSSProperties} onAnimationEnd={onAnimationEnd} />
    </svg>
    <div className={`${animate ? 'result-score-value ' : ''}relative min-w-0 text-center ${centerClassName}`} style={delay}>{children}</div>
  </div>;
}
