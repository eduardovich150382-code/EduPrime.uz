import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIImportResult, QuestionOption } from '@/types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const IMPORT_PROMPT = `Sen test savollarini tahlil qiluvchi AI assistantsan. 

Berilgan matndan/fayldan test savollarini ajratib ol va quyidagi JSON formatda qaytar:

{
  "questions": [
    {
      "text": "Savol matni (LaTeX formatda, formulalar $...$ ichida)",
      "type": "MULTIPLE_CHOICE",
      "options": [
        {"label": "A", "text": "Variant matni (LaTeX)", "image": null},
        {"label": "B", "text": "Variant matni", "image": null},
        {"label": "C", "text": "Variant matni", "image": null},
        {"label": "D", "text": "Variant matni", "image": null}
      ],
      "correctAnswer": "A",
      "explanation": "Yechim (LaTeX formatda, ixtiyoriy)",
      "confidence": 0.95
    },
    {
      "text": "$2^{10}$ ning qiymati qancha?",
      "type": "OPEN_ENDED",
      "options": [],
      "correctAnswer": "1024",
      "explanation": "$2^{10} = 1024$",
      "confidence": 0.99
    }
  ],
  "totalFound": 2,
  "warnings": []
}

QOIDALAR:
1. Formulalarni LaTeX formatga o'gir: $\\frac{a}{b}$, $\\sqrt{x}$, $x^2$ kabi
2. Agar 5 ta variant (A-E) bo'lsa, E variantini ham qo'sh
3. Agar 4 ta variant bo'lsa, faqat A-D qo'sh
4. To'g'ri javobni aniqlashga harakat qil
5. Agar to'g'ri javob noma'lum bo'lsa, "correctAnswer": "" qo'y
6. confidence — sen qanchalik ishonchli ekanligingni ko'rsat (0-1)
7. Agar matn sifati past yoki tushunarsiz bo'lsa, warnings ga yoz
8. FAQAT JSON format qaytar, boshqa hech narsa yozma
9. "type" maydoni: "MULTIPLE_CHOICE" (variantli savol) yoki "OPEN_ENDED" (ochiq savol)
10. Agar savolda variantlar bo'lmasa va javob son, formula natijasi yoki qisqa matn bo'lsa — bu OPEN_ENDED savol. options bo'sh massiv [], correctAnswer esa to'g'ri javob matni bo'lsin
11. SAT, milliy sertifikat kabi testlarda ochiq savollar ko'p uchraydi (masalan: "Javobni kiriting", "Natijani yozing")
12. Agar savolda A), B), C), D) variantlar berilgan bo'lsa — bu MULTIPLE_CHOICE`;

/**
 * Matndan testlarni AI yordamida import qilish
 */
export async function importTestFromText(text: string): Promise<AIImportResult> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

    const result = await model.generateContent([
      IMPORT_PROMPT,
      `\n\nQuyidagi matndan testlarni ajratib ber:\n\n${text}`,
    ]);

    const response = result.response.text();
    
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        questions: [],
        totalFound: 0,
        warnings: ['AI javobini parse qilib bo\'lmadi'],
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed as AIImportResult;
  } catch (error) {
    console.error('Gemini AI error:', error);
    return {
      questions: [],
      totalFound: 0,
      warnings: [`AI xatolik: ${error instanceof Error ? error.message : 'Noma\'lum xatolik'}`],
    };
  }
}

/**
 * Rasmdan testlarni AI yordamida import qilish (OCR + tahlil)
 */
export async function importTestFromImage(imageBase64: string, mimeType: string): Promise<AIImportResult> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

    const result = await model.generateContent([
      IMPORT_PROMPT,
      '\n\nQuyidagi rasmdagi test savollarini ajratib ber:',
      {
        inlineData: {
          data: imageBase64,
          mimeType: mimeType,
        },
      },
    ]);

    const response = result.response.text();
    
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        questions: [],
        totalFound: 0,
        warnings: ['Rasmdan savollarni ajratib bo\'lmadi'],
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed as AIImportResult;
  } catch (error) {
    console.error('Gemini Vision error:', error);
    return {
      questions: [],
      totalFound: 0,
      warnings: [`AI Vision xatolik: ${error instanceof Error ? error.message : 'Noma\'lum xatolik'}`],
    };
  }
}

