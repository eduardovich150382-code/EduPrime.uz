/**
 * Qoralamada saqlangan `startTime`ni tekshiradi. `handleFinish` umumiy
 * `timeSpent`ni shundan hisoblaydi (`Date.now() - startTime`) — sahifa
 * yangilangach `startTime` state qaytadan boshlanmasa, umumiy vaqt faqat
 * oxirgi yuklashdan keyingi soniyalarni ko'rsatadi, natija sahifasidagi
 * "Jami" savol-boshiga vaqtlar yig'indisidan KICHIK chiqib qoladi (PR121
 * ko'rib chiqishida topilgan ziddiyat). Eski qoralamalarda (bu maydon
 * qo'shilishidan oldin yozilgan) `startTime` yo'q — bunday holatda
 * `fallback` (chaqiruvchi tomonidan sahifa ochilgan payt) qaytadi.
 */
export function resolveDraftStartTime(draftStartTime: unknown, fallback: number): number {
  return typeof draftStartTime === 'number' && Number.isFinite(draftStartTime) && draftStartTime > 0
    ? draftStartTime
    : fallback;
}
