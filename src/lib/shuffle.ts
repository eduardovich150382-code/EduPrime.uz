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
 * Options within each question are also shuffled.
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

    return {
      ...question,
      options: shuffledOptions,
    };
  });
}
