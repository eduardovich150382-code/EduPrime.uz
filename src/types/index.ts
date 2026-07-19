// ===================== USER TYPES =====================

export type UserRole = 'USER' | 'TEACHER' | 'ADMIN';

export interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  telegramId: string | null;
  telegramUsername: string | null;
  googleId: string | null;
  role: UserRole;
  lang: string;
  createdAt: Date;
}

// ===================== TEST TYPES =====================

export type TestType = 'DTM' | 'SCHOOL' | 'ATTESTATION' | 'SAT' | 'GRE' | 'CERTIFICATE' | 'PRESIDENT_SCHOOL';
export type QuestionType = 'MULTIPLE_CHOICE' | 'OPEN_ENDED';
export type PlanType = 'FREE' | 'PREMIUM' | 'TEACHER_PLAN';

export interface TestCategory {
  id: string;
  nameUz: string;
  nameRu: string;
  nameEn: string;
  type: TestType;
  requiredPlan: PlanType;
  icon: string | null;
  description: string | null;
}

export interface Subject {
  id: string;
  nameUz: string;
  nameRu: string;
  nameEn: string;
  icon: string | null;
  categoryId: string;
}

export interface Test {
  id: string;
  titleUz: string;
  titleRu: string | null;
  titleEn: string | null;
  categoryId: string;
  subjectId: string;
  teacherId: string | null;
  price: number;
  isFree: boolean;
  duration: number;
  questionCount: number;
  format: QuestionType;
  difficulty: number;
  videoSolution: string | null;
  writtenSolution: string | null;
  isPublished: boolean;
  createdAt: Date;
}

export interface QuestionOption {
  label: string; // A, B, C, D, E
  text: string;  // LaTeX supported text
  image: string | null; // Image URL
}

export interface Question {
  id: string;
  testId: string;
  text: string; // LaTeX
  images: string[];
  options: QuestionOption[];
  correctAnswer: string;
  type: QuestionType;
  explanation: string | null;
  explanationImages: string[];
  videoUrl: string | null;
  points: number;
  order: number;
}

// ===================== RESULT TYPES =====================

export interface AnswerRecord {
  questionId: string;
  answer: string;
  isCorrect: boolean;
  timeSpent: number;
}

export interface TestResult {
  id: string;
  userId: string;
  testId: string;
  score: number;
  maxScore: number;
  percentage: number;
  answers: AnswerRecord[];
  timeSpent: number;
  completedAt: Date;
}

// ===================== SUBSCRIPTION TYPES =====================

export type SubscriptionPlan = 'PREMIUM' | 'TEACHER_PLAN';
export type SubscriptionDuration = 'ONE_MONTH' | 'THREE_MONTHS' | 'SIX_MONTHS' | 'ONE_YEAR';
export type PaymentStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED';

export interface Subscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  duration: SubscriptionDuration;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
}

export interface Payment {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  duration: SubscriptionDuration;
  amount: number;
  status: PaymentStatus;
  receiptPhoto: string | null;
  telegramMsgId: string | null;
  confirmedById: string | null;
  confirmedAt: Date | null;
  selectedSubjects: string[];
  createdAt: Date;
}

// ===================== PRICING CONSTANTS =====================

export const PRICING = {
  PREMIUM: {
    ONE_MONTH: 29000,
    THREE_MONTHS: 79000,
    SIX_MONTHS: 150000,
    ONE_YEAR: 270000,
  },
  TEACHER_PLAN: {
    ONE_MONTH: 49000,
    THREE_MONTHS: 129000,
    SIX_MONTHS: 240000,
    ONE_YEAR: 430000,
  },
} as const;

// ===================== AI IMPORT TYPES =====================

export interface AIImportedQuestion {
  text: string;
  options: QuestionOption[];
  correctAnswer: string;
  explanation?: string;
  images?: string[];
  type?: QuestionType;
  confidence: number; // 0-1 how confident AI is
}

export interface AIImportResult {
  questions: AIImportedQuestion[];
  totalFound: number;
  warnings: string[];
}
