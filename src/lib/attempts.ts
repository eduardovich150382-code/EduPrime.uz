import type { Prisma } from '@prisma/client';
import { db } from './db';
import { resolveUnlockKeys } from './quota';
import type { AnswerResult } from './grading';

/**
 * `gradeSubmission` (lib/grading.ts) natijasidan Attempt (S27) yozuvlariga
 * tayyor nomzod — faqat mavjud Item'ga normallashtirilgan javoblar.
 */
export interface AttemptCandidate {
  itemId: string;
  answer: string;
  isCorrect: boolean;
  timeSpentSec: number;
}

/**
 * `answerResults[].questionId` eski `Question.id` (haqiqiy Test orqali) YOKI
 * `Item.id` (TestSession orqali) bo'lishi mumkin — `resolveUnlockKey`
 * (lib/quota.ts) dagi bilan bir xil naqsh orqali Item.id'ga normallashtiriladi.
 * `resolveUnlockKeys` legacyQuestionId topilmasa kirish id'sini o'zgarishsiz
 * qaytaradi — bu ID haqiqiy Item.id ekanligiga KAFOLAT EMAS (masalan hali
 * Item'ga ko'chirilmagan Question), shuning uchun mavjudligi bu yerda
 * alohida tekshiriladi. Topilmagan javob chiqarib tashlanadi — yetim
 * Attempt qatori qolmasligi uchun.
 *
 * FAQAT baholanadigan topshiriqlar (test/sessiya submit) chaqirishi kerak —
 * MASHQ javoblari (`/practice/check`, video nazorat nuqtalari) HECH QACHON
 * emas: mashqda qayta-qayta urinish mumkin va javob darhol ko'rsatiladi, bu
 * savol sifati statistikasini (pValue/discrimination) buzadi.
 */
export async function resolveAttemptCandidates(answerResults: AnswerResult[]): Promise<AttemptCandidate[]> {
  const rawIds = [...new Set(answerResults.map((r) => r.questionId))];
  if (rawIds.length === 0) return [];

  const resolved = await resolveUnlockKeys(rawIds);
  const candidateIds = [...new Set(rawIds.map((id) => resolved.get(id) ?? id))];

  const existingItems = await db.item.findMany({
    where: { id: { in: candidateIds } },
    select: { id: true },
  });
  const existingIds = new Set(existingItems.map((it) => it.id));

  const candidates: AttemptCandidate[] = [];
  for (const r of answerResults) {
    const itemId = resolved.get(r.questionId) ?? r.questionId;
    if (!existingIds.has(itemId)) continue;
    candidates.push({ itemId, answer: r.answer, isCorrect: r.isCorrect, timeSpentSec: r.timeSpent });
  }
  return candidates;
}

export interface AttemptWriteContext {
  userId: string;
  /** Faqat TestSession orqali topshirilgan natijada — Test orqali topshirilganda `null`. */
  sessionId?: string | null;
  testResultId: string;
}

/**
 * `resolveAttemptCandidates` natijasini `db.attempt.createMany`ga tayyor
 * shaklga o'giradi. Chaqiruvchi buni baholash bilan BITTA tranzaksiya
 * ichida, `TestResult.create` natijasidagi `id` ma'lum bo'lgandan keyin
 * chaqiradi (`testResultId` — @default(cuid()) qiymati oldindan ma'lum
 * emas, shuning uchun avval TestResult yaratiladi).
 */
export function toAttemptCreateInput(
  candidates: AttemptCandidate[],
  ctx: AttemptWriteContext
): Prisma.AttemptCreateManyInput[] {
  return candidates.map((c) => ({
    userId: ctx.userId,
    itemId: c.itemId,
    sessionId: ctx.sessionId ?? null,
    testResultId: ctx.testResultId,
    answer: c.answer,
    isCorrect: c.isCorrect,
    timeSpentSec: c.timeSpentSec,
  }));
}