/**
 * PDF/DOCX fayldan matnni o'qib test import qilish
 */
export async function importTestFromFile(fileUrl: string, fileName: string): Promise<AIImportResult> {
  try {
    // Fetch file content
    const response = await fetch(fileUrl);
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    // Determine MIME type
    const ext = fileName.split('.').pop()?.toLowerCase();
    let mimeType = 'application/octet-stream';
    if (ext === 'pdf') mimeType = 'application/pdf';
    else if (ext === 'png') mimeType = 'image/png';
    else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
    else if (ext === 'txt') mimeType = 'text/plain';

    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

    const result = await model.generateContent([
      IMPORT_PROMPT,
      `\n\nQuyidagi fayldan (${fileName}) test savollarini ajratib ber:`,
      {
        inlineData: {
          data: base64,
          mimeType,
        },
      },
    ]);

    const responseText = result.response.text();
    
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        questions: [],
        totalFound: 0,
        warnings: ['Fayldan savollarni ajratib bo\'lmadi'],
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed as AIImportResult;
  } catch (error) {
    console.error('File import error:', error);
    return {
      questions: [],
      totalFound: 0,
      warnings: [`Fayl import xatolik: ${error instanceof Error ? error.message : 'Noma\'lum xatolik'}`],
    };
  }
}

export interface SuggestMetadataParams {
  text: string;
  correctAnswer: string;
  type: string;
  existingOptionTexts: string[];
}

export interface SuggestMetadataResult {
  distractors: string[];
  topic: string;
  bloomLevel: string;
  difficulty: number | null;
}

const BLOOM_VALUES = ['BILISH', 'TUSHUNISH', 'QOLLASH', 'TAHLIL', 'BAHOLASH', 'YARATISH'];

/**
 * Bilim xaritasi — shaxsiy o'sish rejasidagi har bir mavzu uchun qisqa
 * "nimani qayta ko'rib chiqish kerak" tavsiyasi. Jadvalning o'zi (qachon,
 * qaysi mavzu) deterministik hisoblanadi — AI faqat matn/tushuntirish
 * qismini yozadi, shu sabab bitta chaqiruvda barcha mavzular uchun tavsiya
 * so'raladi (mavzu boshiga alohida so'rov emas — tez va arzon).
 */
export async function generateGrowthPlanTips(topics: string[]): Promise<Record<string, string>> {
  if (topics.length === 0) return {};

  const prompt = `Sen talabalarga shaxsiy o'quv rejasi tuzib beradigan metodistsan. Quyidagi mavzular talaba uchun qiyin bo'lgan (test natijalariga ko'ra). Har bir mavzu uchun 1-2 gaplik, aniq va amaliy tavsiya yoz — nimani qayta ko'rib chiqish, qanday mashq qilish kerak.

Mavzular: ${topics.join(' | ')}

FAQAT quyidagi JSON formatda javob ber (boshqa hech narsa yozma):
{
  "Mavzu nomi 1": "tavsiya matni",
  "Mavzu nomi 2": "tavsiya matni"
}`;

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.5-flash',
      generationConfig: { maxOutputTokens: 800, temperature: 0.4 },
    });
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return {};

    const parsed = JSON.parse(jsonMatch[0]);
    const tips: Record<string, string> = {};
    for (const topic of topics) {
      if (typeof parsed[topic] === 'string') tips[topic] = parsed[topic].slice(0, 400);
    }
    return tips;
  } catch (error) {
    console.error('Gemini generateGrowthPlanTips error:', error);
    return {};
  }
}

/**
 * Savol matni va to'g'ri javobga asoslanib, o'qituvchiga noto'g'ri variant
 * (distraktor) va mavzu/Bloom darajasi taklif qiladi. Aniq, ishonchli formatga
 * majburlash uchun natija qat'iy JSON sifatida so'raladi; parslanmasa bo'sh
 * natija qaytadi — chaqiruvchi buni "hech narsa taklif qilinmadi" deb talqin qiladi.
 */
