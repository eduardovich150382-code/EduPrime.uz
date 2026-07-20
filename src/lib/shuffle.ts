/**
 * Seeded random shuffle utility for test questions and options.
 * Uses a deterministic PRNG so the same seed produces the same shuffle.
 * This ensures the shuffle is consistent for a given user+test combination.
 */

/**
 * Simple seeded pseudo-random number generator (mulberry32).
 */
function seededRandom(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate a numeric seed from a string (user ID + test ID).
 */
export function generateSeed(userId: string, testId: string): number {
  const str = userId + testId;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Shuffle an array in-place using Fisher-Yates with a seeded PRNG.
 * Returns the shuffled array (same reference).
 */
export function shuffleArray<T>(array: T[], seed: number): T[] {
  const random = seededRandom(seed);
  const result = [...array]; // Don't mutate original

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

/**
 * Shuffle questions order for a test.
 * Options within each question are also shuffled, but A,B,C,D labels remain fixed.
 * Only the option TEXT/IMAGE content moves — labels stay in order.
 */
export function shuffleTest(
  questions: any[],
  userId: string,
  testId: string
): any[] {
  const baseSeed = generateSeed(userId, testId);

  // Shuffle question order
  const shuffledQuestions = shuffleArray(questions, baseSeed);

  // Shuffle options within each question (only for MULTIPLE_CHOICE)
  return shuffledQuestions.map((question, index) => {
    if (question.type === 'OPEN_ENDED' || !question.options || !Array.isArray(question.options)) {
      return question;
    }

    // Use a different seed for each question's options
    const optionSeed = baseSeed + index + 1;
    const shuffledOptions = shuffleArray(question.options, optionSeed);

    // Keep A,B,C,D labels in original order — only swap content
    const labels = ['A', 'B', 'C', 'D', 'E'];
    const relabeledOptions = shuffledOptions.map((opt: any, i: number) => ({
      ...opt,
      label: labels[i], // Always A,B,C,D,E in order
    }));

    return {
      ...question,
      options: relabeledOptions,
    };
  });
}

/**
 * Get the original answer label from a shuffled answer.
 * When user selects "A" on a shuffled test, this returns what the original label was.
 * 
 * Example: if original options were [A,B,C,D] and shuffled to [C,A,D,B],
 * then shuffled position "A" (index 0) = original "C".
 * So if user picks "A", the real answer is "C".
 */
export function unshuffleAnswer(
  questionId: string,
  shuffledAnswer: string,
  originalOptions: any[],
  userId: string,
  testId: string,
  questionShuffleIndex: number
): string {
  if (!shuffledAnswer || !originalOptions || originalOptions.length === 0) {
    return shuffledAnswer;
  }

  const labels = ['A', 'B', 'C', 'D', 'E'];
  const selectedIndex = labels.indexOf(shuffledAnswer);
  if (selectedIndex === -1) return shuffledAnswer; // Not a standard label, return as-is

  const baseSeed = generateSeed(userId, testId);
  const optionSeed = baseSeed + questionShuffleIndex + 1;

  // Re-create the same shuffle
  const shuffledOptions = shuffleArray(originalOptions, optionSeed);

  // The option at selectedIndex in shuffled array — get its original label
  if (selectedIndex < shuffledOptions.length) {
    return shuffledOptions[selectedIndex].label || shuffledAnswer;
  }

  return shuffledAnswer;
}

/**
 * Get the shuffled question order (returns array of question indices in shuffle order).
 * This is needed to know the questionShuffleIndex for unshuffleAnswer.
 */
export function getShuffledQuestionIndices(
  questions: any[],
  userId: string,
  testId: string
): number[] {
  const baseSeed = generateSeed(userId, testId);
  const indices = questions.map((_, i) => i);
  return shuffleArray(indices, baseSeed);
}
