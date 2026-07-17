'use client';

import { useEffect, useState, useRef } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { formatTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface TestTimerProps {
  totalSeconds: number;
  onTimeUp: () => void;
}

export default function TestTimer({ totalSeconds, onTimeUp }: TestTimerProps) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const [showAlert, setShowAlert] = useState<string | null>(null);
  const alertedRef = useRef({ fiveMin: false, oneMin: false });

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

        // Alert at 5 minutes
        if (prev <= 301 && prev > 299 && !alertedRef.current.fiveMin) {
          alertedRef.current.fiveMin = true;
          setShowAlert('5 daqiqa qoldi!');
          setTimeout(() => setShowAlert(null), 3000);
        }
        // Alert at 1 minute
        if (prev <= 61 && prev > 59 && !alertedRef.current.oneMin) {
          alertedRef.current.oneMin = true;
          setShowAlert('1 daqiqa qoldi!');
          setTimeout(() => setShowAlert(null), 3000);
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [remaining, onTimeUp]);

  const isLow = remaining < 300; // Less than 5 minutes
  const isCritical = remaining < 60; // Less than 1 minute

  return (
    <>
      <div className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-sm font-semibold transition-colors',
        isCritical ? 'bg-red-100 text-red-700 animate-pulse' :
        isLow ? 'bg-yellow-100 text-yellow-700' :
        'bg-primary-50 text-primary-700'
      )}>
        {isCritical ? <AlertTriangle size={16} /> : <Clock size={16} />}
        <span>{formatTime(remaining)}</span>
      </div>
      {/* Time alert toast */}
      {showAlert && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-yellow-500 text-white px-5 py-2.5 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2 animate-bounce">
          <AlertTriangle size={16} />
          {showAlert}
        </div>
      )}
    </>
  );
}