export async function suggestQuestionMetadata(params: SuggestMetadataParams): Promise<SuggestMetadataResult> {
  const needsDistractors = params.type === 'MULTIPLE_CHOICE' || params.type === 'MULTI_SELECT';

  const prompt = `Sen tajribali test tuzuvchi metodistsan. Quyidagi savolni tahlil qil:

Savol: ${params.text}
To'g'ri javob: ${params.correctAnswer}
${params.existingOptionTexts.length > 0 ? `Mavjud variantlar: ${params.existingOptionTexts.join(' | ')}` : ''}

Vazifa — quyidagi JSON formatda javob ber (FAQAT JSON, boshqa hech narsa yozma):
{
  "distractors": [${needsDistractors ? '"noto\'g\'ri variant 1", "noto\'g\'ri variant 2", "noto\'g\'ri variant 3"' : ''}],
  "topic": "qisqa mavzu tegi (2-4 so'z, masalan: Kvadrat tenglama)",
  "bloomLevel": "BILISH yoki TUSHUNISH yoki QOLLASH yoki TAHLIL yoki BAHOLASH yoki YARATISH",
  "difficulty": "1 dan 5 gacha butun son — 1 juda oson, 5 juda qiyin"
}

QOIDALAR:
1. Distraktorlar ishonchli, mavzuga oid, lekin aniq noto'g'ri bo'lishi kerak (tasodifiy yoki bema'ni emas).
2. Distraktorlar mavjud variantlarni takrorlamasin.
3. Formulalar LaTeX formatda ($...$) bo'lsin.
4. ${needsDistractors ? '' : 'Bu savol turi uchun distractors bo\'sh massiv [] bo\'lsin.'}
5. topic, bloomLevel va difficulty har doim to'ldirilishi kerak.
6. difficulty savolning haqiqiy murakkabligini baholasin: bir bosqichli hisob/eslab qolish = 1-2, ko'p bosqichli fikrlash yoki chuqur tahlil = 4-5.`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { distractors: [], topic: '', bloomLevel: '', difficulty: null };

    const parsed = JSON.parse(jsonMatch[0]);
    const difficultyNum = Number(parsed.difficulty);
    return {
      distractors: Array.isArray(parsed.distractors) ? parsed.distractors.filter((d: unknown) => typeof d === 'string').slice(0, 4) : [],
      topic: typeof parsed.topic === 'string' ? parsed.topic.slice(0, 100) : '',
      bloomLevel: BLOOM_VALUES.includes(parsed.bloomLevel) ? parsed.bloomLevel : '',
      difficulty: Number.isInteger(difficultyNum) && difficultyNum >= 1 && difficultyNum <= 5 ? difficultyNum : null,
    };
  } catch (error) {
    console.error('Gemini suggestQuestionMetadata error:', error);
    return { distractors: [], topic: '', bloomLevel: '', difficulty: null };
  }
}

/**
 * Ochiq savol uchun aniq (case-insensitive) moslik topilmaganda ishlatiladigan
 * zaxira tekshiruv: talaba javobi to'g'ri javobga MA'NO jihatdan teng-mi
 * (masalan, "3.14" va "3,14", yoki "1/2" va "0.5"), faqat format farqi bo'lsa.
 * Har qanday shubha bo'lsa FALSE qaytarishga qat'iy yo'naltirilgan — bu
 * ballarga ta'sir qilgani uchun xato-musbat (false positive) dan qochish
 * xato-manfiy (false negative, ya'ni aniq moslik yo'q holatda default)dan
 * ancha xavfliroq.
 */
