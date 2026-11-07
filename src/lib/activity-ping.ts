// Klient heartbeat: sahifa ko'rinib turganda har 2 daqiqada `/api/me/ping`.
// Tab yashirilsa interval to'xtaydi (fonda yuk yo'q), qayta ko'rinsa darhol
// bitta ping va interval qaytadan boshlanadi — "hozir onlayn" yangi bo'ladi.

export const PING_INTERVAL_MS = 2 * 60_000;

export function sendPing(): void {
  // keepalive — sahifadan chiqib ketilayotganda ham so'rov uzilmasin.
  fetch('/api/me/ping', { method: 'POST', keepalive: true }).catch(() => {});
}

export function startActivityPing(doc: Document = document, ping: () => void = sendPing): () => void {
  let timer: ReturnType<typeof setInterval> | null = null;
  const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
  const start = () => {
    stop();
    ping();
    timer = setInterval(ping, PING_INTERVAL_MS);
  };
  const onVisibility = () => { if (doc.visibilityState === 'visible') start(); else stop(); };

  if (doc.visibilityState === 'visible') start();
  doc.addEventListener('visibilitychange', onVisibility);
  return () => { stop(); doc.removeEventListener('visibilitychange', onVisibility); };
}
