'use client';

import { useEffect, useState } from 'react';

interface SubjectGroup {
  name: string;
  subjectIds: string[];
  itemCount: number;
}

interface GroupsResponse {
  groups: SubjectGroup[];
}

/**
 * `ItemBrowser`, `PracticeBlockEditor` va `VideoCheckpointsEditor` UCHTASI
 * ham bir xil muammoga duch keladi: bir xil nomdagi fan har `TestCategory`da
 * (DTM, SCHOOL, ...) ALOHIDA `Subject` qatoriga ega, savollarning aksariyati
 * esa faqat BITTASIGA bog'langan. `ItemBrowser` ko'rib tanlashda shu nomdagi
 * HAMMA qator bilan so'raydi — shu sababli `PracticeBlockEditor`/
 * `VideoCheckpointsEditor` ham AVVAL saqlangan item'larni (`onlyItemIds` bilan
 * `/api/items/browse`) hydratsiya qilishda xuddi shu kengaytirilgan guruhni
 * ishlatishi shart, aks holda boshqa kategoriya qatoriga bog'langan (lekin
 * `ItemBrowser` orqali qo'shilgan) item'ning matni topilmay qoladi.
 *
 * Guruhlash mantig'ining o'zi (fan nomi bo'yicha guruhlash + sanoq) endi
 * `GET /api/subjects/groups`da — yagona manba, boshqa filtr ro'yxatlari
 * (`/build`, kurslar katalogi) ham shu marshrutni ishlatadi. Bu hook shu
 * marshrutdan olingan guruhlar ichidan berilgan `subjectId` qaysi guruhga
 * tegishli ekanini topadi, xolos — o'zi hech narsani guruhlamaydi.
 */
export function useSubjectGroup(subjectId: string): { name: string; ids: string[] } {
  const [groups, setGroups] = useState<SubjectGroup[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/subjects/groups')
      .then((res) => res.json())
      .then((json: GroupsResponse) => { if (!cancelled) setGroups(json.groups ?? []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Guruh topilmasa (masalan shu nomdagi fanda umuman nashr etilgan savol
  // yo'q — shu holda /api/subjects/groups uni butunlay chiqarib tashlaydi)
  // xavfsiz holatda faqat berilgan `subjectId`ning o'zi qaytadi — natija
  // baribir bo'sh havza bo'ladi, xatti-harakat o'zgarmaydi.
  const group = groups.find((g) => g.subjectIds.includes(subjectId));
  return group ? { name: group.name, ids: group.subjectIds } : { name: '', ids: [subjectId] };
}
