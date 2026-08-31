'use client';

import { cn } from '@/lib/utils';

interface ChipOption {
  value: string;
  label: string;
}

interface ChipGroupProps {
  options: ChipOption[];
  selected: string[];
  onChange: (next: string[]) => void;
}

// Ko'p tanlovli chip qatori — Fan, Sinf, Maqsad, Bloom, Format, Til
// bo'limlarida bir xil ko'rinish/xatti-harakat uchun qayta ishlatiladi.
// Tegish maydoni >= 44px (mobil-birinchi talab).
export default function ChipGroup({ options, selected, onChange }: ChipGroupProps) {
  const toggle = (value: string) => {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            aria-pressed={active}
            className={cn(
              'min-h-11 px-4 rounded-full text-sm font-medium border transition-colors',
              active
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-gray-50 text-text-secondary border-border hover:border-primary-300 hover:text-primary-600'
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
