import type { QuestionCoreFields } from '@/types';
import { fillBlankCorrectAnswer, matchingOptions } from '@/lib/question-form';

/**
 * Saqlashga ketadigan savolning shakli. Sahifaning lokal `QuestionForm` i emas,
 * strukturaviy jihatdan mos minimal tur — shu bilan `aiConfidence` kabi faqat
 * UI ga tegishli maydonlar mapper'ga kirib kelmaydi.
 */
export interface ApiQuestionInput extends QuestionCoreFields {
  id?: string;
  videoUrl: string;
  points: number;
}

// Bitta savolni API kutayotgan formatga o'giradi — qoralamani serverga
// avtosaqlash va aniq "Saqlash"/"Nashr qilish" tugmalari bir xil mapping'dan
// foydalanadi, shu sababli ikkalasi sinxronsizlanmaydi.
export function mapQuestionForApi(q: ApiQuestionInput, index: number) {
  const isFillBlank = q.type === 'FILL_BLANK';
  const isMatching = q.type === 'MATCHING';
  return {
    // `id` va `order` — serverdagi update shoxi shu ikkisiga tayanadi. `id`
    // yuborilmasa savol o'chirilib qaytadan yaratiladi (ID lar uziladi).
    id: q.id,
    order: index,
    text: q.text,
    images: q.images,
    options: isMatching ? matchingOptions(q) : (q.type === 'OPEN_ENDED' || isFillBlank) ? [] : q.options.filter((o) => o.text),
    correctAnswer: isFillBlank ? fillBlankCorrectAnswer(q) : isMatching ? '' : q.correctAnswer,
    explanation: q.explanation || null,
    explanationImages: q.explanationImages,
    videoUrl: q.videoUrl || null,
    type: q.type,
    points: q.points || 1,
    topic: q.topic || null,
    // `bloomLevel` ustoz ekranidan olib tashlangan, LEKIN saqlashda hamon
    // o'zgarishsiz ketadi: AI uni jimgina to'ldiradi va `lib/item-picker.ts`
    // dagi Bloom filtri shu ustunni o'qiydi.
    bloomLevel: q.bloomLevel || null,
    difficulty: q.difficulty || null,
  };
}
