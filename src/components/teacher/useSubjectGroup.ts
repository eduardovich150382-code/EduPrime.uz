'use client';

import { useEffect, useState } from 'react';
import { resolveSubjectGroup, type SubjectRow } from '@/lib/subject-groups';

interface SubjectsResponse {
  subjects: SubjectRow[];
}

/**
 * `ItemBrowser`, `PracticeBlockEditor` va `VideoCheckpointsEditor` UCHTASI
 * ham bir xil muammoga duch keladi: bir xil nomdagi fan har `TestCategory`da
 * (DTM, SCHOOL, ...) ALOHIDA `Subject` qatoriga ega, savollarning aksariyati
 * esa faqat BITTASIGA bog'langan. `ItemBrowser` ko'rib tanlashda shu nomdagi
 * HAMMA qator bilan so'raydi (`resolveSubjectGroup`) — shu sababli
 * `PracticeBlockEditor`/`VideoCheckpointsEditor` ham AVVAL saqlangan
 * item'larni (`onlyItemIds` bilan `/api/items/browse`) hydratsiya qilishda
 * xuddi shu kengaytirilgan guruhni ishlatishi shart, aks holda boshqa
 * kategoriya qatoriga bog'langan (lekin `ItemBrowser` orqali qo'shilgan)
 * item'ning matni topilmay qoladi. Shu takrorlanishni oldini olish uchun
 * fan ro'yxatini yuklash va guruhlash shu bitta hook'ga chiqarilgan.
 */
export function useSubjectGroup(subjectId: string): { name: string; ids: string[] } {
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/subjects')
      .then((res) => res.json())
      .then((json: SubjectsResponse) => { if (!cancelled) setSubjects(json.subjects ?? []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return resolveSubjectGroup(subjects, subjectId);
}
