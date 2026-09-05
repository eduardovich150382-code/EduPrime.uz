/**
 * Bir xil nomdagi fan har `TestCategory`da (DTM, SCHOOL, ATTESTATION, ...)
 * ALOHIDA `Subject` qatoriga ega — u yerda kategoriya ma'noli (test/kurs
 * yaratishda qaysi imtihon turiga tegishli ekanini belgilaydi), lekin
 * `ItemBrowser`da (o'qituvchi savol havzasini ko'rib tanlashi, S26) bu
 * ichki bo'linish ko'rinmasligi kerak: savollarning aksariyati faqat BITTA
 * kategoriya ostidagi Subject qatoriga bog'langan (masalan hammasi DTM),
 * boshqa kategoriyalar ostidagi bir xil nomli qator esa bo'sh qoladi.
 * O'qituvchiga taqdim etilgan (yoki kursga biriktirilgan) `subjectId`
 * qaysi qatorga tushishi tasodifiy bo'lgani uchun, ItemBrowser fan NOMI
 * bo'yicha BARCHA qator id'larini birlashtirib so'raydi — shu funksiya shu
 * guruhni topadi. Faqat ItemBrowser ishlatadi; test/kurs yaratishdagi fan
 * tanlash (`/api/subjects` ro'yxati) bunga tegilmagan holicha qoladi.
 */

export interface SubjectRow {
  id: string;
  nameUz: string;
}

/** Guruhlash kaliti — katta-kichik harf va boshi/oxiridagi bo'shliqqa sezgir emas. */
export function subjectGroupKey(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * `subjectId` qaysi fan NOMIGA tegishli ekanini topib, shu nomdagi barcha
 * (turli kategoriyalardagi) `Subject.id`larni qaytaradi. `subjects` ro'yxatida
 * `subjectId` topilmasa (masalan hali yuklanmagan) — xavfsiz holatda faqat
 * berilgan id o'zi qaytadi, guruh nomi bo'sh qatorga tushadi.
 */
export function resolveSubjectGroup(subjects: SubjectRow[], subjectId: string): { name: string; ids: string[] } {
  const current = subjects.find((s) => s.id === subjectId);
  if (!current) return { name: '', ids: [subjectId] };

  const key = subjectGroupKey(current.nameUz);
  const ids = subjects.filter((s) => subjectGroupKey(s.nameUz) === key).map((s) => s.id);
  return { name: current.nameUz, ids };
}