export async function checkOpenEndedEquivalence(
  questionText: string,
  correctAnswer: string,
  userAnswer: string
): Promise<boolean> {
  if (!userAnswer.trim()) return false;

  const prompt = `Sen qat'iy test tekshiruvchisan. Faqat FORMAT farqi bo'lgan javoblarni teng deb hisoblaysan (masalan: "3.14" va "3,14", "1/2" va "0.5", ortiqcha probel, katta-kichik harf). MA'NOSI yoki QIYMATI boshqacha bo'lsa — teng emas. Shubha bo'lsa FALSE javob ber.

Savol: ${questionText}
To'g'ri javob: ${correctAnswer}
Talaba javobi: ${userAnswer}

Talaba javobi to'g'ri javobga TENGmi? Faqat bitta so'z bilan javob ber: TRUE yoki FALSE.`;

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.5-flash',
      generationConfig: { maxOutputTokens: 10, temperature: 0 },
    });
    const result = await model.generateContent(prompt);
    const response = result.response.text().trim().toUpperCase();
    return response.startsWith('TRUE');
  } catch (error) {
    console.error('Gemini checkOpenEndedEquivalence error:', error);
    return false;
  }
}

const TUTOR_LANG_NAMES: Record<string, string> = {
  uz: "o'zbek",
  ru: 'rus',
  en: 'ingliz',
};

interface ExplainQuestionParams {
  questionText: string;
  options: { label: string; text: string }[];
  correctAnswer: string;
  existingExplanation?: string | null;
  type: string;
  lang: string;
}

/**
 * AI Tutor: given a question and its already-known correct answer, stream a
 * simple, step-by-step explanation in the student's language.
 *
 * IMPORTANT: this is intentionally "grounded" — the correct answer is passed
 * in as ground truth and the model is instructed never to re-derive or
 * contradict it. This avoids the model hallucinating a wrong answer on math/
 * physics questions, which would otherwise teach students incorrect content.
 *
 * Streams token-by-token (instead of waiting for the full response) so the
 * student sees text appear immediately rather than staring at a spinner, and
 * caps maxOutputTokens as a hard ceiling on worst-case latency/cost — the
 * prompt's own "250 so'z" instruction is only a soft guideline the model can
 * ignore.
 */
export async function* streamExplainQuestion(
  params: ExplainQuestionParams
): AsyncGenerator<string> {
  const langName = TUTOR_LANG_NAMES[params.lang] || TUTOR_LANG_NAMES.uz;

  const optionsText =
    params.type === 'OPEN_ENDED' || params.options.length === 0
      ? ''
      : `\nVariantlar:\n${params.options.map((o) => `${o.label}) ${o.text}`).join('\n')}`;

  const prompt = `Sen o'quvchilarga sodda va tushunarli tilda tushuntiradigan mehribon repetitor-o'qituvchisan.

QAT'IY QOIDA: Pastda berilgan "TO'G'RI JAVOB" har doim to'g'ri hisoblanadi. Sen uni qayta tekshirmaysan, shubha qilmaysan va boshqa variantni to'g'ri deb aytmaysan — sening yagona vazifang shu javob NEGA to'g'ri ekanini sodda, qadamma-qadam tushuntirishdir.

Savol: ${params.questionText}${optionsText}

TO'G'RI JAVOB: ${params.correctAnswer}
${params.existingExplanation ? `\nUstozning yozma yechimi (shunga asoslan, kengaytir):\n${params.existingExplanation}` : ''}

Vazifa: Yuqoridagi to'g'ri javobni ${langName} tilida, o'quvchiga tushunarli, qadamma-qadam, do'stona ohangda tushuntir. Formulalar uchun LaTeX belgilaridan foydalan ($...$ inline, $$...$$ katta formulalar uchun). Javobing 250 so'zdan oshmasin. Faqat tushuntirish matnini yoz — sarlavha, "mana javob" kabi kirish so'zlari yozma.`;

  const model = genAI.getGenerativeModel({
    model: 'gemini-3.5-flash',
    generationConfig: {
      maxOutputTokens: 600,
      temperature: 0.4,
    },
  });

  const { stream } = await model.generateContentStream(prompt);
  for await (const chunk of stream) {
    const text = chunk.text();
    if (text) yield text;
  }
}
