import { QuestionType } from '@prisma/client';
import { shuffleArray } from './shuffle';
import { checkOpenEndedEquivalence } from './gemini';
import { parseFillBlankAnswer, parseFillBlankCorrectAnswer, isFillBlankCorrect, isFillBlankIndexCorrect } from './fill-blank';
import {
  parseMatchingPairs, parseMatchingAnswer, shuffleMatchingIndexOrder, translateMatchingToCanonical,
  encodeMatchingAnswer, isMatchingCorrect,
} from './matching';

/**
 * `POST /api/tests/[id]/submit` va `POST /api/sessions/[id]/submit` bir xil
 * baholash mantig'iga tayanadi — ikkalasi ham shu faylni chaqiradi, kod
 * nusxalanmagan. `GradableQuestion` ikkala manbani (Question va Item)
 * qamrab oladigan minimal umumiy shakl: Item'da `points` ustuni yo'q, shu
 * sababli chaqiruvchi (sessions submit route) har bir item uchun points=1
 * bilan moslashtiradi (oddiy Test'dagi Question.points default qiymati bilan
 * bir xil).
 */
export interface GradableQuestion {
  id: string;
  text: string;
  correctAnswer: string;
  points: number;
  type: QuestionType;
  options: unknown;
}

export interface SanitizedAnswer {
  questionId: string;
  answer: string;
  timeSpent: number;
}

export interface AnswerResult {
  questionId: string;
  answer: string; // ORIGINAL (unshuffled) label yoki qiymat
  isCorrect: boolean;
  correctAnswer: string;
  timeSpent: number;
}

export interface GradingResult {
  answerResults: AnswerResult[];
  score: number;
  maxScore: number;
  percentage: number;
}

/**
 * `questions` chaqiruvchi bergan (DB) tartibda bo'lishi kerak — `baseSeed`
 * va `preserveOrder` esa savol/GET marshrutida ishlatilgan XUDDI SHU
 * qiymatlar bilan kelishi shart, aks holda unshuffle noto'g'ri pozitsiyaga
 * to'g'ri kelib, baholash jimgina buziladi (CLAUDE.md — "Nozik joylar").
 */
