import type { AIImportedQuestion, QuestionCoreFields } from '@/types';
import { DEFAULT_OPTION_LABELS } from './option-labels';

/**
 * Import natijasini savol muharriri kutadigan shaklga o'giradi.
 *
 * Bu mapping ilgari IKKI marta yozilgan edi (test yaratish va savollar
 * bazasi sahifalarida, deyarli aynan). "Qo'shish / almashtirish" tanlovi
 * qo'shilganda uchinchi nusxa tug'ilmasligi uchun shu yerga olingan.
 *
 * Sahifaga xos maydonlar (`points`, `videoUrl`) bu yerda YO'Q — har sahifa
 * ularni o'zi qo'shadi.
 */
export interface ImportedCore extends QuestionCoreFields {
  /** Faqat import orqali kelgan savollarda — sahifada "tekshiring" belgisini boshqaradi. */
  aiConfidence: number;
}

export function toImportedCore(q: AIImportedQuestion): ImportedCore {
  const isOpenEnded = q.type === 'OPEN_ENDED';
  return {
    text: q.text || '',
    images: q.images || [],
    // Variantsiz kelgan variantli savol bo'sh qolmasin — ustoz to'ldirsin.
    options: isOpenEnded
      ? []
      : q.options?.length
        ? q.options
        : DEFAULT_OPTION_LABELS.map((label) => ({ label, text: '', image: null })),
    correctAnswer: q.correctAnswer || '',
    explanation: q.explanation || '',
    explanationImages: [],
    type: isOpenEnded ? 'OPEN_ENDED' : 'MULTIPLE_CHOICE',
    topic: q.topic || '',
    bloomLevel: q.bloomLevel || '',
    difficulty: q.difficulty ?? null,
    blankAnswers: [''],
    matchingPairs: [
      { left: '', right: '' },
      { left: '', right: '' },
    ],
    aiConfidence: q.confidence,
  };
}
