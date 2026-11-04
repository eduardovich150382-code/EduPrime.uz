'use client';

import { useEffect, useState } from 'react';
import { useNow } from 'next-intl';

/**
 * Brauzerning haqiqiy hozirgi vaqti. next-intl 3 ning server
 * `NextIntlClientProvider` i render paytidagi `now` ni klientga uzatadi —
 * statik (ISR, 1 soat) sahifada `useNow()` o'sha render vaqtida muzlab
 * qoladi: muddati o'tgan variant ko'rinib turadi, "N kun" yarim tundan
 * keyin bir kun xato, aksiya hisoblagichi birinchi daqiqada noto'g'ri.
 *
 * Birinchi render `useNow()` bilan (server HTML bilan bir xil — hydration
 * mos), mount'dan keyin darhol `new Date()`. `updateInterval` berilsa
 * shu oraliqda yangilanadi (`useNow({ updateInterval })` o'rniga — u
 * birinchi oraliq tugaguncha muzlagan qiymatni qaytaradi).
 */
export function useLiveNow(updateInterval?: number): Date {
  const initial = useNow();
  const [now, setNow] = useState(initial);
  useEffect(() => {
    setNow(new Date());
    if (!updateInterval) return;
    const id = setInterval(() => setNow(new Date()), updateInterval);
    return () => clearInterval(id);
  }, [updateInterval]);
  return now;
}
