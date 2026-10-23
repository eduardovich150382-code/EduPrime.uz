'use client';

import { useEffect, useRef } from 'react';

// docs/design/testlar-ui.md palitrasi: attestatsiya sarig'i, primary, banner
// binafshasi, "to'g'ri" yashili. Paket qo'shilmagan — oddiy canvas.
const COLORS = ['#fbbf24', '#7c3aed', '#2e1065', '#16a34a'];

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  spin: number;
  color: string;
}

/**
 * Bir martalik konfetti. `pointer-events: none` — sahifadagi tugmalarga
 * xalaqit bermaydi; tugagach `onDone` (ota komponent uni olib tashlaydi).
 * reduced-motion tekshiruvi chaqiruvchida: bu komponent umuman chizilmaydi.
 */
export function Confetti({ strong = false, onDone }: { strong?: boolean; onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) {
      onDoneRef.current();
      return;
    }
    const duration = strong ? 3500 : 2500;
    const count = strong ? 220 : 120;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    // Ikki pastki burchakdan markazga qarab otiladi — telefonda ham
    // aylanalar ustida yoyiladi.
    const pieces: Piece[] = Array.from({ length: count }, (_, i) => {
      const fromLeft = i % 2 === 0;
      const angle = (fromLeft ? -60 : -120) * (Math.PI / 180) + (Math.random() - 0.5) * 0.7;
      const speed = (strong ? 13 : 11) + Math.random() * 7;
      return {
        x: fromLeft ? 0 : width,
        y: height * 0.75,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 6 + Math.random() * 6,
        rotation: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.3,
        color: COLORS[i % COLORS.length],
      };
    });

    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      ctx.clearRect(0, 0, width, height);
      // Oxirgi chorakda so'nadi — keskin yo'qolmasin.
      ctx.globalAlpha = Math.max(0, Math.min(1, (duration - elapsed) / (duration * 0.25)));
      for (const p of pieces) {
        p.vx *= 0.985;
        p.vy = p.vy * 0.985 + 0.28;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.spin;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }
      if (elapsed < duration) frame = requestAnimationFrame(tick);
      else onDoneRef.current();
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, [strong]);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-60 h-full w-full" />;
}
