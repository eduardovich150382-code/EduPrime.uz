import { glossaryFor } from './translate-prompt';
import { shouldTranslate } from './translate';

/**
 * Ustoz chatga BIRINCHI tashlaydigan ko'rsatma.
 *
 * Mazmuni `translate-prompt.ts` dan keladi, lekin SODDALASHTIRILGAN: u yerdagi
 * qoidalar `gemini-flash` uchun yozilgan va har turkcha naqsh alohida satr
 * bo'lib qo'shilgan. Chatdagi model kuchliroq — unga kamroq qoida kerak, uzun
 * ko'rsatma esa ustoz nusxalaydigan matnni bejiz shishiradi.
 *
 * `translate-prompt.ts` dan farqi yana bitta: bu prompt bir vaqtning o'zida
 * STRUKTURA ham so'raydi (matn, variantlar, javob), chunki chat yo'lida S4
 * bosqichi umuman yo'q.
 */

/** Chatdan so'raladigan JSON — `lib/import/chat-apply.ts` shu shaklni o'qiydi. */
const SCHEMA = `[
  {
    "order": 12,
    "text": "savol matni",
    "options": ["birinchi variant", "ikkinchi variant", "uchinchi variant"],
    "answer": "C"
  }
]`;

function glossaryText(sourceLang: string): string {
  const entries = Object.entries(glossaryFor(sourceLang));
  if (entries.length === 0) return '';
  const lines = entries.map(([from, to]) => `- ${from} → ${to}`).join('\n');
  return `
ATAMALAR LUG'ATI — MAJBURIY
Quyidagi atamalar AYNAN shunday o'giriladi:
${lines}
`;
}

/**
 * Tarjima kerak bo'lganda qo'yiladigan qoidalar.
 *
 * `glossaryFor` AYNI lug'atdan o'qiydi (`glossary-uz.json`) — nusxa
 * ko'chirilmaydi: ikki nusxa vaqt o'tib bir-biridan uzoqlashardi va qaysi biri
 * to'g'riligini hech kim bilmasdi.
 */
function translateRules(sourceLang: string, targetLang: string): string {
  return `VAZIFA: savollarni ${sourceLang} tilidan ${targetLang} tiliga tarjima qil va
quyidagi JSON shaklida qaytar.

- Savolni YECHMA, mazmunini o'zgartirma, tushuntirish qo'shma.
- Variantlarning TARTIBINI o'zgartirma.
- Variant faqat SON yoki FORMULA bo'lsa — aynan ko'chir, tarjima qilma.
${glossaryText(sourceLang)}`;
}

/** Tillar teng bo'lgandagi vazifa — tarjima emas, tozalash. */
function cleanRules(): string {
  return `VAZIFA: savollarni TARJIMA QILMA. Matnni faqat tozala (PDF dan kelgan
ortiqcha bo'shliq, bo'linib ketgan so'z, chalkashgan "l"/"1", "O"/"0") va
quyidagi JSON shaklida qaytar.

- Savolni YECHMA, mazmunini o'zgartirma, tushuntirish qo'shma.
- Variantlarning TARTIBINI o'zgartirma.
`;
}

export interface ChatPromptMeta {
  sourceLang: string;
  targetLang: string;
  subject: string;
}

export function buildChatPrompt(meta: ChatPromptMeta): string {
  const task = shouldTranslate(meta.sourceLang, meta.targetLang)
    ? translateRules(meta.sourceLang, meta.targetLang)
    : cleanRules();

  return `Sen o'quv qo'llanmasidan olingan test savollari bilan ishlayapsan.
Fan: ${meta.subject}.

${task}
HECH QACHON O'ZGARMAYDIGAN NARSALAR
- [[IMG1]], [[IMG2]] kabi belgilar — rasm o'rni. Ularni o'zgartirma, tarjima
  qilma, yangisini yaratma, o'chirma. Har biri javobingda AYNAN BIR MARTA
  bo'lsin, o'z joyida.
- SONLAR. Hech bir sonni o'zgartirma, yaxlitlama, birlikka moslashtirma.
- $...$ ichidagi hamma narsa belgi-baboshi ko'chiriladi — ichidagi so'zni ham
  tarjima qilma. Matnda $ siz turgan matematik ifodani $...$ ichiga ol.

JAVOB SHAKLI
- Faqat JSON qaytar, boshqa hech narsa yozma.
- "order" — savol tepasidagi "### " dan keyingi son. AYNAN o'sha holda qaytar.
- "options" — variantlar matni, tartibi bo'yicha. Yorliq ("A)", "B)") YOZILMAYDI,
  u indeksdan qo'yiladi.
- "answer" — to'g'ri variantning harfi: birinchi variant "A", ikkinchisi "B" va
  hokazo.

${SCHEMA}

Savollar keyingi xabarda keladi.`;
}
