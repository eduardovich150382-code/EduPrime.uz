import glossary from './glossary-uz.json';
import { langKey, type TranslateGroup } from './translate';

/**
 * Tarjima promptini quradi.
 *
 * `translate.ts` dan ALOHIDA fayl: u allaqachon sxema, tekshiruv va
 * paketlashni olib boradi, prompt esa eng ko'p o'zgaradigan qism — turkcha
 * to'plamdagi har yangi naqsh shu yerga qoida bo'lib qo'shiladi.
 *
 * Bu fayl ham SOF: tarmoq ham, baza ham yo'q, shuning uchun chiqqan matnni
 * test to'g'ridan-to'g'ri tekshira oladi.
 */

type Glossary = Record<string, Record<string, string>>;

/**
 * Manba tiliga mos lug'at bo'limi.
 *
 * Promptga faqat BITTA bo'lim kiritiladi, hammasi emas: inglizcha kitobni
 * tarjima qilayotganda turkcha 60 ta atama har chaqiruvda bekorga token yeydi.
 * Noma'lum til uchun bo'sh — lug'atsiz tarjima lug'at bilan yiqilgan
 * tarjimadan yaxshiroq.
 */
export function glossaryFor(sourceLang: string): Record<string, string> {
  return (glossary as Glossary)[langKey(sourceLang)] ?? {};
}

function glossaryText(sourceLang: string): string {
  const entries = Object.entries(glossaryFor(sourceLang));
  if (entries.length === 0) return '';
  const lines = entries.map(([from, to]) => `- ${from} → ${to}`).join('\n');
  return `
ATAMALAR LUG'ATI — MAJBURIY
Quyidagi atamalar AYNAN shunday o'giriladi. Boshqacha tarjima — XATO.
${lines}
`;
}

/** Rim raqamli savollarning variantlari — turkcha to'plamda qat'iy naqsh. */
const ROMAN_OPTIONS = `- "Yalnız I" → "Faqat I"
- "Yalnız II" → "Faqat II"
- "Yalnız III" → "Faqat III"
- "I ve II" → "I va II"
- "I ve III" → "I va III"
- "II ve III" → "II va III"
- "I, II ve III" → "I, II va III"
- "Hepsi" → "Hammasi"
- "Hiçbiri" → "Hech biri"`;

/** Qavs ichidagi standart izohlar. */
const PARENTHETICALS = `- "(Sürtünmeler önemsizdir.)" → "(Ishqalanish hisobga olinmaydi.)"
- "(Sürtünme önemsizdir.)" → "(Ishqalanish hisobga olinmaydi.)"
- "(g = 10 m/s²)" → O'ZGARMAYDI, aynan ko'chiriladi.`;

/** Savol oxiridagi shakllar. */
const QUESTION_FORMS = `- "... kaçtır?" → "... nechaga teng?"
- "... hangileri artar?" → "... qaysilari ortadi?"
- "... hangisidir?" → "... qaysi biri?"
- "Buna göre," → "Bunga ko'ra,"
- "... kaç katıdır?" → "... necha marta katta?"
- "... arasındaki ilişki nedir?" → "... orasidagi munosabat qanday?"`;

/**
 * Bir guruh savol uchun prompt.
 *
 * Qoidalar tartibi ataylab: avval o'zgarmaydigan narsalar (rasm tokeni, son,
 * formula), keyin lug'at, oxirida savollarning o'zi — model uzun promptning
 * boshi va oxirini yaxshiroq eslaydi, savol matni esa oxirida turgani ma'qul.
 */
export function buildTranslatePrompt(group: TranslateGroup): string {
  const questions = group.items.map((item) => ({
    order: item.order,
    text: item.text,
    // `imageToken` YUBORILMAYDI: u rasm identifikatorini saqlaydi, tarjimaga
    // kerak emas, modeldan uni aynan qaytarishni talab qilish esa bajarib
    // bo'lmaydigan ish edi. Natijaga u manbadan ko'chiriladi.
    options: item.options.map((o) => ({ label: o.label, text: o.text })),
  }));

  return `Sen o'quv qo'llanmasidan olingan test savollarini TARJIMA qiluvchi
yordamchisan. Manba tili: ${group.sourceLang}. Maqsad tili: ${group.targetLang}.
Fan: ${group.subject}.

ASOSIY
- Sen faqat TARJIMA qilyapsan. Savolning mazmunini, shartini, sonlarini va
  javob variantlarining TARTIBINI o'zgartirma.
- Savolni YECHMA, javobini aytma, tushuntirish qo'shma.
- Har savol uchun kelgan "order" ni AYNAN o'sha holda qaytar.
- Variantlar soni kirishdagidek qolsin, "label" (A, B, C, D, E) o'z joyida
  tursin — ularni tarjima qilma va joyini almashtirma.

HECH QACHON O'ZGARMAYDIGAN NARSALAR
- [[IMG1]], [[IMG2]] kabi belgilar — rasm o'rni. Ularni o'zgartirma, tarjima
  qilma, yangisini yaratma. Soni va tartibi saqlansin.
- SONLAR. Hech bir sonni o'zgartirma, yaxlitlama, birlikka moslashtirma:
  "4 metre" → "4 metr" (4 o'zgarmaydi), "0,6" → "0,6".
- Birliklar: N, m, s, kg, °, m/s², J, W.
- O'zgaruvchi nomlari: F, N₁, T_K, G, P, a, b, c, x, y.

FORMULALAR
- $...$ ichidagi HAMMA NARSA belgi-baboshi ko'chiriladi. Ichidagi so'zni ham
  tarjima qilma.
- Matnda $ siz turgan matematik ifodalar bo'lishi mumkin: G_X, T_K, a_1 < a_2,
  \\frac{G_Y}{G_X}. Bularni $...$ ichiga ol va "issues" ga "LATEX_WRAPPED"
  qo'sh.
- Ifodani ISHONCH bilan tiklab bo'lmasa — matnni o'z holicha qoldir va
  "issues" ga "LATEX_UNCERTAIN" qo'sh. TAXMIN QILMA, o'ylab topma.

VARIANTLAR
- Variant faqat SON yoki FORMULA bo'lsa — aynan ko'chiriladi, tarjima
  qilinmaydi. Masalan: "2", "3", "$\\sqrt{3}$", "$\\frac{1}{2}$",
  "$a > b > c$", "$+x$", "$F_1$".

RIM RAQAMLI SAVOLLAR
- "I. $N_1$ / II. $N_2$ / III. $\\tau$" ko'rinishi saqlanadi.
- Variantlar QAT'IY shunday tarjima qilinadi:
${ROMAN_OPTIONS}

QAVS ICHIDAGI STANDART IZOHLAR
${PARENTHETICALS}

SAVOL OXIRIDAGI SHAKL
${QUESTION_FORMS}
${glossaryText(group.sourceLang)}
"issues" — muammo kodlari massivi, muammo bo'lmasa bo'sh. "confidence" — 0 dan
1 gacha: manba matni sifatsiz yoki ma'nosi noaniq bo'lsa pasaytir.

TARJIMA QILINADIGAN SAVOLLAR (JSON):
${JSON.stringify(questions, null, 2)}`;
}
