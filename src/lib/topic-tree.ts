/**
 * Konstruktor ekranidagi ("/build") mavzular daraxti uchun sof (DB'siz)
 * yordamchi funksiyalar — `POST /api/topics` shu funksiyalarni chaqiradi.
 * `item-picker.ts`dagi kabi: aggregatsiya JS tomonda, alohida so'rovsiz.
 */

export interface FlatTopicNode {
  id: string;
  parentId: string | null;
  path: string;
  level: number;
  nameUz: string;
  nameRu: string | null;
  nameEn: string | null;
  order: number;
}

export interface TopicTreeNode {
  id: string;
  path: string;
  level: number;
  /** Locale bo'yicha hal qilingan nom — `resolveTopicName`ga qarang. */
  name: string;
  order: number;
  count: number;
  children: TopicTreeNode[];
}

/**
 * `nameRu`/`nameEn` ixtiyoriy (ko'p TopicNode hali faqat o'zbekcha
 * kiritilgan) — bo'sh/`null` bo'lsa `nameUz`ga tushadi, hech qachon bo'sh
 * qator qaytarmaydi.
 */
export function resolveTopicName(
  node: { nameUz: string; nameRu: string | null; nameEn: string | null },
  locale: string
): string {
  if (locale === 'ru') return node.nameRu || node.nameUz;
  if (locale === 'en') return node.nameEn || node.nameUz;
  return node.nameUz;
}

/**
 * Tekis TopicNode ro'yxatini (`parentId` orqali) ichma-ich daraxtga
 * yig'adi, har tuguniga `counts`dan mos sonni va `locale` bo'yicha hal
 * qilingan nomni biriktiradi. `parentId`si ro'yxatda topilmagan tugun
 * (masalan boshqa fanning ildizi) ildiz daraja sifatida qaraladi. Bir xil
 * darajadagi tugunlar `order` bo'yicha saralanadi.
 */
export function buildTopicTree(nodes: FlatTopicNode[], counts: Record<string, number>, locale: string): TopicTreeNode[] {
  const byId = new Map<string, TopicTreeNode>();
  for (const n of nodes) {
    byId.set(n.id, {
      id: n.id,
      path: n.path,
      level: n.level,
      order: n.order,
      name: resolveTopicName(n, locale),
      count: counts[n.id] ?? 0,
      children: [],
    });
  }

  const roots: TopicTreeNode[] = [];
  for (const n of nodes) {
    const node = byId.get(n.id)!;
    const parent = n.parentId ? byId.get(n.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  const sortByOrder = (list: TopicTreeNode[]) => {
    list.sort((a, b) => a.order - b.order);
    for (const child of list) sortByOrder(child.children);
  };
  sortByOrder(roots);

  return roots;
}

/**
 * Bir xil nomdagi fan turli `TestCategory`larda ALOHIDA `Subject` qatoriga
 * ega (masalan "Matematika" DTM va SCHOOL kategoriyalarida ikki xil
 * `subjectId`) — mavzu daraxti har ikkalasiga ham bir xil `path`lar bilan
 * ekilgan bo'lishi mumkin. O'qituvchi ItemBrowser'da shu nomdagi HAMMA
 * `subjectId`ni birga ko'rib tanlaganda (qarang `resolveSubjectGroup`,
 * `lib/subject-groups.ts`), `/api/topics`dan kelgan tekis ro'yxatda har bir
 * `path` bir necha marta (har subject uchun bittadan) qaytadi — shu funksiya
 * ularni BITTA vakillikka yig'adi, `parentId`ni ham vakil tugunlar orasidagi
 * `path`ga qarab qayta hisoblaydi (asl `parentId` faqat o'z subjectI'chidagi
 * shoxga ishora qiladi, guruhlangan holatda ma'nosiz). Bir xil `path`ga ega
 * tugunlardan BIRINCHISI (kirish tartibida) vakil sifatida saqlanadi —
 * ular nom/daraja/tartib jihatidan bir xil bo'lishi kutiladi, chunki daraxt
 * bir xil manbadan ko'chirilgan.
 */
export function dedupeTopicsByPath(nodes: FlatTopicNode[]): FlatTopicNode[] {
  const byPath = new Map<string, FlatTopicNode>();
  for (const n of nodes) {
    if (!byPath.has(n.path)) byPath.set(n.path, n);
  }

  return Array.from(byPath.values()).map((n) => {
    const slashIdx = n.path.lastIndexOf('/');
    if (slashIdx === -1) return { ...n, parentId: null };
    const parentPath = n.path.slice(0, slashIdx);
    const parent = byPath.get(parentPath);
    return { ...n, parentId: parent ? parent.id : null };
  });
}

export interface TopicCandidate {
  id: string;
  topicPaths: string[];
}

/**
 * Har bir topic uchun, `candidates` ichidan shu mavzuga (yoki uning
 * istalgan bola/nabira mavzusiga) tegishli itemlar sonini hisoblaydi.
 * Moslik qoidasi `item-picker.ts#buildItemWhere`dagi topicPaths filtri
 * bilan AYNAN bir xil (oddiy prefiks — `startsWith`, chegara belgisisiz),
 * shu sababli daraxtdagi son va haqiqiy qidiruv natijasi hech qachon
 * bir-biriga zid bo'lmaydi.
 */
export function countItemsPerTopic(
  candidates: TopicCandidate[],
  topics: { id: string; path: string }[]
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const topic of topics) {
    let n = 0;
    for (const c of candidates) {
      if (c.topicPaths.some((p) => p.startsWith(topic.path))) n++;
    }
    counts[topic.id] = n;
  }
  return counts;
}
