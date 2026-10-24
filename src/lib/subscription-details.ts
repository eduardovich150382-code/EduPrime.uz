import { db } from './db';
import type { SubscriptionEntitlement, UserEntitlements } from './entitlements';
import type { SubscriptionDuration, TestType } from '@prisma/client';

export interface LocalizedName { nameUz: string; nameRu: string; nameEn: string }
export interface SubscriptionDetails extends SubscriptionEntitlement {
  id: string;
  userId: string;
  productId: string | null;
  duration: SubscriptionDuration;
  startDate: Date;
  goal: TestType | null;
  product: LocalizedName | null;
  subjects: LocalizedName[];
}
export interface DetailedEntitlements extends UserEntitlements { subscriptions: SubscriptionDetails[] }

// Prisma relation include bir nechta SQL yuboradi. Pricing uchun nomlarni
// ham bitta SELECT'da olamiz; bu yo'l ruxsatlarni qaytadan yuklamaydi.
export async function loadSubscriptionDetails(userId: string, now: Date): Promise<DetailedEntitlements> {
  return { now, permissions: [], subscriptions: await loadSubscriptionRows([userId], now) };
}

// Timeline kelajakdagi uzaytirish va hali cron yopmagan eski qatorlarni ham
// oladi. Ular ko'rsatish uchun filtrlanadi, kirish huquqi sifatida ishlatilmaydi.
export async function loadSubscriptionRows(userIds: string[] | null, now: Date, timeline = false): Promise<SubscriptionDetails[]> {
  const subscriptions = await db.$queryRaw<SubscriptionDetails[]>`
    SELECT s."id", s."userId", s."productId", s."plan", s."duration", s."startDate",
      s."categoryId", s."subjectIds", s."isActive", s."endDate", c."type" AS goal, p."subjectRule",
      CASE WHEN p."id" IS NULL THEN NULL ELSE json_build_object(
        'nameUz', p."nameUz", 'nameRu', p."nameRu", 'nameEn', p."nameEn") END AS product,
      COALESCE((SELECT json_agg(json_build_object(
        'nameUz', subject."nameUz", 'nameRu', subject."nameRu", 'nameEn', subject."nameEn")
        ORDER BY subject."order", subject."id") FROM "Subject" subject
        WHERE subject."id" = ANY(s."subjectIds")), '[]'::json) AS subjects
    FROM "Subscription" s LEFT JOIN "Product" p ON p."id" = s."productId"
      LEFT JOIN "TestCategory" c ON c."id" = s."categoryId"
    WHERE (${userIds}::text[] IS NULL OR s."userId" = ANY(${userIds}::text[])) AND s."isActive" = true
      AND (${timeline} OR (s."startDate" <= ${now} AND s."endDate" >= ${now}))
    ORDER BY s."endDate", s."id"
  `;
  return subscriptions;
}
