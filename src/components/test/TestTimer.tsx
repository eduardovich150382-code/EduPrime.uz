'use client';

import { useEffect, useState } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { formatTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface TestTimerProps {
  totalSeconds: number;
  onTimeUp: () => void;
}

export default function TestTimer({ totalSeconds, onTimeUp }: TestTimerProps) {
  const [remaining, setRemaining] = useState(totalSeconds);

  useEffect(() => {
    if (remaining <= 0) {
      onTimeUp();
      return;
    }

    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [remaining, onTimeUp]);

  const percentage = (remaining / totalSeconds) * 100;
  const isLow = remaining < 300; // Less than 5 minutes
  const isCritical = remaining < 60; // Less than 1 minute

  return (
    <div className={cn(
      'flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-sm font-semibold transition-colors',
      isCritical ? 'bg-red-100 text-red-700 animate-pulse' :
      isLow ? 'bg-yellow-100 text-yellow-700' :
      'bg-primary-50 text-primary-700'
    )}>
      {isCritical ? <AlertTriangle size={16} /> : <Clock size={16} />}
      <span>{formatTime(remaining)}</span>
    </div>
  );
}
