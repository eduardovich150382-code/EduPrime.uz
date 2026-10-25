import type { QuestionCoreFields, QuestionOption, QuestionType } from '@/types';
import { parseFillBlankCorrectAnswer } from '@/lib/fill-blank';
import { parseMatchingPairs, type MatchingPairs } from '@/lib/matching';

export interface BankQuestionChoice {
  id: string;
  text: string;
  type: QuestionType;
  images?: string[];
  options: QuestionOption[] | MatchingPairs | null;
  correctAnswer: string;
  explanation?: string | null;
  explanationImages?: string[];
  topic?: string | null;
  bloomLevel?: string | null;
  difficulty?: number | null;
}

export interface BankQuestionDraft extends QuestionCoreFields { points: number; videoUrl: string }

/** Bank ID'si test savolining ID'si emas: har nusxaga server yangi ID beradi. */
export function bankQuestionsToDrafts(questions: BankQuestionChoice[], defaultOptions: QuestionOption[]): BankQuestionDraft[] {
  return questions.map((question) => {
    const fillBlank = question.type === 'FILL_BLANK';
    const matching = question.type === 'MATCHING';
    const pairs = matching ? parseMatchingPairs(question.options) : null;
    const options = !fillBlank && !matching && question.type !== 'OPEN_ENDED' &&
      Array.isArray(question.options) && question.options.length ? question.options : defaultOptions;
    return {
      text: question.text || '', images: [...(question.images ?? [])],
      options: options.map((option) => ({ ...option })),
      correctAnswer: fillBlank || matching ? '' : question.correctAnswer || '',
      explanation: question.explanation || '', explanationImages: [...(question.explanationImages ?? [])],
      videoUrl: '', points: 1, type: question.type || 'MULTIPLE_CHOICE',
      topic: question.topic || '', bloomLevel: question.bloomLevel || '', difficulty: question.difficulty ?? null,
      blankAnswers: fillBlank ? parseFillBlankCorrectAnswer(question.correctAnswer).map((accepted) => accepted.join(', ')) : [''],
      matchingPairs: pairs && pairs.left.length >= 2
        ? pairs.left.map((left, i) => ({ left, right: pairs.right[i] }))
        : [{ left: '', right: '' }, { left: '', right: '' }],
    };
  });
}
