import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIImportResult, QuestionOption } from '@/types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const IMPORT_PROMPT = `Sen test savollarini tahlil qiluvchi AI assistantsan. 

Berilgan matndan/fayldan test savollarini ajratib ol va quyidagi JSON formatda qaytar:

{
  "questions": [
    {
      "text": "Savol matni (LaTeX formatda, formulalar $...$ ichida)",
      "options": [
        {"label": "A", "text": "Variant matni (LaTeX)", "image": null},
        {"label": "B", "text": "Variant matni", "image": null},
        {"label": "C", "text": "Variant matni", "image": null},
        {"label": "D", "text": "Variant matni", "image": null}
      ],
      "correctAnswer": "A",
      "explanation": "Yechim (LaTeX formatda, ixtiyoriy)",
      "confidence": 0.95
    }
  ],
  "totalFound": 1,
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
8. FAQAT JSON format qaytar, boshqa hech narsa yozma`;

/**
 * Matndan testlarni AI yordamida import qilish
 */
export async function importTestFromText(text: string): Promise<AIImportResult> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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