export async function gradeSubmission(params: {
  questions: GradableQuestion[];
  answers: SanitizedAnswer[];
  baseSeed: number;
  preserveOrder: boolean;
}): Promise<GradingResult> {
  const { questions, answers, baseSeed, preserveOrder } = params;

  const shuffledQuestions = preserveOrder ? questions : shuffleArray(questions, baseSeed);
  const shuffleIndexMap: Record<string, number> = {};
  shuffledQuestions.forEach((q, index) => {
    shuffleIndexMap[q.id] = index;
  });

  let maxScore = 0;
  const labels = ['A', 'B', 'C', 'D', 'E'];

  const answerResults: AnswerResult[] = questions.map((question) => {
    maxScore += question.points;
    const userAnswer = answers.find((a) => a.questionId === question.id);
    const userAnswerValue = userAnswer?.answer || '';

    let isCorrect = false;
    let originalAnswerLabel = userAnswerValue; // Will be converted to original label

    if (question.type === 'OPEN_ENDED') {
      // For open-ended: case-insensitive comparison (no shuffle involved)
      isCorrect = userAnswerValue.trim().toLowerCase() === (question.correctAnswer || '').trim().toLowerCase();
      originalAnswerLabel = userAnswerValue;
    } else if (question.type === 'FILL_BLANK') {
      // Bo'shliqlar JSON string[] sifatida yuboriladi (no shuffle involved,
      // options bo'sh) — har bir bo'shliq alohida taqqoslanadi, hammasi
      // to'g'ri bo'lgandagina savol to'g'ri hisoblanadi.
      const userBlanks = parseFillBlankAnswer(userAnswerValue);
      const acceptedPerBlank = parseFillBlankCorrectAnswer(question.correctAnswer);
      isCorrect = isFillBlankCorrect(userBlanks, acceptedPerBlank);
      originalAnswerLabel = userAnswerValue;
    } else if (question.type === 'MATCHING') {
      // Talaba har bir chap qator uchun (aralashtirilgan) o'ng ustundan
      // tanlagan pozitsiyani JSON son massivi sifatida yuboradi — GET
      // paytida ishlatilgan xuddi shu formula bilan indexOrder qayta
      // hisoblanadi, tanlangan pozitsiya canonical (asl) indeksga
      // tarjima qilinadi va SHU holatda saqlanadi — natija sahifasi
      // hech qanday shuffle qayta hisoblamasdan to'g'ridan-to'g'ri
      // solishtira oladi (MC/MULTI_SELECT bilan bir xil yondashuv).
      if (userAnswerValue.trim()) {
        const pairs = parseMatchingPairs(question.options);
        const shuffleIndex = shuffleIndexMap[question.id];
        const optionSeed = baseSeed + (shuffleIndex ?? 0) + 1;
        const indexOrder = shuffleMatchingIndexOrder(pairs.left.length, optionSeed);
        const shuffledMatches = parseMatchingAnswer(userAnswerValue);
        const canonicalMatches = translateMatchingToCanonical(shuffledMatches, indexOrder);
        isCorrect = shuffleIndex !== undefined && isMatchingCorrect(canonicalMatches, pairs.left.length);
        originalAnswerLabel = encodeMatchingAnswer(canonicalMatches);
      } else {
        originalAnswerLabel = '';
      }
    } else if (question.type === 'MULTI_SELECT') {
      // Multiple correct labels, comma-separated (e.g. "A,C") — unshuffle
      // each selected label independently, then compare as sets so order
      // and shuffle position never matter, only which options were chosen.
      const options = question.options as any[];
      const shuffleIndex = shuffleIndexMap[question.id];
      const selectedLabels = userAnswerValue.split(',').filter(Boolean);

      let originalLabels: string[];
      if (shuffleIndex !== undefined && options && options.length > 0) {
        const optionSeed = baseSeed + shuffleIndex + 1;
        const shuffledOptions = shuffleArray(options, optionSeed);
        originalLabels = selectedLabels
          .map((label) => {
            const idx = labels.indexOf(label);
            return idx >= 0 && idx < shuffledOptions.length ? shuffledOptions[idx].label : label;
          });
      } else {
        originalLabels = selectedLabels;
      }

      originalAnswerLabel = originalLabels.slice().sort().join(',');
      const correctSet = new Set((question.correctAnswer || '').split(',').filter(Boolean));
      const selectedSet = new Set(originalLabels);
      isCorrect = correctSet.size > 0
        && correctSet.size === selectedSet.size
        && [...correctSet].every((label) => selectedSet.has(label));
    } else {
      // For multiple choice / true-false: unshuffle the user's answer back to original label
      const options = question.options as any[];
      const shuffleIndex = shuffleIndexMap[question.id];

      if (shuffleIndex !== undefined && options && options.length > 0) {
        // Recreate the same option shuffle
        const optionSeed = baseSeed + shuffleIndex + 1;
        const shuffledOptions = shuffleArray(options, optionSeed);

        // User selected label (e.g., "A") -> find which original option was at that position
        const selectedLabelIndex = labels.indexOf(userAnswerValue);

        if (selectedLabelIndex >= 0 && selectedLabelIndex < shuffledOptions.length) {
          // The original label of the option that ended up at selectedLabelIndex
          originalAnswerLabel = shuffledOptions[selectedLabelIndex].label;
          isCorrect = originalAnswerLabel === question.correctAnswer;
        } else {
          // Fallback: direct comparison
          isCorrect = userAnswerValue === question.correctAnswer;
        }
      } else {
        // No shuffle info — direct comparison
        isCorrect = userAnswerValue === question.correctAnswer;
      }
    }

    return {
      questionId: question.id,
      answer: originalAnswerLabel, // Store ORIGINAL label (not shuffled)
      isCorrect,
      correctAnswer: question.correctAnswer,
      timeSpent: userAnswer?.timeSpent || 0,
    };
  });

  // Ochiq savollar uchun AI orqali ekvivalentlik zaxira tekshiruvi — faqat
  // aniq (case-insensitive) moslik topilmagan holatlarda ishga tushadi, shu
  // sababli tez/bepul aniq solishtirish hamon birinchi va asosiy yo'l
  // bo'lib qoladi. AI xatolik bersa yoki vaqt yetishmasa, mavjud (noto'g'ri)
  // natija o'zgarishsiz qoladi — ballarga hech qachon salbiy ta'sir qilmaydi.
  const MAX_AI_CHECKS = 20;
  let aiChecksUsed = 0;
  await Promise.all(
    questions.map(async (question, idx) => {
      if (question.type !== 'OPEN_ENDED' && question.type !== 'FILL_BLANK') return;
      const r = answerResults[idx];
      if (r.isCorrect || !r.answer.trim()) return;
      if (aiChecksUsed >= MAX_AI_CHECKS) return;
      aiChecksUsed++;
      try {
        if (question.type === 'OPEN_ENDED') {
          const equivalent = await checkOpenEndedEquivalence(question.text, question.correctAnswer, r.answer);
          if (equivalent) answerResults[idx] = { ...answerResults[idx], isCorrect: true };
          return;
        }

        // FILL_BLANK: har bir mos kelmagan bo'shliqni alohida AI orqali
        // tekshiradi (imlo/sinonim farqi uchun) — max 6 bo'shliq, aks holda
        // ortiqcha AI so'rovlariga olib kelishi mumkin.
        const userBlanks = parseFillBlankAnswer(r.answer);
        const acceptedPerBlank = parseFillBlankCorrectAnswer(question.correctAnswer).slice(0, 6);
        if (acceptedPerBlank.length === 0) return;
        const blankResults = await Promise.all(
          acceptedPerBlank.map(async (accepted, i) => {
            if (isFillBlankIndexCorrect(userBlanks, acceptedPerBlank, i)) return true;
            const userVal = (userBlanks[i] || '').trim();
            if (!userVal || !accepted.length) return false;
            try {
              return await checkOpenEndedEquivalence(`${question.text} (bo'shliq ${i + 1})`, accepted[0], userVal);
            } catch {
              return false;
            }
          })
        );
        if (blankResults.every(Boolean)) answerResults[idx] = { ...answerResults[idx], isCorrect: true };
      } catch {
        // Keep exact-match result on failure
      }
    })
  );

  let score = 0;
  questions.forEach((question, idx) => {
    if (answerResults[idx].isCorrect) score += question.points;
  });

  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  // `points` 3.1/2.1/1.1 kabi qiymatlar ikkilik kasrda ANIQ ifodalanmaydi —
  // ko'p marta qo'shilgach (masalan DTM Online 90 savol) natija
  // 188.99999999999997 kabi chiqadi. Yaxlitlash faqat YAKUNDA (har
  // qo'shishda emas) — aks holda oraliq xatolar to'planib boshqa noto'g'ri
  // natijaga olib kelishi mumkin.
  return {
    answerResults,
    score: Math.round(score * 10) / 10,
    maxScore: Math.round(maxScore * 10) / 10,
    percentage,
  };
}
