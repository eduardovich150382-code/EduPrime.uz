/**
 * Bir xil nomdagi fan har `TestCategory`da (DTM, SCHOOL, ATTESTATION, ...)
 * ALOHIDA `Subject` qatoriga ega — u yerda kategoriya ma'noli (test/kurs
 * yaratishda qaysi imtihon turiga tegishli ekanini belgilaydi), lekin
 * FILTRLASH/KO'RIB CHIQISH ekranlarida (GET /api/subjects/groups,
 * `ItemBrowser` va sh.k.) bu ichki bo'linish ko'rinmasligi kerak: fan bir
 * marta ko'rinsin, tanlanganda esa shu nomdagi BARCHA qator birga so'ralsin.
 * Shu sababli guruhlash mantig'i shu bitta joyda — `GET /api/subjects/groups`
 * (server, DB'dan olib guruhlaydi va sanoq qo'shadi) buni ishlatadi, mijoz
 * tomoni esa (`useSubjectGroup.ts`) endi hech narsani o'zi guruhlamaydi,
 * faqat shu marshrutning natijasini iste'mol qiladi. Test/kurs yaratishdagi
 * fan tanlash (`/api/subjects` ro'yxati) bunga tegilmagan holicha qoladi —
 * u yerda o'qituvchi kategoriyani ATAYLAB tanlaydi.
 */

export interface SubjectRow {
  id: string;
  nameUz: string;
}

export interface SubjectGroup {
  name: string;
  ids: string[];
}

/** Guruhlash kaliti — katta-kichik harf va boshi/oxiridagi bo'shliqqa sezgir emas. */
export function subjectGroupKey(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * `subjects`ni fan NOMI bo'yicha guruhlaydi (turli kategoriyadagi bir xil
 * nomli qatorlar bitta guruhga birlashadi) va natijani nom bo'yicha alifbo
 * tartibida qaytaradi. DB'ga bormaydi — chaqiruvchi (server route) allaqachon
 * olib kelgan qatorlar ustida ishlaydi, shu sababli sinovdan haqiqiy so'rovsiz
 * o'tkazilishi mumkin.
 */
export function groupSubjectsByName(subjects: SubjectRow[]): SubjectGroup[] {
  const byKey = new Map<string, SubjectGroup>();
  for (const s of subjects) {
    const key = subjectGroupKey(s.nameUz);
    const existing = byKey.get(key);
    if (existing) existing.ids.push(s.id);
    else byKey.set(key, { name: s.nameUz, ids: [s.id] });
  }
  return Array.from(byKey.values()).sort((a, b) => a.name.localeCompare(b.name, 'uz'));
}
