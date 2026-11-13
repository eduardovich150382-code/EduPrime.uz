// Soxta referallarni aniqlashga yordam (A5) — faqat ko'rsatish uchun,
// avtomatik qaror yo'q: qisqa vaqtda ko'p obuna tasodif ham bo'lishi mumkin
// (masalan, havola katta guruhga tashlangan). Qarorni admin qiladi.

export const BURST_WINDOW_MS = 60_000;
export const BURST_MIN = 3;

/** 1 daqiqa ichida ≥ 3 ta referal kelgan qatorlar id'lari (sirpanuvchi oyna). */
export function flagBursts(rows: { id: string; createdAt: Date }[]): Set<string> {
  const sorted = [...rows].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const flagged = new Set<string>();
  let end = 0;
  for (let start = 0; start < sorted.length; start++) {
    if (end < start) end = start;
    while (end + 1 < sorted.length && sorted[end + 1].createdAt.getTime() - sorted[start].createdAt.getTime() <= BURST_WINDOW_MS) end++;
    if (end - start + 1 >= BURST_MIN) for (let i = start; i <= end; i++) flagged.add(sorted[i].id);
  }
  return flagged;
}

export function noUsernameCount(rows: { username: string | null }[]): number {
  return rows.filter((r) => !r.username).length;
}
